import { CustomForm, MessageBox } from "@minecraft/server-ui";
import { ItemStack } from "@minecraft/server";
import { FormUtils } from "../../Menu/FormUtils";
import { MenuForm } from "../../Menu/MenuForm";
import { InstanceMaterialsForm } from "./InstanceMaterialsForm";

export class InstanceCollectedForm {
    constructor(player, instance) {
        this.player = player;
        this.instance = instance;
        this.show();
    }

    show() {
        const collected = this.instance.getCollectedMaterials();
        const form = new CustomForm(this.player, MenuForm.title);
        form.label(this.#buildBody(collected));
        form.spacer();
        if (!collected.isEmpty()) {
            form.button({ translate: 'construct.instance.materials.collected.clear' }, () => {
                form.close();
                this.#clearWithConfirmation();
            });
        }
        form.button('<<', () => {
            form.close();
            new InstanceMaterialsForm(this.player, this.instance);
        });
        FormUtils.tryShow(form);
    }

    #buildBody(collected) {
        const body = { rawtext: [{ translate: 'construct.instance.materials.collected.header' }, { text: '§f\n\n' }] };
        if (collected.isEmpty()) {
            body.rawtext.push({ translate: 'construct.instance.materials.collected.empty' });
            return body;
        }
        const materials = {};
        for (const [typeId, amount] of collected.entries())
            materials[typeId] = { count: amount, stackSize: new ItemStack(typeId).maxAmount };
        body.rawtext.push(this.instance.getActiveMaterials().formatString(materials));
        return body;
    }

    async #clearWithConfirmation() {
        const confirmationBox = new MessageBox(this.player, { translate: 'construct.instance.materials.collected.clear.title' });
        confirmationBox.body({ translate: 'construct.instance.materials.collected.clear.body', with: [this.instance.getName()] });
        confirmationBox.button1({ translate: 'construct.instance.materials.collected.clear.confirm' });
        confirmationBox.button2({ translate: 'construct.instance.delete.cancel' });
        const result = await FormUtils.tryShow(confirmationBox);
        if (!this.player.isValid)
            return;
        if (result?.selection === 1)
            this.instance.clearCollectedMaterials();
        this.show();
    }
}
