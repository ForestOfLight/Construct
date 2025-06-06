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
            await this.populateLocationsToVerify();
            if (this.#verifyJob)
                system.clearJob(this.#verifyJob);
            this.#verifyJob = system.runJob(this.verifyBlocks(this.locationsToVerify, shouldRender));
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

    async populateLocationsToVerify() {
        return new Promise((resolve) => {
            if (this.getTrackPlayerDistance() === 0) {
                this.locationsToVerify = this.instance.getAllActiveLocations();
                resolve();
            } else {
                for (const job of Object.values(this.#populateJob))
                    system.clearJob(job);
                for (const player of this.instance.getDimension().getPlayers()) {
                    if (!player)
                        continue;
                    this.#populateJob[player.id] = system.runJob(this.populateActiveLocationsNearPlayer(player));
                }
                const checker = system.runInterval(() => {
                    if (this.isLocationPopulationComplete) {
                        system.clearRun(checker);
                        resolve();
                    }
                }, 1);
            }
        });
    }

    *populateActiveLocationsNearPlayer(player) {
        const distance = this.getTrackPlayerDistance();
        for (let x = -distance; x < distance; x++) {
            for (let y = -distance; y < distance; y++) {
                for (let z = -distance; z < distance; z++) {
                    const worldLocation = Vector.from(player.location).add(new Vector(x, y, z)).floor();;
                    const structureLocation = this.instance.toStructureCoords(worldLocation);
                    if (this.instance.isLocationActive(player.dimension.id, structureLocation, { useActiveLayer: true })) {
                        this.locationsToVerify.add(structureLocation);
                    }
                    yield void 0;
                }
            }
        }
        this.isLocationPopulationComplete = true;
    }
    
    *verifyBlocks(locations, shouldRender) {
        for (const location of locations) {
            const verificationLevel = this.verifyBlock(location);
            if (verificationLevel === BlockVerificationLevel.Air) {
                this.blockVerificationLevels.correctlyAir++;
            } else {
                this.blockVerificationLevels[JSON.stringify(location)] = verificationLevel;
                if (shouldRender) {
                    const dimensionLocation = { dimension: this.instance.getDimension(), location: this.instance.toGlobalCoords(location) };
                    new BlockVerificationLevelRender(dimensionLocation, verificationLevel, this.particleLifetime/TicksPerSecond);
                }
            }
            yield void 0;
        }
        this.isVerificationComplete = true;
    }

    verifyBlock(location) {
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