import { BlockVerifier } from "./BlockVerifier";
import { packCellFlags, VerificationLevels } from "./VerificationLevels";
import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel";
import { BlockVerificationLevelPerformanceRender } from "../Render/PerformanceRender/BlockVerificationLevelPerformanceRender";
import { BlockModelLookup } from "../Render/BlockModelLookup";
import { system, TicksPerSecond } from "@minecraft/server";
import { Vector } from "../../lib/Vector";
import { SkippedChunkTracker } from "./SkippedChunkTracker";
import { BlockBudget } from "./BlockBudget";

const MIN_TRACK_PLAYER_DISTANCE = 0;
const MAX_TRACK_PLAYER_DISTANCE = 7;
const MIN_LIFETIME = 8;
const DEFAULT_BLOCKS_PER_TICK = 10;
const CHUNK_SIZE = 16;
const CHUNK_MASK = CHUNK_SIZE - 1;
const CHUNK_SHIFT = 4;
const CHUNK_KEY_STRIDE = 4194304;
const ORIGIN = Object.freeze({ x: 0, y: 0, z: 0 });

export class StructureVerifier {
    instance;
    particleLifetime;
    blocksPerTick;

    locationsToVerify;
    blockVerificationLevels;
    isLocationPopulationComplete;
    isVerificationComplete;
    shouldStartNextVerification;
    lastCompleteVerificationLevels;

    #runner;
    #verifyRunner;
    #verification;
    #resolveVerification;
    #populateJob = {};
    #origin;
    #skippedChunks;
    #blockBudget = new BlockBudget();

    constructor(instance, { isEnabled = false, trackPlayerDistance = 0, particleLifetime = 10, isStandalone = false, blocksPerTick = DEFAULT_BLOCKS_PER_TICK } = {}) {
        this.instance = instance;
        this.particleLifetime = Math.max(particleLifetime, MIN_LIFETIME);
        this.blocksPerTick = blocksPerTick;
        if (isStandalone) {
            this.isStandalone = isStandalone;
            this.enabled = isEnabled;
            this.trackPlayerDistance = trackPlayerDistance;
        } else {
            this.instance.options.setVerifierEnabled(isEnabled);
            this.instance.options.setVerifierDistance(trackPlayerDistance);
        }
        this.locationsToVerify = new Set();
    }

