import { BlockVerifier } from "./BlockVerifier";
import { BlockVerificationLevel } from "./enums/BlockVerificationLevel";
import { BlockVerificationLevelRender } from "./BlockVerificationLevelRender";
import { system, TicksPerSecond, world } from "@minecraft/server";

const MIN_TRACK_PLAYER_DISTANCE = 0;
const MAX_TRACK_PLAYER_DISTANCE = 7;
const MIN_LIFETIME = 8;

export class StructureVerifier {
    instance;
    blockVerificationLevels;
    shouldRender;
    trackPlayerDistance;
    intervalOrLifetime;
    isBlockPopulationComplete;
    isVerificationComplete;
    #runner;

    constructor(instance, { shouldRender = false, trackPlayerDistance = 1, intervalOrLifetime = 10 } = {}) {
        this.instance = instance;
        this.intervalOrLifetime = Math.max(intervalOrLifetime, MIN_LIFETIME);
        this.setOptions({ shouldRender, trackPlayerDistance });
    }

    startContinuousVerification() {
        this.#runner = system.runInterval(() => {
            this.verifyStructure();
        }, this.intervalOrLifetime);
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

    init() {
        this.locationsToVerify = new Set();
        this.blocksToVerify = [];
        this.blockVerificationLevels = { correctlyAir: 0 };
        this.isBlockPopulationComplete = false;
        this.isVerificationComplete = false;
    }

    setOptions({ shouldRender = false, trackPlayerDistance = 0 }) {
        this.blockVerificationLevels = { correctlyAir: 0 };
        this.shouldRender = shouldRender;
        this.trackPlayerDistance = Math.min(trackPlayerDistance, MAX_TRACK_PLAYER_DISTANCE);
        this.isVerificationComplete = false;
    }

    async verifyStructure() {
        this.init();
        return new Promise(async (resolve) => {
            await this.populateBlocksToVerify();
            system.runJob(this.verifyBlocks(this.blocksToVerify));
            const checker = system.runInterval(() => {
                if (this.isVerificationComplete) {
                    system.clearRun(checker);
                    resolve(this.blockVerificationLevels);
                }
            }, 1);
        });
    }

    populateBlocksToVerify() {
        return new Promise((resolve) => {
            if (this.trackPlayerDistance == 0)
                return this.instance.getBlocks();
            this.locationsToVerify = new Set();
            for (const player of this.instance.getDimension().getPlayers())
                system.runJob(this.populateActiveLocationsNearPlayer(player));
            this.blocksToVerify = this.instance.getBlocks(this.locationsToVerify);
            const checker = system.runInterval(() => {
                if (this.isBlockPopulationComplete) {
                    system.clearRun(checker);
                    resolve();
                }
            }, 1);
        });
    }

    *populateActiveLocationsNearPlayer(player) {
        for (let x = -this.trackPlayerDistance; x < this.trackPlayerDistance; x++) {
            for (let y = -this.trackPlayerDistance; y < this.trackPlayerDistance; y++) {
                for (let z = -this.trackPlayerDistance; z < this.trackPlayerDistance; z++) {
                    const structureLocation = this.instance.toStructureCoords({ x: player.location.x + x, y: player.location.y + y, z: player.location.z + z });
                    if (this.instance.isLocationActive(player.dimension.id, structureLocation, { useLayers: true })) {
                        this.locationsToVerify.add({ x: structureLocation.x, y: structureLocation.y, z: structureLocation.z });
                        yield void 0;
                    }
                }
            }
        }
        this.isBlockPopulationComplete = true;
    }
    
    *verifyBlocks(blocks) {
        for (const block of blocks) {
            const verificationLevel = this.verifyBlock(block.location);
            if (verificationLevel === BlockVerificationLevel.Air) {
                this.blockVerificationLevels.correctlyAir++;
            } else {
                this.blockVerificationLevels[JSON.stringify(block.location)] = verificationLevel;
                if (this.shouldRender) {
                    const dimensionLocation = { dimension: this.instance.getDimension(), location: this.instance.toGlobalCoords(block.location) };
                    new BlockVerificationLevelRender(dimensionLocation, verificationLevel, this.intervalOrLifetime/TicksPerSecond);
                }
            }
            yield void 0;
        }
        this.isVerificationComplete = true;
    }

    verifyBlock(location) {
        const worldBlock = this.instance.getDimension().getBlock(this.instance.toGlobalCoords(location));
        if (!worldBlock)
            return BlockVerificationLevel.Skipped;
        const blockVerifier = new BlockVerifier(worldBlock, this.instance);
        return blockVerifier.verify();
    }
}