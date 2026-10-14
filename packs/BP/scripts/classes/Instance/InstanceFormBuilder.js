import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { MenuForm} from '../Menu/MenuForm';
import { StructureVerifier } from '../Verifier/StructureVerifier';
import { InstanceStatistics } from './InstanceStatistics';
import { TicksPerSecond, world } from '@minecraft/server';
import { RENDER_MODE_LABELS, RENDER_MODE_ORDER } from '../Enums/RenderMode';
import { RefreshRate } from '../Verifier/RefreshRate';
import { WorldMaterials } from '../Materials/WorldMaterials';
import { MaterialsPage } from '../Enums/MaterialsPage';
import { MaterialsButtons } from '../Enums/MaterialsButtons';

export class InstanceFormBuilder {
    static structureVerifier;

    static buildInstance(instance, options) {
        const location = instance.getLocation();
        const form = new ActionFormData()
            .title(MenuForm.title)
        const body = { rawtext: [
            { translate: 'construct.instance.menu.body', with: [instance.getName(), instance.getStructureId()] }
        ]};
        if (instance.hasLocation())
                body.rawtext.push(...[
                    { text: '\n' },
                    { translate: 'construct.instance.menu.location', with: { rawtext: [
                        { text:String(location.location.x) },
                        { text:String(location.location.y) },
                        { text:String(location.location.z) },
                        { translate:world.getDimension(location.dimensionId).localizationKey }
                    ]} }
                ]);
        form.body(body);
        options.forEach(option => {
            form.button({ translate: option });
        });
        return form;
    }

    static buildRenameInstance(currentName) {
        return new ModalFormData()
            .title(MenuForm.title)
            .textField({ translate: 'construct.instance.menu.rename' }, currentName)
            .submitButton({ translate: 'construct.menu.instance.button.rename' });
    }

    static async buildStatistics(instance) {
        const buildStatisticsForm = new ActionFormData()
            .title(MenuForm.title)
        if (this.structureVerifier)
            throw new Error('StructureVerifier is already running.');
        this.structureVerifier = StructureVerifier.standalone(instance, { particleLifetime: 1*TicksPerSecond });
        const verification = await this.structureVerifier.verifyStructure(true);
        const statistics = new InstanceStatistics(instance, verification);
        const statsMessage = statistics.getMessage();
        this.structureVerifier = void 0;
        buildStatisticsForm.body(statsMessage);
        return { form: buildStatisticsForm, stats: statsMessage };
    }

    static buildSettings(instance) {
        return new ModalFormData()
            .title(MenuForm.title)
            .toggle({ translate: 'construct.instance.option.validation' }, { defaultValue: instance.options.verifier.isEnabled, tooltip: { translate: 'construct.instance.option.validation.description' }})
            .slider({ translate: 'construct.instance.option.layer'}, 0, instance.getMaxLayer(), { defaultValue: instance.getLayer(), valueStep: 1, tooltip: { translate: 'construct.instance.option.layer.description' }})
            .dropdown(
                { translate: 'construct.instance.option.rendermode' },
                RENDER_MODE_ORDER.map(mode => ({ translate: RENDER_MODE_LABELS[mode] })),
                {
                    defaultValueIndex: Math.max(RENDER_MODE_ORDER.indexOf(instance.options.renderMode), 0),
                    tooltip: { translate: 'construct.instance.option.rendermode.description' }
                }
            )
            .slider(
                { translate: 'construct.instance.option.refreshrate' },
                RefreshRate.MIN_SECONDS,
                RefreshRate.MAX_SECONDS,
                {
                    defaultValue: instance.options.verifier.refreshSeconds,
                    valueStep: RefreshRate.SECONDS_STEP,
                    tooltip: { translate: 'construct.instance.option.refreshrate.description' }
                }
            )
            .submitButton({ translate: 'construct.menu.submit' });
    }

    static buildMaterialList(instance, page, worldMaterials) {
        const showsMissing = page === MaterialsPage.Missing && worldMaterials !== void 0;
        const baseMaterials = instance.getActiveMaterials();
        const form = new ActionFormData()
            .title(MenuForm.title)
        const body = { rawtext: [] };
        body.rawtext.push({ translate: showsMissing ? 'construct.instance.materials.missing.header' : 'construct.instance.materials.all.header' });
        if (instance.hasLayerSelected())
            body.rawtext.push({ translate: 'construct.instance.materials.layer', with: [String(instance.getLayer())] });
        body.rawtext.push({ text: '§f\n\n' });
        const note = showsMissing
            ? WorldMaterials.formatUnscannedNote(worldMaterials.unscannedCount)
            : InstanceFormBuilder.#worldUnavailableNote(instance);
        if (note)
            body.rawtext.push(note, { text: '§f\n\n' });
        const list = baseMaterials.formatString(showsMissing ? worldMaterials.materials : void 0);
        body.rawtext.push(list.rawtext.length > 0 ? list : { translate: 'construct.instance.materials.empty' });
        form.body(body);
        const buttons = InstanceFormBuilder.#materialListButtons(instance, showsMissing);
        buttons.forEach(button => form.button({ translate: button }));
        return { form, buttons };
    }

    static #worldUnavailableNote(instance) {
        if (!instance.isEnabled())
            return { translate: 'construct.instance.materials.placeinstance' };
        if (!instance.canShowWorldMaterials())
            return { translate: 'construct.instance.materials.verifieroff' };
        return void 0;
    }

    static #materialListButtons(instance, showsMissing) {
        if (showsMissing)
            return [MaterialsButtons.ShowAll, MaterialsButtons.SubtractInventory];
        if (instance.canShowWorldMaterials())
            return [MaterialsButtons.ShowMissing, MaterialsButtons.SubtractInventory];
        return [MaterialsButtons.SubtractInventory];
    }
}