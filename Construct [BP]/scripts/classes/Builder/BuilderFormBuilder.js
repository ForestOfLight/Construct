import { ModalFormData } from "@minecraft/server-ui";
import { MenuFormBuilder } from "../MenuFormBuilder";
import { BuilderOptions } from "./BuilderOptions";

export class BuilderFormBuilder {
    static buildBuilderOptions(player) {
        const form = new ModalFormData()
            .title(MenuFormBuilder.menuTitle);
        for (const optionId of BuilderOptions.getOptionIds()) {
            const option = BuilderOptions.get(optionId);
            form.toggle(`${option.displayName} - ${option.description}`, option.isEnabled(player.id));
        }
        form.submitButton('§2Apply');
        return form;
    }
}