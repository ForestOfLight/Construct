import { ModalFormData } from "@minecraft/server-ui";
import { MenuFormBuilder } from "../MenuFormBuilder";
import { BuilderOptions } from "./BuilderOptions";

export class BuilderFormBuilder {
    static buildBuilderOptions(player) {
        const form = new ModalFormData()
            .title(MenuFormBuilder.menuTitle);
        for (const optionId of BuilderOptions.getOptionIds())
            BuilderOptions.get(optionId).addControlTo(form, player.id);
        form.submitButton({ translate: "construct.menu.submit" });
        return form;
    }
}