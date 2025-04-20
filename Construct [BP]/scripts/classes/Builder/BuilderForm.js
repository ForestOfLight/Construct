import { BuilderFormBuilder } from "./BuilderFormBuilder";
import { Builders } from "./Builders";

export class BuilderForm {
    constructor(player) {
        this.player = player;
    }

    show() {
        forceShow(this.player, BuilderFormBuilder.buildSettings(this.player)).then((response) => {
            if (response.canceled) return;
            this.applySettings(response.formValues);
        });
    }

    applySettings(formValues) {
        const optionIds = Builders.get(this.player.id).getOptionIds();
        for (let i = 0; i < optionIds.length; i++) {
            const option = optionIds[i];
            if (option.setValue(formValues[i]) && formValues[i] === true)
                this.player.sendMessage(`§a${option.displayName} is enabled!§7 ${option.howToUse}`);
        }
    }
}