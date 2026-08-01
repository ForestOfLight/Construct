import { BlockVerificationLevel } from '../Enums/BlockVerificationLevel.js';

export class InstanceStatistics {
    constructor(instance, verification) {
        this.instance = instance;
        this.statistics = verification.countByLevel();
    }

    getNonAirBlocks() {
        const activeBounds = this.instance.getActiveBounds();
        return activeBounds.min.volume(activeBounds.max) - this.statistics[BlockVerificationLevel.Air];
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
            message.rawtext.push({ translate: 'construct.instance.materials.layer', with: [String(this.instance.getLayer())] });
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