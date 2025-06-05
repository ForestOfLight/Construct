import { forceShow } from '../utils';
import { structureCollection } from './Structure/StructureCollection';
import { MenuFormBuilder } from './MenuFormBuilder';
import { InstanceForm } from './Instance/InstanceForm';
import { BuilderForm } from './Builder/BuilderForm';

export class MenuForm {
    constructor(player, { jumpToInstance = false, instanceName = void 0 } = {}) {
        this.player = player;
        this.show(jumpToInstance, instanceName);
    }

    async show(jumpToInstance = false, instanceName = void 0) {
        if (jumpToInstance) {
            if (!instanceName)
                instanceName = structureCollection.getStructure(this.player.dimension.id, this.player.location, { useActiveLayer: false })?.getName();
            if (instanceName) {
                new InstanceForm(this.player, instanceName);
                return;
            }
        }
        instanceName = await this.getInstanceNameFromForm();
        if (!instanceName)
            return;
        new InstanceForm(this.player, instanceName);
    }

    async getInstanceNameFromForm() {
        try {
            return forceShow(this.player, MenuFormBuilder.buildAllInstanceName()).then((response) => {
                if (response.canceled)
                    return;
                let selection = response.selection;
                if (selection === 0) {
                    new BuilderForm(this.player);
                    return void 0;
                } else {
                    selection--;
                    const selectedInstanceName = structureCollection.getInstanceNames()[selection];
                    return selectedInstanceName || this.createNewInstance();
                }
            });
        } catch (e) {
            if (e.message === 'Menu timed out.') {
                this.player.sendMessage('§8Menu timed out.');
                return;
            }
            throw e;
        }
    }

    async createNewInstance() {
        return MenuFormBuilder.buildNewInstance().show(this.player).then(async (response) => {
            if (response.canceled)
                return;
            const instanceName = response.formValues[0];
            if (instanceName === '')
                return void 0;
            const structureId = await this.getStructureId();
            if (!structureId)
                return;
            try {
                structureCollection.add(instanceName, structureId);
            } catch (e) {
                if (e.name === 'InvalidInstanceError') {
                    this.player.sendMessage(`§cInstance '${instanceName}' already exists. Try again with a new name.`);
                    return void 0;
                }
            }
            return instanceName;
        });
    }

    async getStructureId() {
        return MenuFormBuilder.buildAllStructures().show(this.player).then((response) => {
            if (response.canceled)
                return;
            if (response.selection === structureCollection.getWorldStructureIds().length + 1) {
                MenuFormBuilder.buildHowTo().show(this.player);
                return;
            }
            const selectedStructureId = structureCollection.getWorldStructureIds()[response.selection];
            return selectedStructureId || this.getOtherStructureId();
        });
    }

    getOtherStructureId() {
        return MenuFormBuilder.buildOtherStructure().show(this.player).then((response) => {
            if (response.canceled)
                return;
            const structureId = response.formValues[0];
            if (structureId === '')
                return void 0;
            if (!structureCollection.getWorldStructureIds().includes(structureId)) {
                this.player.sendMessage(`§cStructure ID '${structureId}' not found. If you're looking for a structure that you put in the structures folder, please restart your world and try again.`);
                return void 0;
            }
            return structureId;
        });
    }
}