    startContinuousVerification() {
        this.shouldStartNextVerification = true;
        this.#runner = system.runInterval(() => {
            if (this.shouldStartNextVerification)
                this.verifyStructure();
        });
    }

    stopContinuousVerification() {
        if (!this.#runner)
            return;
        system.clearRun(this.#runner);
        this.#runner = void 0;
    }

    refresh() {
        this.stopContinuousVerification();
        if (!this.instance.isEnabled())
            return;
        this.startContinuousVerification();
    }

    isEnabled() {
        if (this.isStandalone)
            return this.enabled;
        return this.instance.options.verifier.isEnabled;
    }

    getTrackPlayerDistance() {
        let distance;
        if (this.isStandalone)
            distance = this.trackPlayerDistance;
        else
            distance = this.instance.options.verifier.trackPlayerDistance
        return Math.min(MAX_TRACK_PLAYER_DISTANCE, Math.max(MIN_TRACK_PLAYER_DISTANCE, distance));
    }

    async verifyStructure(shouldRender = false) {
        if (!this.isEnabled())
            return;
        this.#cancelVerification();
        this.initVerification();
        return new Promise((resolve) => {
            this.#resolveVerification = resolve;
            this.#startVerificationRunner(shouldRender);
        });
    }

    #startVerificationRunner(shouldRender) {
        this.#verification = this.verifyBlocks(shouldRender);
        this.#verifyRunner = system.runInterval(() => this.#verifyNextBlocks());
    }

    #verifyNextBlocks() {
        this.#blockBudget.reset(this.blocksPerTick);
        try {
            this.#verification.next();
        } catch (error) {
            this.#settleVerification(this.lastCompleteVerificationLevels);
            throw error;
        }
    }

    #cancelVerification() {
        if (!this.#verification)
            return;
        this.#settleVerification(this.lastCompleteVerificationLevels);
    }

    #completeVerification() {
        const completedVerificationLevels = this.blockVerificationLevels;
        this.blockVerificationLevels = this.lastCompleteVerificationLevels;
        this.lastCompleteVerificationLevels = completedVerificationLevels;
        this.shouldStartNextVerification = true;
        this.#settleVerification(completedVerificationLevels);
    }

    #settleVerification(verificationLevels) {
        const resolve = this.#resolveVerification;
        this.#stopVerificationRunner();
        this.#resolveVerification = void 0;
        resolve?.(verificationLevels);
    }

    #stopVerificationRunner() {
        if (this.#verifyRunner !== void 0)
            system.clearRun(this.#verifyRunner);
        this.#verifyRunner = void 0;
        this.#verification = void 0;
    }

    initVerification() {
        this.shouldStartNextVerification = false;
        this.locationsToVerify.clear();
        this.blockVerificationLevels = this.#recycleVerificationLevels();
        this.isLocationPopulationComplete = false;
        this.isVerificationComplete = false;
    }

    #recycleVerificationLevels() {
        const bounds = this.instance.getActiveBounds();
        if (!this.blockVerificationLevels?.matchesBounds(bounds))
            return new VerificationLevels(bounds);
        this.blockVerificationLevels.clear();
        return this.blockVerificationLevels;
    }
    
    *verifyBlocks(shouldRender) {
        const bounds = this.instance.getActiveBounds();
        this.#origin = this.instance.toGlobalCoords(ORIGIN);
        this.#skippedChunks = new SkippedChunkTracker();
        const location = new Vector();
        for (let y = bounds.min.y; y < bounds.max.y; y++) {
            this.#skippedChunks.startLayer();
            for (let z = bounds.min.z; z < bounds.max.z; z++)
                yield* this.#verifyBlockRow(location, bounds, y, z, shouldRender);
        }
        this.isVerificationComplete = true;
        this.#completeVerification();
    }

    *#verifyBlockRow(location, bounds, y, z, shouldRender) {
        for (let x = bounds.min.x; x < bounds.max.x;) {
            const spanStartX = x;
            x = this.#verifyChunkSpan(location, bounds, x, y, z, shouldRender);
            this.#blockBudget.spend(x - spanStartX);
            if (this.#blockBudget.isExhausted())
                yield void 0;
        }
    }

    #verifyChunkSpan(location, bounds, startX, y, z, shouldRender) {
        const chunkKey = this.#chunkKeyOf(startX, z);
        const endX = Math.min(this.#chunkEndX(startX), bounds.max.x);
        if (this.#skippedChunks.isSkipped(chunkKey))
            this.#skipBlocks(location, startX, endX, y, z);
        else
            this.#verifyBlocksInChunk(location, chunkKey, startX, endX, y, z, shouldRender);
        return endX;
    }

    #verifyBlocksInChunk(location, chunkKey, startX, endX, y, z, shouldRender) {
        let x = startX;
        try {
            for (; x < endX; x++)
                this.verifyBlock(location.set(x, y, z), shouldRender);
        } catch (error) {
            if (!this.#skippedChunks.trackError(error, chunkKey))
                throw error;
            this.#skipBlocks(location, x, endX, y, z);
        }
    }

    #skipBlocks(location, startX, endX, y, z) {
        for (let x = startX; x < endX; x++)
            this.blockVerificationLevels.set(location.set(x, y, z), BlockVerificationLevel.Skipped);
    }

    #chunkKeyOf(x, z) {
        const chunkX = (x + this.#origin.x) >> CHUNK_SHIFT;
        const chunkZ = (z + this.#origin.z) >> CHUNK_SHIFT;
        return chunkX * CHUNK_KEY_STRIDE + chunkZ;
    }

    #chunkEndX(x) {
        return x + CHUNK_SIZE - ((x + this.#origin.x) & CHUNK_MASK);
    }

    verifyBlock(location, shouldRender) {
        const globalLocation = this.instance.toGlobalCoords(location);
        const verificationLevel = this.getVerificationLevel(globalLocation);
        this.blockVerificationLevels.set(location, verificationLevel);
        this.blockVerificationLevels.setCellFlags(location, this.#cellFlags(location, verificationLevel));
        if (shouldRender && verificationLevel !== BlockVerificationLevel.Air) {
            const dimensionLocation = { dimension: this.instance.getDimension(), location: globalLocation };
            new BlockVerificationLevelPerformanceRender(dimensionLocation, verificationLevel, this.particleLifetime/TicksPerSecond);
        }
    }

    // What this cell offers its neighbors to hide their faces behind: the
    // sides it covers completely, and which of those it covers opaquely.
    //
    // Read off the STRUCTURE's block rather than the world's, which is what
    // keeps this cheap: the permutation is already cached and interned, and
    // its shape is resolved once per distinct permutation and remembered (see
    // BlockModelLookup.getCoverMasks). The three levels below are the ones
    // where that answer also describes what will actually be standing there -
    // Missing draws the structure's own block as the preview, Match has the
    // identical block already placed, and TypeMatch has the same block id in a
    // different state.
    //
    // NoMatch is deliberately left out. Something else entirely is placed
    // there and only the world could say what, so the cell offers nothing and
    // its neighbors keep every face.
    #cellFlags(location, verificationLevel) {
        if (verificationLevel !== BlockVerificationLevel.Missing
            && verificationLevel !== BlockVerificationLevel.Match
            && verificationLevel !== BlockVerificationLevel.TypeMatch)
            return 0;
        const structBlock = this.instance.getBlock(location);
        if (structBlock === void 0)
            return 0;
        return packCellFlags(BlockModelLookup.getCoverMasks(structBlock));
    }

    getVerificationLevel(globalLocation) {
        const dimension = this.instance.getDimension();
        const worldBlock = dimension?.getBlock(globalLocation);
        if (!worldBlock)
            return BlockVerificationLevel.Skipped;
        const blockVerifier = new BlockVerifier(worldBlock, this.instance);
        return blockVerifier.verify();
    }

    getLastVerificationLevels() {
        return this.lastCompleteVerificationLevels;
    }
}