import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { MenuFormBuilder } from '../MenuFormBuilder';
import { StructureVerifier } from '../Verifier/StructureVerifier';
import { StructureStatistics } from '../Structure/StructureStatistics';
import {EntityComponentTypes, TicksPerSecond} from '@minecraft/server';
import {dim} from "../zh_CN";

export class InstanceFormBuilder {
    static structureVerifier;

    static buildInstance(instance, options) {
        const location = instance.getLocation();
        const form = new ActionFormData()
            .title(MenuFormBuilder.menuTitle)
        const body = { rawtext: [
            { translate: 'construct.instance.menu.body', with: [instance.getName(), instance.getStructureId()] }
        ]};
        if (instance.hasLocation())
                body.rawtext.push(...[
                    { text: '\n' },
                    //{translate:world.getDimension(location.dimensionId).localizationKey},---to be compatible with language files, this method is not used
                    { translate: 'construct.instance.menu.location', with: [String(location.location.x), String(location.location.y), String(location.location.z), dim[location.dimensionId]] } //all dim names automatically translated
                ]);
        form.body(body);
        options.forEach(option => {
            form.button({ translate: option });
        });
        return form;
    }

    static buildRenameInstance(currentName) {
        return new ModalFormData()
            .title(MenuFormBuilder.menuTitle)
            .textField({ translate: 'construct.instance.menu.rename' }, currentName) //instance but not isntance
            .submitButton({ translate: 'construct.menu.instance.button.rename' });
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
            .toggle({ translate: 'construct.instance.option.validation' }, { defaultValue: instance.options.verifier.isEnabled, tooltip: { translate: 'construct.instance.option.validation.description' }})
            .slider({ translate: 'construct.instance.option.layer'}, 0, instance.getMaxLayer(), { defaultValue: instance.getLayer(), valueStep: 1, tooltip: { translate: 'construct.instance.option.layer.description' }})
            .submitButton({ translate: 'construct.menu.submit' });
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
                form.body({ translate: 'construct.instance.materials.noinventory' });
                return form;
            }
            bodyText.rawtext.push({ translate: 'construct.instance.materials.missing.header' });
            if (instance.hasLayerSelected())
                bodyText.rawtext.push({ translate: 'construct.instance.materials.layer', with: [String(instance.getLayer())] });
            bodyText.rawtext.push({ text: `§f\n\n` });
            bodyText.rawtext.push(materials.formatString(materials.getMaterialsDifference(inventoryContainer)));
            buttonText = "construct.instance.materials.all.button";
        } else {
            bodyText.rawtext.push({ translate: `construct.instance.materials.all.header` });
            if (instance.hasLayerSelected())
                bodyText.rawtext.push({ translate: 'construct.instance.materials.layer', with: [String(instance.getLayer())] });
            bodyText.rawtext.push({ text: `§f\n\n` });
            bodyText.rawtext.push(materials.formatString());
            buttonText = "construct.instance.materials.missing.button";
        }
        form.body(bodyText);
        form.button({ translate: buttonText });
        return form;
    }
}