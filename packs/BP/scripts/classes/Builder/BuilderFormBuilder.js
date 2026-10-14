import { ModalFormData } from "@minecraft/server-ui";
import { MenuForm } from "../Menu/MenuForm";
import { BuilderOptions } from "./BuilderOptions";

export class BuilderFormBuilder {
    static buildBuilderOptions(player) {
        const form = new ModalFormData()
            .title(MenuForm.title);
        for (const optionId of BuilderOptions.getOptionIds())
            BuilderOptions.get(optionId).addControlTo(form, player.id);
        form.submitButton({ translate: "construct.menu.submit" });
        return form;
    }
}