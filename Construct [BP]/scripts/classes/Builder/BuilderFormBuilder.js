import { ModalFormData } from "@minecraft/server-ui";
import { MenuFormBuilder } from "../MenuFormBuilder";
import { Builders } from "./Builders";

export class BuilderFormBuilder {
    static buildSettings(player) {
        const form = new ModalFormData()
            .title(MenuFormBuilder.menuTitle);
        const builder = Builders.get(player.id);
        for (const optionId of builder.getOptionIds()) {
            const option = builder.getOption(optionId);
            form.toggle(`${option.displayName} - ${option.description}`, option.getValue());
        }
    }
}