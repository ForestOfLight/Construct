import { structureCollection } from './StructureCollection';
import { MenuForm } from '../classes/MenuForm';
import { ActionFormData } from '@minecraft/server-ui';
import { InstanceEditOptions } from './InstanceEditOptions';

export class InstanceEditForm {
    instanceName;
    options = {
        isPlaced: [
            InstanceEditOptions.NextLayer,
            InstanceEditOptions.PreviousLayer,
            InstanceEditOptions.SetLayer,
            InstanceEditOptions.Move,
            InstanceEditOptions.Rotate,
            InstanceEditOptions.Mirror,
            InstanceEditOptions.RemovePlacement,
        ],
        notPlaced: [
            InstanceEditOptions.PlaceInstance
        ],
        common: [
            InstanceEditOptions.MaterialsList,
            InstanceEditOptions.RenameInstance,
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
        const form = this.buildInstanceForm();
        form.show(this.player).then((response) => {
            if (response.canceled) return;
            let selectedOption;
            if (this.instance.isPlaced())
                selectedOption = this.options.isPlaced[response.selection] || this.options.common[response.selection-this.options.isPlaced.length];
            else
                selectedOption = this.options.notPlaced[response.selection] || this.options.common[response.selection-this.options.notPlaced.length];
            this.handleOption(selectedOption);
        });
    }

    buildInstanceForm() {
        const instanceOptions = this.instance.isPlaced() ? this.options.isPlaced : this.options.notPlaced;
        const form = new ActionFormData()
            .title('§l§2StrucTool §8Menu')
            .body(`Instance: §2${this.instanceName}`)
        instanceOptions.forEach(option => {
            form.button(`${option}`);
        });
        this.options.common.forEach(option => {
            form.button(`${option}`);
        });
        return form;
    }

    handleOption(option) {
        switch (option) {
            case InstanceEditOptions.PlaceInstance:
                this.instance.place(this.player.dimension.id, this.player.location);
                break;
            case InstanceEditOptions.RemovePlacement:
                this.instance.removePlacement();
                break;
            case InstanceEditOptions.RenameInstance:
                this.renameInstanceForm();
                break;
            case InstanceEditOptions.DeleteInstance:
                this.structureCollection.remove(this.instanceName);
                break;
            case InstanceEditOptions.NextLayer:
                this.instance.setLayer(this.instance.getLayer() + 1);
                new InstanceEditForm(this.player, this.instanceName);
                break;
            case InstanceEditOptions.PreviousLayer:
                this.instance.setLayer(this.instance.getLayer() - 1);
                new InstanceEditForm(this.player, this.instanceName);
                break;
            case InstanceEditOptions.SetLayer:
                this.setLayerForm();
                break;
            case InstanceEditOptions.Rotate:
                this.player.sendMessage('§cRotating not implemented yet.');
                break;
            case InstanceEditOptions.Mirror:
                this.player.sendMessage('§cMirroring not implemented yet.');
                break;
            case InstanceEditOptions.Move:
                this.instance.move(this.player.dimension.id, this.player.location);
                break;
            case InstanceEditOptions.MaterialsList:
                this.player.sendMessage('§cMaterial list not implemented yet.');
                break;
            case InstanceEditOptions.MainMenu:
                new MenuForm(this.player);
                break;
            default:
                this.player.sendMessage(`§cUnknown option: ${option}`);
                break;
        }
    }

    renameInstanceForm() {

    }

    setLayerForm() {
        // should have a toggle for if it should layer the structure or notw
    }
}