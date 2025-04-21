import { ActionFormData } from "@minecraft/server-ui";
import { MenuFormBuilder } from "../MenuFormBuilder";
import { structureCollection } from "../Structure/StructureCollection";
import { Builders } from "../Builder/Builders";

export class MaterialsFormBuilder {
    static menuTitle = MenuFormBuilder.menuTitle + ' Material Grabber';

    static buildInstanceSelector(player) {
        const allInstanceNameForm = new ActionFormData()
            .title(this.menuTitle);
        const currInstanceName = Builders.get(player.id).materialInstanceName;
        let body = '§7Current instance: ';
        if (currInstanceName)
            body += `§2${currInstanceName}`;
        else
            body += '§7None';
        body += '\n§7Select an instance:';
        allInstanceNameForm.body(body);
        structureCollection.getInstanceNames().forEach(instanceName => {
            allInstanceNameForm.button(`§2${instanceName}`);
        });
        return allInstanceNameForm;
    }
}