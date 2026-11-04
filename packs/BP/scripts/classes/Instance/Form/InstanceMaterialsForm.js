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
        const { header, lines } = await this.#buildBody(canShowWorld, false);
        if (!this.#isStillValid())
            return;

        const form = new CustomForm(this.player, MenuForm.title);
        form.toggle({ translate: MaterialsButtons.ShowMissing }, showMissing, { visible: canShowWorld });
        form.toggle({ translate: MaterialsButtons.SubtractCollected }, subtractCollected);
        form.divider();
        const headerMessage = new ObservableUIRawMessage(header);
        form.label(headerMessage);
        const body = FormUtils.buildPaginatedText(form, lines, { emptyMessage: { translate: 'construct.instance.materials.empty' } });
        form.spacer();
        const refresh = () => this.#refresh(headerMessage, body, showMissing.getData(), subtractCollected.getData());
        showMissing.subscribe(refresh);
        subtractCollected.subscribe(refresh);
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

    async #refresh(headerMessage, body, showMissing, subtractCollected) {
        const renderId = ++this.#renderId;
        const { header, lines } = await this.#buildBody(showMissing, subtractCollected);
        if (renderId !== this.#renderId || !this.#isStillValid())
            return;
        headerMessage.setData(header);
        body.setLines(lines);
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

        const header = { rawtext: [] };
        header.rawtext.push({ translate: showsMissing ? 'construct.instance.materials.missing.header' : 'construct.instance.materials.all.header' });
        if (this.instance.hasLayerSelected())
            header.rawtext.push({ translate: 'construct.instance.materials.layer', with: [String(this.instance.getLayer())] });
        const note = showsMissing
            ? WorldMaterials.formatUnscannedNote(worldMaterials.unscannedCount)
            : this.#worldUnavailableNote();
        if (note)
            header.rawtext.push({ text: '§f\n\n' }, note);
        header.rawtext.push({ text: '§f' });
        return { header, lines: baseMaterials.formatLines(materials) };
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
