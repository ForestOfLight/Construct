import { AdminOptions } from "./AdminOptions";
import { CustomForm } from "@minecraft/server-ui";
import { MenuForm } from "../Menu/MenuForm";
import { FormUtils } from "../Menu/FormUtils";

export class AdminForm {
    constructor(player) {
        this.player = player;
        this.show();
    }

    show() {
        const form = new CustomForm(this.player, MenuForm.title);
        for (const optionId of AdminOptions.getOptionIds())
            AdminOptions.get(optionId).addControlTo(form, this.player);
        FormUtils.tryShow(form);
    }
}
