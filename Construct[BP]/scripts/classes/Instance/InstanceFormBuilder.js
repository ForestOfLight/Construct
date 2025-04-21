import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { MenuFormBuilder } from '../MenuFormBuilder';
import { StructureVerifier } from '../Verifier/StructureVerifier';
import { StructureStatistics } from '../Structure/StructureStatistics';
import { TicksPerSecond } from '@minecraft/server';

export class InstanceFormBuilder {
    static buildInstance(instance, options) {
        const location = instance.getLocation();
        const form = new ActionFormData()
            .title(MenuFormBuilder.menuTitle)
        let body = `Instance: §a${instance.getName()}\n§fStructure: §2${instance.getStructureId()}\n`;
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

    static async buildStatistics(instance) {
        const buildStatisticsForm = new ActionFormData()
            .title(MenuFormBuilder.menuTitle)
        const structureVerifier = new StructureVerifier(instance, { isEnabled: true, trackPlayerDistance: 0, intervalOrLifetime: 30 * TicksPerSecond, isStandalone: true });
        const verification = await structureVerifier.verifyStructure();
        const statistics = new StructureStatistics(instance, verification);
        const statsMessage = statistics.getMessage();
        buildStatisticsForm.body(statsMessage);
        return { form: buildStatisticsForm, stats: statsMessage };
    }

    static buildSettings(instance) {
        return new ModalFormData()
            .title(MenuFormBuilder.menuTitle)
            .label('Use the slider to select the layer. Use 0 for all layers.')
            .toggle('Block Validation', instance.options.verifier.isEnabled)
            .toggle('Distance-Based Block Validation', instance.verifier.getTrackPlayerDistance() !== 0)
            .slider("Layer", 0, instance.getMaxLayer(), 1, instance.getLayer())
            .submitButton('§2Apply');
    }
}