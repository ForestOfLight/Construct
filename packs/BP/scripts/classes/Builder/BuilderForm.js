import { BuilderFormBuilder } from "./BuilderFormBuilder";
import { BuilderOptions } from "./BuilderOptions";
import { forceShow } from '../../utils';

export class BuilderForm {
    constructor(player) {
        this.player = player;
        this.show();
    }

    show() {
        forceShow(this.player, BuilderFormBuilder.buildBuilderOptions(this.player)).then((response) => {
            if (response.canceled) return;
            this.applySettings(response.formValues);
        });
    }

    applySettings(formValues) {
        const optionIds = BuilderOptions.getOptionIds();
        for (let i = 0; i < optionIds.length; i++) {
            // An option announces its own change, and says nothing when the
            // submitted value matches the one already stored.
            const message = BuilderOptions.get(optionIds[i]).applyFormValue(this.player.id, formValues[i]);
            if (message)
                this.player.sendMessage(message);
        }
    }
}