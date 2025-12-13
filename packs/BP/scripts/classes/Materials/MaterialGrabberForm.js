import { MaterialGrabberFormBuilder } from './MaterialGrabberFormBuilder';
import { forceShow } from '../../utils';
import { Builders } from '../Builder/Builders';
import { structureCollection } from '../Structure/StructureCollection';

export class MaterialGrabberForm {
    constructor(player) {
        this.player = player;
        this.show();
    }

    show() {
        try {
            return forceShow(this.player, MaterialGrabberFormBuilder.buildInstanceSelector(this.player)).then((response) => {
                if (response.canceled)
                    return;
                const selectedInstanceName = structureCollection.getInstanceNames()[response.selection];
                if (selectedInstanceName) {
                    this.setActiveInstance(selectedInstanceName);
                    this.player.sendMessage({ translate: 'construct.materials.grabber.menu.success' });
                    return;
                }
            });
        } catch (e) {
            if (e.message === 'Menu timed out.') {
                this.player.sendMessage({ translate: 'construct.menu.open.timeout' });
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