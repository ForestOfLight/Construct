import { forceShow } from '../utils';
import { structureCollection } from './Structure/StructureCollection';
import { MenuFormBuilder } from './MenuFormBuilder';
import { InstanceForm } from './Instance/InstanceForm';
import { BuilderForm } from './Builder/BuilderForm';
import { InstanceExistsError } from './Errors/InstanceExistsError';
import { StructureNotFoundError } from './Errors/StructureNotFoundError';

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
                    return void 0;
                let selection = response.selection;
                if (selection === 0) {
                    new BuilderForm(this.player);
                    return void 0;
                } else if (selection == structureCollection.getInstanceNames().length + 2) {
                    MenuFormBuilder.buildHowTo().show(this.player);
                    return void 0;
                } else {
                    selection--;
                    const selectedInstanceName = structureCollection.getInstanceNames()[selection];
                    return selectedInstanceName || this.createNewInstance();
                }
            });
        } catch (error) {
            if (error.message === 'Menu timed out.') {
                this.player.sendMessage({ translate: 'construct.menu.open.timeout' });
                return void 0;
            }
            throw error;
        }
    }

    async createNewInstance() {
        return MenuFormBuilder.buildNewInstance().show(this.player).then(async (response) => {
            if (response.canceled)
                return void 0;
            const instanceName = response.formValues[0];
            if (instanceName === '')
                return void 0;
            const structureId = await this.getStructureId();
            if (!structureId)
                return void 0;
            try {
                structureCollection.add(instanceName, structureId);
            } catch (error) {
                if (error instanceof InstanceExistsError || error instanceof StructureNotFoundError) {
                    error.sendTo(this.player);
                    return void 0;
                }
                throw error;
            }
            return instanceName;
        });
    }

    async getStructureId() {
        return MenuFormBuilder.buildAllStructures().show(this.player).then((response) => {
            if (response.canceled)
                return void 0;
            const selectedStructureId = structureCollection.getWorldStructureIds()[response.selection];
            return selectedStructureId || this.getOtherStructureId();
        });
    }

    getOtherStructureId() {
        return MenuFormBuilder.buildOtherStructure().show(this.player).then((response) => {
            if (response.canceled)
                return void 0;
            const structureId = response.formValues[0];
            if (structureId === '')
                return void 0;
            return structureId;
        });
    }
}