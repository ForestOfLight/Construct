import { MaterialGrabberFormBuilder } from './MaterialGrabberFormBuilder';
import { forceShow } from '../../utils';
import { Builders } from '../Builder/Builders';
import { instanceCollection } from '../Instance/InstanceCollection';

export class MaterialGrabberForm {
    constructor(player) {
        this.player = player;
        this.show();
    }

    show() {
        try {
            const instanceNames = instanceCollection.getInstanceNamesSortedByEnabled();
            return forceShow(this.player, MaterialGrabberFormBuilder.buildInstanceSelector(this.player, instanceNames)).then((response) => {
                if (response.canceled)
                    return;
                const selectedInstanceName = instanceNames[response.selection];
                if (selectedInstanceName) {
                    this.setActiveInstance(selectedInstanceName);
                    this.player.sendMessage({ translate: 'construct.materials.grabber.menu.success', with: [selectedInstanceName] });
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