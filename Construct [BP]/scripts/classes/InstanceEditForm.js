import { structureCollection } from './StructureCollection';
import { MenuForm } from './MenuForm';
import { forceShow } from '../utils';
import { InstanceEditButtons } from './enums/InstanceEditButtons';
import { InstanceEditFormBuilder } from './InstanceEditFormBuilder';
import { FormCancelationReason } from '@minecraft/server-ui';

export class InstanceEditForm {
    instanceName;
    #buttons = {
        isEnabled: [
            InstanceEditButtons.NextLayer,
            InstanceEditButtons.PreviousLayer,
            InstanceEditButtons.SetLayer,
            InstanceEditButtons.Move,
            InstanceEditButtons.Statistics,
            InstanceEditButtons.Settings,
            InstanceEditButtons.Rename,
            InstanceEditButtons.Disable,
        ],
        isNotEnabledAndIsNotPlaced: [
            InstanceEditButtons.Place,
            InstanceEditButtons.Rename
        ],
        isNotEnabledButIsPlaced: [
            InstanceEditButtons.Enable,
            InstanceEditButtons.Rename
        ],
        common: [
            InstanceEditButtons.Delete,
            InstanceEditButtons.MainMenu
        ]
    }

    constructor(player, instanceName) {
        this.player = player;
        this.instanceName = instanceName;
        this.instance = structureCollection.get(this.instanceName);
        this.show();
    }

    show() {
        const currentOptions = this.getActiveOptions();
        forceShow(this.player, InstanceEditFormBuilder.buildInstance(this.instance, currentOptions)).then((response) => {
            if (response.canceled) return;
            this.handleOption(currentOptions[response.selection]);
        });
    }

    getActiveOptions() {
        let currentOptions = [];
        if (this.instance.isEnabled())
            currentOptions = this.#buttons.isEnabled;
        else if (this.instance.hasLocation())
            currentOptions = this.#buttons.isNotEnabledButIsPlaced;
        else
            currentOptions = this.#buttons.isNotEnabledAndIsNotPlaced;
        currentOptions = currentOptions.concat(this.#buttons.common);

        if (!this.instance.hasLayers())
            currentOptions = currentOptions.filter(option => 
                option !== InstanceEditButtons.SetLayer
                && option !== InstanceEditButtons.NextLayer
                && option !== InstanceEditButtons.PreviousLayer
            );
        return currentOptions;
    }

    handleOption(option) {
        switch (option) {
            case InstanceEditButtons.Enable:
                this.instance.enable();
                break;
            case InstanceEditButtons.Disable:
                this.instance.disable();
                break;
            case InstanceEditButtons.Place:
                this.instance.place(this.player.dimension.id, this.player.location);
                break;
            case InstanceEditButtons.Rename:
                this.renameInstanceForm();
                break;
            case InstanceEditButtons.Delete:
                structureCollection.delete(this.instanceName);
                break;
            case InstanceEditButtons.NextLayer:
                this.instance.increaseLayer();
                new InstanceEditForm(this.player, this.instanceName);
                break;
            case InstanceEditButtons.PreviousLayer:
                this.instance.decreaseLayer();
                new InstanceEditForm(this.player, this.instanceName);
                break;
            case InstanceEditButtons.Settings:
                this.settingsForm();
                break;
            case InstanceEditButtons.Move:
                this.instance.move(this.player.dimension.id, this.player.location);
                break;
            case InstanceEditButtons.Statistics:
                this.statisticsForm();
                break;
            case InstanceEditButtons.MainMenu:
                new MenuForm(this.player, { jumpToInstance: false });
                break;
            default:
                this.player.sendMessage(`§cUnknown option: ${option}`);
                break;
        }
    }

    renameInstanceForm() {
        InstanceEditFormBuilder.buildRenameInstance(this.instanceName).show(this.player).then((response) => {
            if (response.canceled)
                return;
            const newName = response.formValues[0];
            if (newName === '') {
                this.player.sendMessage('§cInstance name cannot be empty.');
                return;
            }
            try {
                structureCollection.rename(this.instanceName, newName);
                this.instanceName = newName;
            } catch (e) {
                this.player.sendMessage(`§cError renaming instance: ${e.message}`);
                return;
            }
        });
    }

    setLayerForm() {
        InstanceEditFormBuilder.buildSetLayer(this.instance.getBounds().max.y, this.instance.getLayer()).show(this.player).then((response) => {
            if (response.canceled)
                return;
            this.instance.setLayer(parseInt(response.formValues[0]));
        });
    }

    async statisticsForm() {
        const statsForm = await InstanceEditFormBuilder.buildStatistics(this.instance)
        statsForm.form.show(this.player).then((response) => {
            if (response.canceled && response.cancelationReason === FormCancelationReason.UserBusy)
                this.player.sendMessage(statsForm.stats);
        });
    }

    settingsForm() {
        InstanceEditFormBuilder.buildSettings(this.instance).show(this.player).then((response) => {
            if (response.canceled)
                return;
            this.instance.setVerifierEnabled(response.formValues[0]);
            this.instance.setLayer(parseInt(response.formValues[1]));
        });
    }
}