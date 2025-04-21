import { MaterialsFormBuilder } from './MaterialsFormBuilder';
import { forceShow } from '../../utils';
import { Builders } from '../Builder/Builders';
import { structureCollection } from '../Structure/StructureCollection';

export class MaterialsForm {
    constructor(player) {
        this.player = player;
        this.show();
    }

    show() {
        try {
            return forceShow(this.player, MaterialsFormBuilder.buildInstanceSelector(this.player)).then((response) => {
                if (response.canceled)
                    return;
                const selectedInstanceName = structureCollection.getInstanceNames()[response.selection];
                if (selectedInstanceName) {
                    this.setActiveInstance(selectedInstanceName);
                    this.player.sendMessage(`§7Selected instance for material grabber: §2${selectedInstanceName}`);
                    return;
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

    setActiveInstance(instanceName) {
        const builder = Builders.get(this.player.id);
        builder.materialInstanceName = instanceName;
    }
}