import { structureCollection } from './StructureCollection';
import { MenuForm } from '../classes/MenuForm';
import { InstanceEditOptions } from './InstanceEditOptions';
import { InstanceEditFormBuilder } from './InstanceEditFormBuilder';

export class InstanceEditForm {
    instanceName;
    #buttons = {
        isEnabled: [
            InstanceEditOptions.NextLayer,
            InstanceEditOptions.PreviousLayer,
            InstanceEditOptions.SetLayer,
            InstanceEditOptions.Move,
            InstanceEditOptions.Statistics,
            InstanceEditOptions.RenameInstance,
            InstanceEditOptions.DisableInstance,
        ],
        isNotEnabledAndIsNotPlaced: [
            InstanceEditOptions.PlaceInstance,
            InstanceEditOptions.RenameInstance
        ],
        isNotEnabledButIsPlaced: [
            InstanceEditOptions.EnableInstance,
            InstanceEditOptions.RenameInstance
        ],
        common: [
            InstanceEditOptions.DeleteInstance,
            InstanceEditOptions.MainMenu
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
        InstanceEditFormBuilder.buildInstance(this.instance, currentOptions).show(this.player).then((response) => {
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
                option !== InstanceEditOptions.SetLayer
                && option !== InstanceEditOptions.NextLayer
                && option !== InstanceEditOptions.PreviousLayer
            );
        return currentOptions;
    }

    handleOption(option) {
        switch (option) {
            case InstanceEditOptions.EnableInstance:
                this.instance.enable();
                break;
            case InstanceEditOptions.DisableInstance:
                this.instance.disable();
                break;
            case InstanceEditOptions.PlaceInstance:
                this.instance.place(this.player.dimension.id, this.player.location);
                break;
            case InstanceEditOptions.RenameInstance:
                this.renameInstanceForm();
                break;
            case InstanceEditOptions.DeleteInstance:
                structureCollection.delete(this.instanceName);
                break;
            case InstanceEditOptions.NextLayer:
                this.instance.increaseLayer();
                new InstanceEditForm(this.player, this.instanceName);
                break;
            case InstanceEditOptions.PreviousLayer:
                this.instance.decreaseLayer();
                new InstanceEditForm(this.player, this.instanceName);
                break;
            case InstanceEditOptions.SetLayer:
                this.setLayerForm();
                break;
            case InstanceEditOptions.Move:
                this.instance.move(this.player.dimension.id, this.player.location);
                break;
            case InstanceEditOptions.Statistics:
                this.statisticsForm();
                break;
            case InstanceEditOptions.MainMenu:
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
            const selectedLayer = response.formValues[0];
            this.instance.setLayer(parseInt(selectedLayer));
        });
    }

    async statisticsForm() {
        const form = await InstanceEditFormBuilder.buildStatistics(this.instance)
        form.show(this.player);
    }
}