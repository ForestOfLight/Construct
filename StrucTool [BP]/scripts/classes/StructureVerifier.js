import { BlockVerifier } from "./BlockVerifier";
import { BlockVerificationLevel } from "./enums/BlockVerificationLevel";
import { BlockVerificationLevelRender } from "./BlockVerificationLevelRender";
import { system, TicksPerSecond } from "@minecraft/server";

export class StructureVerifier {
    shouldRender;
    isComplete;
    interval = 5*20;
    #runner;

    constructor(instance, { shouldRender = false } = {}) {
        this.shouldRender = shouldRender;
        this.instance = instance;
        this.interval = Math.max(instance.getActiveVolume() / 50, 20);
    }

    startContinuousVerification() {
        this.#runner = system.runInterval(() => {
            this.verifyStructure();
        }, this.interval);
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

    init(shouldRender) {
        this.blockVerificationLevels = { correctlyAir: 0 };
        this.shouldRender = shouldRender;
        this.isComplete = false;
    }

    async verifyStructure() {
        this.init(this.shouldRender);
        return new Promise((resolve) => {
            if (this.instance.isUsingLayers())
                system.runJob(this.verifyBlocks(this.instance.getLayerBlocks(this.instance.getLayer()-1)));
            else
                system.runJob(this.verifyBlocks(this.instance.getBlocks()));
            const checker = system.runInterval(() => {
                if (this.isComplete) {
                    system.clearRun(checker);
                    resolve(this.blockVerificationLevels);
                }
            }, 1);
        });
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
                    new BlockVerificationLevelRender(dimensionLocation, verificationLevel, this.interval/TicksPerSecond);
                }
            }
            yield void 0;
        }
        this.isComplete = true;
    }

    verifyBlock(location) {
        const worldBlock = this.instance.getDimension().getBlock(this.instance.toGlobalCoords(location));
        if (!worldBlock) {
            return BlockVerificationLevel.Skipped;
        }
        const blockVerifier = new BlockVerifier(worldBlock, this.instance);
        return blockVerifier.verify();
    }
}