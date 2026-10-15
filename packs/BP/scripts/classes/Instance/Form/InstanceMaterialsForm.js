import { CustomForm, ObservableBoolean, ObservableUIRawMessage } from "@minecraft/server-ui";
import { EntityComponentTypes } from "@minecraft/server";
import { FormUtils } from "../../Menu/FormUtils";
import { MenuForm } from "../../Menu/MenuForm";
import { MaterialsButtons } from "../../Enums/MaterialsButtons";
import { CollectedMaterials } from "../../Materials/CollectedMaterials";
import { WorldMaterials } from "../../Materials/WorldMaterials";
import { InstanceForm } from "./InstanceForm";
import { InstanceCollectedForm } from "./InstanceCollectedForm";
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
        const subtractCollected = new ObservableBoolean(false, { clientWritable: true });
        const body = new ObservableUIRawMessage(await this.#buildBody(canShowWorld, false));
        if (!this.#isStillValid())
            return;
        const refresh = () => this.#refresh(body, showMissing.getData(), subtractCollected.getData());
        showMissing.subscribe(refresh);
        subtractCollected.subscribe(refresh);

        const form = new CustomForm(this.player, MenuForm.title);
        form.toggle({ translate: MaterialsButtons.ShowMissing }, showMissing, { visible: canShowWorld });
        form.toggle({ translate: MaterialsButtons.SubtractCollected }, subtractCollected);
        form.divider();
        form.label(body);
        form.spacer();
        const showAddInventory = new ObservableBoolean(true, { clientWritable: true });
        const showInventoryAdded = new ObservableBoolean(false, { clientWritable: true });
        const inventoryAddedMessage = new ObservableUIRawMessage({ text: '' });
        form.button(this.#getAddInventoryLabel(), () => {
            inventoryAddedMessage.setData(this.#addInventoryToCollected());
            showAddInventory.setData(false);
            showInventoryAdded.setData(true);
            refresh();
        }, {
            tooltip: { translate: 'construct.instance.materials.addinventory.description' },
            visible: showAddInventory
        });
        form.label(inventoryAddedMessage, { visible: showInventoryAdded });
        form.spacer({ visible: showInventoryAdded });
        form.button({ translate: MaterialsButtons.ViewCollected }, () => {
            form.close();
            new InstanceCollectedForm(this.player, this.instance);
        });
        form.button('<<', () => {
            form.close();
            new InstanceForm(this.player, this.instance.getName());
        });
        FormUtils.tryShow(form);
    }

    #getInventoryMatches() {
        const inventory = this.player.getComponent(EntityComponentTypes.Inventory)?.container;
        if (!inventory)
            return new CollectedMaterials();
        return CollectedMaterials.fromInventory(inventory, this.instance.getActiveMaterials().materials);
    }

    #getAddInventoryLabel() {
        return { translate: MaterialsButtons.AddInventory, with: [String(this.#getInventoryMatches().getTotal())] };
    }

    #addInventoryToCollected() {
        const matches = this.#getInventoryMatches();
        this.instance.addCollectedMaterials(matches);
        return { translate: 'construct.instance.materials.addinventory.success', with: [String(matches.getTotal())] };
    }

    async #refresh(body, showMissing, subtractCollected) {
        const renderId = ++this.#renderId;
        const message = await this.#buildBody(showMissing, subtractCollected);
        if (renderId !== this.#renderId || !this.#isStillValid())
            return;
        body.setData(message);
    }

    async #buildBody(showMissing, subtractCollected) {
        const worldMaterials = showMissing && this.instance.canShowWorldMaterials()
            ? await this.instance.getWorldMaterials()
            : void 0;
        const showsMissing = worldMaterials !== void 0;
        const baseMaterials = this.instance.getActiveMaterials();
        let materials = showsMissing ? worldMaterials.materials : baseMaterials.materials;
        if (subtractCollected)
            materials = this.instance.getCollectedMaterials().subtractFrom(materials);

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
