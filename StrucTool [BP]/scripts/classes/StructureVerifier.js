import { BlockVerifier } from "./BlockVerifier";
import { BlockVerificationLevel } from "./BlockVerificationLevel";

export class StructureVerifier {
    constructor(instance) {
        this.instance = instance;
        this.blockVerificationLevels = {};
        this.statistics = {};
        this.initStatistics();
    }

    async verifyStructure() {
        await this.runVerifier();
        this.parseStatistics();
        return this.statistics;
    }

    async runVerifier() {
        return new Promise((resolve) => {
            system.runJob(this.verifyBlocks);
            const checker = system.runInterval(() => {
                if (this.isComplete) {
                    system.clearRun(checker);
                    resolve();
                }
            }, 1);
        });
    }
    
    *verifyBlocks() {
        for (const block of this.instance.getBlocks()) {
            const verificationLevel = this.verifyBlock(block.location);
            if (verificationLevel !== BlockVerificationLevel.isAir)
                this.blockVerificationLevels[JSON.stringify(block.location)] = verificationLevel;
            else
                this.statistics.correctlyAir++;
            yield;
        }
        this.isComplete = true;
    }

    // async runVerifier() {
    //     return new Promise((resolve) => {
    //         this.verifyBlocks();
    //         resolve();
    //     });
    // }

    // verifyBlocks() {
    //     for (const block of this.instance.getBlocks()) {
    //     const verificationLevel = this.verifyBlock(block.location);
    //     if (verificationLevel !== BlockVerificationLevel.isAir)
    //         this.blockVerificationLevels[JSON.stringify(block.location)] = verificationLevel;
    //     else
    //         this.statistics.correctlyAir++;
    //     }
    // }

    verifyBlock(location) {
        const worldBlock = this.instance.getDimension().getBlock(this.instance.toGlobalCoords(location));
        if (!worldBlock)
            throw new Error(`Block at ${JSON.stringify(location)} could not be accessed.`);
        const blockVerifier = new BlockVerifier(worldBlock, this.instance);
        return blockVerifier.verify();
    }

    initStatistics() {
        for (const verificationlevel of Object.values(BlockVerificationLevel)) {
            this.statistics[verificationlevel] = 0;
        }
        this.statistics.percentages = {};
        this.statistics.correctlyAir = 0;
    }

    parseStatistics() {
        for (const blockVerificationLevel of Object.values(BlockVerificationLevel)) {
            this.parseStatistic(blockVerificationLevel);
        }
    }

    parseStatistic(blockVerificationLevel) {
        for (const verificationlevel of Object.values(this.blockVerificationLevels)) {
            if (blockVerificationLevel === verificationlevel) {
                this.statistics[verificationlevel]++;
            }
        }
        this.statistics.percentages[blockVerificationLevel] = this.statistics[blockVerificationLevel] / (this.instance.getTotalVolume() - this.statistics.correctlyAir) * 100;
    }
}