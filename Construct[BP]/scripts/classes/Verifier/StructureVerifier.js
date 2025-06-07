import { BlockVerifier } from "./BlockVerifier";
import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel";
import { BlockVerificationLevelRender } from "../Render/BlockVerificationLevelRender";
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
        this.initVerification();
        return new Promise(async (resolve) => {
            if (this.#verifyJob)
                system.clearJob(this.#verifyJob);
            this.#verifyJob = system.runJob(this.verifyBlocks(shouldRender));
            const checker = system.runInterval(() => {
                if (this.isVerificationComplete) {
                    system.clearRun(checker);
                    this.lastCompleteVerificationLevels = JSON.parse(JSON.stringify(this.blockVerificationLevels));
                    this.shouldStartNextVerification = true;
                    resolve(this.blockVerificationLevels);
                }
            }, 1);
        });
    }

    initVerification() {
        this.shouldStartNextVerification = false;
        this.locationsToVerify.clear();
        this.blockVerificationLevels = { correctlyAir: 0 };
        this.isLocationPopulationComplete = false;
        this.isVerificationComplete = false;
    }
    
    *verifyBlocks(shouldRender) {
        const bounds = this.instance.getActiveBounds();
        for (let y = bounds.min.y; y < bounds.max.y; y++) {
            for (let z = bounds.min.z; z < bounds.max.z; z++) {
                for (let x = bounds.min.x; x < bounds.max.x; x++) {
                    const location = new Vector(x, y, z);
                    this.verifyBlock(location, shouldRender);
                    yield void 0;
                }
            }
        }
        this.isVerificationComplete = true;
    }

    verifyBlock(location, shouldRender) {
        const verificationLevel = this.getVerificationLevel(location);
        if (verificationLevel === BlockVerificationLevel.Air) {
            this.blockVerificationLevels.correctlyAir++;
        } else {
            this.blockVerificationLevels[JSON.stringify(location)] = verificationLevel;
            if (shouldRender) {
                const dimensionLocation = { dimension: this.instance.getDimension(), location: this.instance.toGlobalCoords(location) };
                new BlockVerificationLevelRender(dimensionLocation, verificationLevel, this.particleLifetime/TicksPerSecond);
            }
        }
    }

    getVerificationLevel(location) {
        const worldBlock = this.instance.getDimension()?.getBlock(this.instance.toGlobalCoords(location));
        if (!worldBlock)
            return BlockVerificationLevel.Skipped;
        const blockVerifier = new BlockVerifier(worldBlock, this.instance);
        return blockVerifier.verify();
    }

    getLastVerificationLevels() {
        if (!this.lastCompleteVerificationLevels)
            return {};
        return this.lastCompleteVerificationLevels;
    }
}