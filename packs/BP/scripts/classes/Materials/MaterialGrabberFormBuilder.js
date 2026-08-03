import { ActionFormData } from "@minecraft/server-ui";
import { MenuFormBuilder } from "../MenuFormBuilder";
import { instanceCollection } from "../Instance/InstanceCollection";
import { Builders } from "../Builder/Builders";

export class MaterialGrabberFormBuilder {
    static menuTitle = { rawtext: [MenuFormBuilder.menuTitle, { translate: 'construct.materials.grabber.menu.title' }] };

    static buildInstanceSelector(player) {
        const allInstanceNameForm = new ActionFormData()
            .title(this.menuTitle);
        const currInstanceName = Builders.get(player.id).materialInstanceName;
        const body = { rawtext: [{ translate: 'construct.materials.grabber.menu.header' }] };
        if (currInstanceName)
            body.rawtext.push({ text: `§2${currInstanceName}` });
        else
            body.rawtext.push({ translate: 'construct.materials.grabber.menu.noinstance' });
        body.rawtext.push({ text: '\n' });
        body.rawtext.push({ translate: 'construct.materials.grabber.menu.selectinstance' });
        allInstanceNameForm.body(body);
        MenuFormBuilder.addInstanceButtons(allInstanceNameForm);
        return allInstanceNameForm;
    }
}