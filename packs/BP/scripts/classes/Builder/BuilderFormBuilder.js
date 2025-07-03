import { ModalFormData } from "@minecraft/server-ui";
import { MenuFormBuilder } from "../MenuFormBuilder";
import { BuilderOptions } from "./BuilderOptions";

export class BuilderFormBuilder {
    static buildBuilderOptions(player) {
        const form = new ModalFormData()
            .title(MenuFormBuilder.menuTitle);
        for (const optionId of BuilderOptions.getOptionIds()) {
            const option = BuilderOptions.get(optionId);
            form.toggle(`${option.displayName}`, { defaultValue: option.isEnabled(player.id), tooltip: option.description });
        }
        form.submitButton('§2Apply');
        return form;
    }
}