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
        const message = { rawtext: [] };
        message.rawtext.push({ translate: 'construct.structure.statistics.header', with: [this.instance.getName()] });
        if (this.instance.hasLayerSelected())
            message.rawtext.push({ translate: 'construct.instance.materials.layer', with: [String(instance.getLayer())] });
        message.rawtext.push({ rawtext: [
            { text: '\n' },
            { translate: 'construct.structure.statistics.blocks', with: [String(this.getNonAirBlocks())] },
            { text: '\n' }
        ]});
        const skipped = this.getSkipped();
        if (skipped > 0)
            message.rawtext.push({ rawtext: [{ translate: 'construct.structure.statistics.skipped', with: [String(skipped)] }, { text: '\n' }] });
        message.rawtext.push({ rawtext: [{ translate: 'construct.structure.statistics.correct', with: [this.formatStat(this.getStat(BlockVerificationLevel.Match))] }, { text: '\n' }] });
        message.rawtext.push({ rawtext: [{ translate: 'construct.structure.statistics.stateincorrect', with: [this.formatStat(this.getStat(BlockVerificationLevel.TypeMatch))] }, { text: '\n' }] });
        message.rawtext.push({ rawtext: [{ translate: 'construct.structure.statistics.incorrect', with: [this.formatStat(this.getStat(BlockVerificationLevel.NoMatch))] }, { text: '\n' }] });
        message.rawtext.push({ rawtext: [{ translate: 'construct.structure.statistics.missing', with: [this.formatStat(this.getStat(BlockVerificationLevel.Missing))] }, { text: '\n' }] });
        return message;
    }

    formatStat(stat) {
        return `${stat.num} (${stat.percent.toFixed(2)}%%)`;
    }
}