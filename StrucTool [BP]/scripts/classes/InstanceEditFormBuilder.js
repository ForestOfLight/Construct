import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { MenuFormBuilder } from './MenuFormBuilder';
import { StructureVerifier } from './StructureVerifier';
import { StructureStatistics } from './StructureStatistics';
import { TicksPerSecond } from '@minecraft/server';

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
        const structureVerifier = new StructureVerifier(instance, { shouldRender: true, trackPlayerDistance: 0, intervalOrLifetime: 30 * TicksPerSecond });
        const verification = await structureVerifier.verifyStructure();
        const statistics = new StructureStatistics(instance, verification);
        const statsMessage = statistics.getMessage();
        buildStatisticsForm.body(statsMessage);
        return { form: buildStatisticsForm, stats: statsMessage };
    }

    static buildSettings(instance) {
        return new ModalFormData()
            .title(MenuFormBuilder.menuTitle)
            .toggle('Toggle block validation.', instance.verifier.shouldRender)
            .slider('Use the slider to restrict how far from players block validation occurs. Use 0 for no restriction.', 0, 10, 1, instance.verifier.trackPlayerDistance)
            .submitButton('§aApply');
    }
}