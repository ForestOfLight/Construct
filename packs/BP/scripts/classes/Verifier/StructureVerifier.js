import { BlockVerifier } from "./BlockVerifier";
import { VerificationLevels } from "./VerificationLevels";
import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel";
import { BlockVerificationLevelPerformanceRender } from "../Render/PerformanceRender/BlockVerificationLevelPerformanceRender";
import { system, TicksPerSecond } from "@minecraft/server";
import { Vector } from "../../lib/Vector";

const MIN_TRACK_PLAYER_DISTANCE = 0;
const MAX_TRACK_PLAYER_DISTANCE = 7;
const MIN_LIFETIME = 8;

export class StructureVerifier {
    instance;
    particleLifetime;

    locationsToVerify;
    blockVerificationLevels;
    isLocationPopulationComplete;
    isVerificationComplete;
    shouldStartNextVerification;
    lastCompleteVerificationLevels;

    #runner;
    #verifyJob;
    #resolveVerification;
    #populateJob = {};

    constructor(instance, { isEnabled = false, trackPlayerDistance = 0, particleLifetime = 10, isStandalone = false } = {}) {
        this.instance = instance;
        this.particleLifetime = Math.max(particleLifetime, MIN_LIFETIME);
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
            this.#verifyJob = system.runJob(this.verifyBlocks(shouldRender));
        });
    }

    #cancelVerification() {
        if (!this.#verifyJob)
            return;
        system.clearJob(this.#verifyJob);
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
        this.#verifyJob = void 0;
        this.#resolveVerification = void 0;
        resolve?.(verificationLevels);
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
        const location = new Vector();
        for (let y = bounds.min.y; y < bounds.max.y; y++) {
            for (let z = bounds.min.z; z < bounds.max.z; z++) {
                for (let x = bounds.min.x; x < bounds.max.x; x++) {
                    this.verifyBlock(location.set(x, y, z), shouldRender);
                }
                yield void 0;
            }
        }
        this.isVerificationComplete = true;
        this.#completeVerification();
    }

    verifyBlock(location, shouldRender) {
        const globalLocation = this.instance.toGlobalCoords(location);
        const verificationLevel = this.getVerificationLevel(globalLocation);
        this.blockVerificationLevels.set(location, verificationLevel);
        if (shouldRender && verificationLevel !== BlockVerificationLevel.Air) {
            const dimensionLocation = { dimension: this.instance.getDimension(), location: globalLocation };
            new BlockVerificationLevelPerformanceRender(dimensionLocation, verificationLevel, this.particleLifetime/TicksPerSecond);
        }
    }

    getVerificationLevel(globalLocation) {
        const worldBlock = this.instance.getDimension()?.getBlock(globalLocation);
        if (!worldBlock)
            return BlockVerificationLevel.Skipped;
        const blockVerifier = new BlockVerifier(worldBlock, this.instance);
        return blockVerifier.verify();
    }

    getLastVerificationLevels() {
        return this.lastCompleteVerificationLevels;
    }
}