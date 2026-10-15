import { CustomForm, ObservableBoolean, ObservableNumber, ObservableString } from "@minecraft/server-ui";
import { RENDER_MODE_LABELS, RENDER_MODE_ORDER, RenderMode } from "../../Enums/RenderMode";
import { FormUtils } from "../../Menu/FormUtils";
import { RefreshRate } from "../../Verifier/RefreshRate";
import { MenuForm } from "../../Menu/MenuForm";
import { InstanceForm } from "./InstanceForm";
import { instanceCollection } from "../InstanceCollection";

export class InstanceSettingsForm {
    constructor(player, instance) {
        this.player = player;
        this.instance = instance;
        this.show();
    }

    show() {
        const instanceName = new ObservableString(this.instance.getName(), { clientWritable: true });
        const validation = new ObservableBoolean(this.instance.options.verifier.isEnabled, { clientWritable: true });
        const renderMode = new ObservableNumber(Math.max(RENDER_MODE_ORDER.indexOf(this.instance.options.renderMode), 0), { clientWritable: true });
        const refreshRate = new ObservableNumber(this.instance.options.verifier.refreshSeconds, { clientWritable: true });
        instanceName.subscribe(newName => this.#renameInstance(newName));
        validation.subscribe(enabled => this.instance.setVerifierEnabled(enabled));
        renderMode.subscribe(index => this.instance.setRenderMode(RENDER_MODE_ORDER[index] ?? RenderMode.Default));
        refreshRate.subscribe(value => this.instance.setVerifierRefreshSeconds(parseInt(value)));
        const renderModeItems = RENDER_MODE_ORDER.map((mode, index) => ({
            label: { translate: RENDER_MODE_LABELS[mode] },
            description: { translate: `${RENDER_MODE_LABELS[mode]}.description` },
            value: index
        }));

        const form = new CustomForm(this.player, MenuForm.title);
        form.textField({ translate: 'construct.instance.menu.rename' }, instanceName);
        form.toggle({ translate: 'construct.instance.option.validation' }, validation, { description: { translate: 'construct.instance.option.validation.description' } });
        form.dropdown({ translate: 'construct.instance.option.rendermode' }, renderMode, renderModeItems, { description: { translate: 'construct.instance.option.rendermode.description' } });
        form.slider({ translate: 'construct.instance.option.refreshrate' }, refreshRate, RefreshRate.MIN_SECONDS, RefreshRate.MAX_SECONDS, { step: RefreshRate.SECONDS_STEP, description: { translate: 'construct.instance.option.refreshrate.description' } });
        form.spacer();
        form.button('<<', () => {
            form.close();
            new InstanceForm(this.player, this.instance.getName())
        });
        FormUtils.tryShow(form);
    }

    #renameInstance(newName) {
        if (newName === '') {
            this.player.sendMessage({ translate: 'construct.menu.instance.nameEmpty' });
            return;
        }
        try {
            instanceCollection.rename(this.instance.getName(), newName);
        } catch (e) {
            this.player.sendMessage({ translate: 'construct.instance.rename.error', with: [e.message] });
        }
    }
}