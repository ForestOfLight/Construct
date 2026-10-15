import { CustomForm, ObservableBoolean, ObservableUIRawMessage } from "@minecraft/server-ui";
import { EntityComponentTypes } from "@minecraft/server";
import { FormUtils } from "../../Menu/FormUtils";
import { MenuForm } from "../../Menu/MenuForm";
import { MaterialsButtons } from "../../Enums/MaterialsButtons";
import { StructureMaterials } from "../../Materials/StructureMaterials";
import { WorldMaterials } from "../../Materials/WorldMaterials";
import { InstanceForm } from "./InstanceForm";
import { instanceCollection } from "../InstanceCollection";

export class InstanceMaterialsForm {
    #renderId = 0;

    constructor(player, instance) {
        this.player = player;
        this.instance = instance;
        this.show();
    }

    async show() {
        const canShowWorld = this.instance.canShowWorldMaterials();
        const showMissing = new ObservableBoolean(canShowWorld, { clientWritable: true });
        const subtractInventory = new ObservableBoolean(false, { clientWritable: true });
        const body = new ObservableUIRawMessage(await this.#buildBody(canShowWorld, false));
        if (!this.#isStillValid())
            return;
        const refresh = () => this.#refresh(body, showMissing.getData(), subtractInventory.getData());
        showMissing.subscribe(refresh);
        subtractInventory.subscribe(refresh);

        const form = new CustomForm(this.player, MenuForm.title);
        form.toggle({ translate: MaterialsButtons.ShowMissing }, showMissing, { visible: canShowWorld });
        form.toggle({ translate: MaterialsButtons.SubtractInventory }, subtractInventory);
        form.divider();
        form.label(body);
        form.spacer();
        form.button('<<', () => {
            form.close();
            new InstanceForm(this.player, this.instance.getName());
        });
        FormUtils.tryShow(form);
    }

    async #refresh(body, showMissing, subtractInventory) {
        const renderId = ++this.#renderId;
        const message = await this.#buildBody(showMissing, subtractInventory);
        if (renderId !== this.#renderId || !this.#isStillValid())
            return;
        body.setData(message);
    }

    async #buildBody(showMissing, subtractInventory) {
        const worldMaterials = showMissing && this.instance.canShowWorldMaterials()
            ? await this.instance.getWorldMaterials()
            : void 0;
        const showsMissing = worldMaterials !== void 0;
        const baseMaterials = this.instance.getActiveMaterials();
        let materials = showsMissing ? worldMaterials.materials : baseMaterials.materials;
        const inventory = this.player.getComponent(EntityComponentTypes.Inventory)?.container;
        if (subtractInventory && inventory)
            materials = StructureMaterials.subtractInventory(materials, inventory);

        const body = { rawtext: [] };
        body.rawtext.push({ translate: showsMissing ? 'construct.instance.materials.missing.header' : 'construct.instance.materials.all.header' });
        if (this.instance.hasLayerSelected())
            body.rawtext.push({ translate: 'construct.instance.materials.layer', with: [String(this.instance.getLayer())] });
        body.rawtext.push({ text: '§f\n\n' });
        const note = showsMissing
            ? WorldMaterials.formatUnscannedNote(worldMaterials.unscannedCount)
            : this.#worldUnavailableNote();
        if (note)
            body.rawtext.push(note, { text: '§f\n\n' });
        const list = baseMaterials.formatString(materials);
        body.rawtext.push(list.rawtext.length > 0 ? list : { translate: 'construct.instance.materials.empty' });
        return body;
    }

    #worldUnavailableNote() {
        if (!this.instance.isEnabled())
            return { translate: 'construct.instance.materials.placeinstance' };
        if (!this.instance.canShowWorldMaterials())
            return { translate: 'construct.instance.materials.verifieroff' };
        return void 0;
    }

    #isStillValid() {
        return this.player.isValid && instanceCollection.has(this.instance.getName());
    }
}
