import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { MenuFormBuilder } from '../MenuFormBuilder';
import { StructureVerifier } from '../Verifier/StructureVerifier';
import { StructureStatistics } from '../Structure/StructureStatistics';
import { EntityComponentTypes, TicksPerSecond } from '@minecraft/server';

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
        this.structureVerifier = new StructureVerifier(instance, { isEnabled: true, particleLifetime: 1*TicksPerSecond, isStandalone: true });
        const verification = await this.structureVerifier.verifyStructure(true);
        const statistics = new StructureStatistics(instance, verification);
        const statsMessage = statistics.getMessage();
        this.structureVerifier = void 0;
        buildStatisticsForm.body(statsMessage);
        return { form: buildStatisticsForm, stats: statsMessage };
    }

    static buildSettings(instance) {
        return new ModalFormData()
            .title(MenuFormBuilder.menuTitle)
            .toggle('Block Validation', { defaultValue: instance.options.verifier.isEnabled, tooltip: 'Shows missing and incorrect block overlay.' })
            .slider("Layer", 0, instance.getMaxLayer(), { defaultValue: instance.getLayer(), valueStep: 1, tooltip: 'Changes the active layer. Use 0 for all layers.' })
            .submitButton('§2Apply');
    }

    static buildMaterialList(instance, onlyMissing = false, player = false) {
        const materials = instance.getActiveMaterials();
        const form = new ActionFormData()
            .title(MenuFormBuilder.menuTitle)
        const bodyText = { rawtext: [] };
        let buttonText = void 0;
        if (onlyMissing) {
            const inventoryContainer = player?.getComponent(EntityComponentTypes.Inventory)?.container;
            if (!inventoryContainer) {
                form.body('§cNo player inventory found.');
                return form;
            }
            bodyText.rawtext.push({ text: `§cMaterials Missing From Inventory:` });
            if (instance.hasLayerSelected())
                bodyText.rawtext.push({ text: ` §7(layer ${instance.getLayer()})` });
            bodyText.rawtext.push({ text: `§f\n\n` });
            bodyText.rawtext.push(materials.formatString(materials.getMaterialsDifference(inventoryContainer)));
            buttonText = "Show All Materials";
        } else {
            bodyText.rawtext.push({ text: `§aAll Materials:` });
            if (instance.hasLayerSelected())
                bodyText.rawtext.push({ text: ` §7(layer ${instance.getLayer()})` });
            bodyText.rawtext.push({ text: `§f\n\n` });
            bodyText.rawtext.push(materials.formatString());
            buttonText = "Show Missing Materials";
        }
        form.body(bodyText);
        form.button(buttonText);
        return form;
    }
}