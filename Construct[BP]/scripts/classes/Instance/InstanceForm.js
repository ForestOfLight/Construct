import { structureCollection } from '../Structure/StructureCollection';
import { MenuForm } from '../MenuForm';
import { forceShow } from '../../utils';
import { InstanceButtons } from '../Enums/InstanceButtons';
import { InstanceFormBuilder } from './InstanceFormBuilder';
import { FormCancelationReason } from '@minecraft/server-ui';

export class InstanceForm {
    instanceName;
    #buttons = {
        isEnabled: [
            InstanceButtons.NextLayer,
            InstanceButtons.PreviousLayer,
            InstanceButtons.Move,
            InstanceButtons.Statistics,
            InstanceButtons.Settings,
            InstanceButtons.Rename,
            InstanceButtons.Disable
        ],
        isNotEnabledAndIsNotPlaced: [
            InstanceButtons.Place,
            InstanceButtons.Rename
        ],
        isNotEnabledButIsPlaced: [
            InstanceButtons.Enable,
            InstanceButtons.Rename
        ],
        common: [
            InstanceButtons.Delete,
            InstanceButtons.MainMenu
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
        forceShow(this.player, InstanceFormBuilder.buildInstance(this.instance, currentOptions)).then((response) => {
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
                option !== InstanceButtons.SetLayer
                && option !== InstanceButtons.NextLayer
                && option !== InstanceButtons.PreviousLayer
            );
        return currentOptions;
    }

    handleOption(option) {
        switch (option) {
            case InstanceButtons.Enable:
                this.instance.enable();
                break;
            case InstanceButtons.Disable:
                this.instance.disable();
                break;
            case InstanceButtons.Place:
                this.instance.place(this.player.dimension.id, this.player.location);
                break;
            case InstanceButtons.Rename:
                this.renameInstanceForm();
                break;
            case InstanceButtons.Delete:
                structureCollection.delete(this.instanceName);
                break;
            case InstanceButtons.NextLayer:
                this.instance.increaseLayer();
                new InstanceForm(this.player, this.instanceName);
                break;
            case InstanceButtons.PreviousLayer:
                this.instance.decreaseLayer();
                new InstanceForm(this.player, this.instanceName);
                break;
            case InstanceButtons.Settings:
                this.settingsForm();
                break;
            case InstanceButtons.Move:
                this.instance.move(this.player.dimension.id, this.player.location);
                break;
            case InstanceButtons.Statistics:
                this.statisticsForm();
                break;
            case InstanceButtons.MainMenu:
                new MenuForm(this.player, { jumpToInstance: false });
                break;
            default:
                this.player.sendMessage(`§cUnknown option: ${option}`);
                break;
        }
    }

    renameInstanceForm() {
        InstanceFormBuilder.buildRenameInstance(this.instanceName).show(this.player).then((response) => {
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
        InstanceFormBuilder.buildSetLayer(this.instance.getBounds().max.y, this.instance.getLayer()).show(this.player).then((response) => {
            if (response.canceled)
                return;
            this.instance.setLayer(parseInt(response.formValues[0]));
        });
    }

    async statisticsForm() {
        let statsForm;
        try {
            statsForm = await InstanceFormBuilder.buildStatistics(this.instance);
        } catch (e) {
            if (e.message === 'StructureVerifier is already running.') {
                this.player.sendMessage('§cA verification is already in progress. Please wait until it finishes.');
                return;
            }
        }
        statsForm.form.show(this.player).then((response) => {
            if (response.canceled && response.cancelationReason === FormCancelationReason.UserBusy)
                this.player.sendMessage(statsForm.stats);
        });
    }

    settingsForm() {
        InstanceFormBuilder.buildSettings(this.instance).show(this.player).then((response) => {
            if (response.canceled)
                return;
            this.instance.setVerifierEnabled(response.formValues[0]);
            if (response.formValues[1])
                this.instance.setVerifierDistance(5);
            else
                this.instance.setVerifierDistance(0);
            this.instance.setLayer(parseInt(response.formValues[3]));
        });
    }
}