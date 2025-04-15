import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { MenuFormBuilder } from './MenuFormBuilder';
import { StructureVerifier } from './StructureVerifier';
import { BlockVerificationLevel } from './BlockVerificationLevel';

export class InstanceEditFormBuilder {
    static buildInstance(instance, options) {
        const location = instance.getLocation();
        const form = new ActionFormData()
            .title(MenuFormBuilder.menuTitle)
        let body = `Instance: §a${instance.name}\n§fStructure: §2${instance.getStructureId()}\n`;
        if (instance.hasLocation())
            body += `§7(${location.location.x} ${location.location.y} ${location.location.z} in ${location.dimensionId})\n`;
        form.body(body);
        options.forEach(option => {
            form.button(`${option}`);
        });
        return form;
    }

    static buildRenameInstance(currentName) {
        return new ModalFormData()
            .title(MenuFormBuilder.menuTitle)
            .textField('Enter a new name for the instance:', currentName)
            .submitButton('Rename');
    }

    static buildSetLayer(maxLayer, currentLayer) {
        return new ModalFormData()
            .title(MenuFormBuilder.menuTitle)
            .label('Use the slider to select the layer. Use 0 for all layers.')
            .slider("Layer", 0, maxLayer, 1, currentLayer)
            .submitButton('Set Layer');
    }

    static async buildStatistics(instance) {
        const buildStatisticsForm = new ActionFormData()
            .title(MenuFormBuilder.menuTitle)
        let message = '';
        const structureVerifier = new StructureVerifier(instance, { shouldRender: true });
        const statistics = await structureVerifier.verifyStructure();
        message += `§fStatistics for §a${instance.name}§f:\n`;
        message += `§7Blocks: §2${instance.getTotalVolume() - statistics.correctlyAir}\n`;
        message += `§7Correct: §a${this.getFormattedStatistic(statistics, BlockVerificationLevel.Match)}\n`;
        message += `§7Block State Incorrect: §e${this.getFormattedStatistic(statistics, BlockVerificationLevel.TypeMatch)}\n`;
        message += `§7Incorrect: §c${this.getFormattedStatistic(statistics, BlockVerificationLevel.NoMatch)}\n`;
        message += `§7Missing: §c${this.getFormattedStatistic(statistics, BlockVerificationLevel.Missing)}\n`;
        buildStatisticsForm.body(message);
        return buildStatisticsForm;
    }

    static getFormattedStatistic(statistics, blockVerificationLevel) {
        return `${statistics[blockVerificationLevel]} (${statistics.percentages[blockVerificationLevel].toFixed(2)}%%)`;
    }
}