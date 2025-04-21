import { MaterialsFormBuilder } from './MaterialsFormBuilder';
import { forceShow } from '../../utils';
import { Builders } from '../Builder/Builders';

export class MaterialsForm {
    constructor(player) {
        this.player = player;
        this.show();
    }

    show() {
        try {
            return forceShow(this.player, MaterialsFormBuilder.buildInstanceSelector()).then((response) => {
                if (response.canceled)
                    return;
                let selection = response.selection;
                const selectedInstanceName = structureCollection.getInstanceNames()[selection];
                if (selectedInstanceName) {
                    this.setActiveInstance(selectedInstanceName);
                    this.player.sendMessage(`§8Selected instance for material grabber: §2${selectedInstanceName}`);
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