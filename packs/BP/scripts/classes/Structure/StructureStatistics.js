import { BlockVerificationLevel } from '../Enums/BlockVerificationLevel.js';

export class StructureStatistics {
    constructor(instance, verification) {
        this.instance = instance;
        this.verification = verification;
        this.parse();
    }

    init() {
        this.statistics = {};
        for (const verificationLevel of Object.values(BlockVerificationLevel))
            this.statistics[verificationLevel] = 0;
        this.statistics.correctlyAir = 0;
    }

    parse() {
        this.init();
        for (const blockVerificationLevel of Object.values(BlockVerificationLevel))
            this.parseStatistic(blockVerificationLevel);
    }

    parseStatistic(blockVerificationLevel) {
        for (const [location, verificationLevel] of Object.entries(this.verification)) {
            if (location === 'correctlyAir')
                continue;
            if (blockVerificationLevel === verificationLevel)
                this.statistics[verificationLevel]++;
        }
    }

    getNonAirBlocks() {
        const activeBounds = this.instance.getActiveBounds();
        return activeBounds.min.volume(activeBounds.max) - this.verification.correctlyAir;
    }

    getStat(blockVerificationLevel) {
        return { num: this.statistics[blockVerificationLevel], percent: this.statistics[blockVerificationLevel] / (this.getNonAirBlocks()) * 100 };
    }

    getSkipped() {
        return this.statistics[BlockVerificationLevel.Skipped] || 0;
    }

    getMessage() {
        let message = '';
        message += `§fStatistics for §a${this.instance.getName()}§f:`;
        if (this.instance.hasLayerSelected())
            message += ` §7(layer ${this.instance.getLayer()})`;
        message += `\n§7Blocks: §2${this.getNonAirBlocks()}\n`;
        const skipped = this.getSkipped();
        if (skipped > 0)
            message += `§c[!] This analysis skipped ${skipped} blocks.\n`;
        message += `§7Correct: §a${this.formatStat(this.getStat(BlockVerificationLevel.Match))}\n`;
        message += `§7Block State Incorrect: §e${this.formatStat(this.getStat(BlockVerificationLevel.TypeMatch))}\n`;
        message += `§7Incorrect: §c${this.formatStat(this.getStat(BlockVerificationLevel.NoMatch))}\n`;
        message += `§7Missing: §3${this.formatStat(this.getStat(BlockVerificationLevel.Missing))}\n`;
        return message;
    }

    formatStat(stat) {
        return `${stat.num} (${stat.percent.toFixed(2)}%%)`;
    }
}