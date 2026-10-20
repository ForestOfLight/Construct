import { Builders } from '../Builder/Builders';
import { instanceCollection } from '../Instance/InstanceCollection';
import { CustomForm } from '@minecraft/server-ui';
import { MenuForm } from '../Menu/MenuForm';
import { FormUtils } from '../Menu/FormUtils';

export class MaterialGrabberForm {
    static title = { rawtext: [MenuForm.title, { translate: 'construct.materials.grabber.menu.title' }] };
    
    constructor(player) {
        this.player = player;
        this.show();
    }

    show() {
        const instanceNames = instanceCollection.getInstanceNamesSortedByEnabled();

        const form = new CustomForm(this.player, MaterialGrabberForm.title);
        const currInstanceName = Builders.get(this.player.id).materialInstanceName;
        const labelText = { rawtext: [{ translate: 'construct.materials.grabber.menu.header' }] };
        if (currInstanceName)
            labelText.rawtext.push({ text: `§2${currInstanceName}` });
        else
            labelText.rawtext.push({ translate: 'construct.materials.grabber.menu.noinstance' });
        labelText.rawtext.push({ text: '\n' });
        labelText.rawtext.push({ translate: 'construct.materials.grabber.menu.selectinstance' });
        form.label(labelText);
        form.spacer();
        FormUtils.buildPaginatedListWithFilter(form, instanceNames, (instanceName) => {
            form.close();
            this.setActiveInstance(instanceName);
            this.player.sendMessage({ translate: 'construct.materials.grabber.menu.success', with: [instanceName] });
        }, 'Filter', { getImage: instanceName => FormUtils.getEnabledImage(instanceCollection.get(instanceName).isEnabled()) });
        FormUtils.tryShow(form);
    }

    setActiveInstance(instanceName) {
        const builder = Builders.get(this.player.id);
        builder.materialInstanceName = instanceName;
    }
}