import { forceShow } from '../utils';
import { structureCollection } from './StructureCollection';
import { MenuFormBuilder } from './MenuFormBuilder';
import { InstanceEditForm } from './InstanceEditForm';

export class MenuForm {
    constructor(player, { jumpToInstance = true } = {}) {
        this.player = player;
        this.show(jumpToInstance);
    }

    async show(jumpToInstance = true) {
        let instanceName;
        if (jumpToInstance) {
            instanceName = this.getInstanceNameAtLocation();
            if (instanceName) {
                new InstanceEditForm(this.player, instanceName);
                return;
            }
        }
        instanceName = await this.getInstanceNameFromForm();
        if (!instanceName)
            return;
        new InstanceEditForm(this.player, instanceName);
    }

    getInstanceNameAtLocation() {
        const locatedStructures = structureCollection.getStructures(this.player.dimension.id, this.player.location, { useLayers: false });
        if (locatedStructures.length === 0)
            return void 0;
        const structure = locatedStructures[0];
        return structure.name;
    }

    async getInstanceNameFromForm() {
        try {
            return forceShow(this.player, MenuFormBuilder.buildAllInstanceName()).then((response) => {
                if (response.canceled) return;
                const selectedInstanceName = structureCollection.getInstanceNames()[response.selection];
                return selectedInstanceName || this.createNewInstance();
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
            structureCollection.add(instanceName, structureId);
            return instanceName;
        });
    }

    async getStructureId() {
        return MenuFormBuilder.buildAllStructures().show(this.player).then((response) => {
            if (response.canceled)
                return;
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
            return structureId;
        });
    }
}