import { BuilderOptions } from "./BuilderOptions";
import { CustomForm } from "@minecraft/server-ui";
import { MenuForm } from "../Menu/MenuForm";
import { FormUtils } from "../Menu/FormUtils";

export class BuilderForm {
    constructor(player) {
        this.player = player;
        this.show();
    }

    show() {
        const form = new CustomForm(this.player, MenuForm.title);
        for (const optionId of BuilderOptions.getOptionIds())
            BuilderOptions.get(optionId).addControlTo(form, this.player);
        form.spacer();
        form.button({ text: '<<' }, () => {
            form.close();
            new MenuForm(this.player)
        });
        FormUtils.tryShow(form);
    }
}