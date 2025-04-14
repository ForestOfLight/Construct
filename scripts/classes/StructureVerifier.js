import { BlockVerifier } from "./BlockVerifier";
import { BlockVerificationLevel } from "./BlockVerificationLevel";
import { system } from "@minecraft/server";

export class StructureVerifier {
    constructor(stucture) {
        this.structure = structure;
        this.blockVerificationLevels = {};
        this.statistics = {};
        this.initStatistics();
    }

    verifyStructure() {
        system.runJob(this.verifyBlocks());
        this.parseStatistics();
    }

    *verifyBlocks() {
        for (const block of this.structure.getBlocks()) {
            this.blockVerificationLevels[block.location] = this.verifyBlock(block.location);
            yield;
        }
    }

    verifyBlock(location) {
        const worldBlock = this.structure.getDimension().getBlock(location);
        if (!worldBlock)
            throw new Error(`Block at ${JSON.stringify(location)} could not be accessed.`);
        const blockVerifier = new BlockVerifier(worldBlock, this.structure);
        return blockVerifier.verify();
    }

    initStatistics() {
        for (const verificationlevel of Object.keys(BlockVerificationLevel)) {
            this.statistics[verificationlevel] = 0;
        }
    }

    parseStatistics() {
        for (const blockVerificationLevel of Object.keys(this.statistics)) {
            this.parseStatistic(blockVerificationLevel);
        }
    }

    parseStatistic(blockVerificationLevel) {
        for (const verificationlevel of Object.values(this.blockVerificationLevels)) {
            if (blockVerificationLevel === verificationlevel) {
                this.statistics[verificationlevel]++;
            }
        }
        this.statistics.percentages[blockVerificationLevel] = this.statistics[blockVerificationLevel] / this.structure.getTotalVolume() * 100;
    }
}