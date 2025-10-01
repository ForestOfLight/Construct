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
            const option = BuilderOptions.get(optionIds[i]);
            const changedToValue = option.setValue(this.player.id, formValues[i]);
            if (changedToValue === true) {
                this.player.sendMessage({ rawtext: [
                    { text: `§a` },
                    option.displayName,
                    { translate: 'construct.option.enabled' },
                    { text: `§7 ` },
                    { translate: option.howToUse }
                ]});
            } else if (changedToValue === false) {
                this.player.sendMessage({ rawtext: [
                    { text: `§c` },
                    option.displayName,
                    { translate: 'construct.option.disabled' }
                ]});
            }
        }
    }

    valueChangedToEnabled(hasChanged, newValue) {
        return hasChanged && newValue === true;
    }

    valueChangedToDisabled(hasChanged, newValue) {
        return hasChanged && newValue === false;
    }
}