import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { MenuFormBuilder } from '../MenuFormBuilder';
import { StructureVerifier } from '../Verifier/StructureVerifier';
import { StructureStatistics } from '../Structure/StructureStatistics';
import { TicksPerSecond } from '@minecraft/server';

export class InstanceFormBuilder {
    static structureVerifier;

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
        if (this.structureVerifier)
            throw new Error('StructureVerifier is already running.');
        this.structureVerifier = new StructureVerifier(instance, { isEnabled: true, trackPlayerDistance: 0, intervalOrLifetime: 30 * TicksPerSecond, isStandalone: true });
        const verification = await this.structureVerifier.verifyStructure();
        const statistics = new StructureStatistics(instance, verification);
        this.structureVerifier = void 0;
        const statsMessage = statistics.getMessage();
        buildStatisticsForm.body(statsMessage);
        return { form: buildStatisticsForm, stats: statsMessage };
    }

    static buildSettings(instance) {
        return new ModalFormData()
            .title(MenuFormBuilder.menuTitle)
            .toggle('Block Validation', { defaultValue: instance.options.verifier.isEnabled, tooltip: 'Shows missing and incorrect block overlay.' })
            .toggle('Distance-Based Block Validation', { defaultValue: instance.verifier.getTrackPlayerDistance() !== 0, tooltip: `If enabled, the verifier will only check within ${instance.verifier.getTrackPlayerDistance()} blocks of the player. This should stay enabled unless your structure is very small.` })
            .label('Use the slider to select the layer. Use 0 for all layers.')
            .slider("Layer", 0, instance.getMaxLayer(), { defaultValue: instance.getLayer(), valueStep: 1 })
            .submitButton('§2Apply');
    }
}