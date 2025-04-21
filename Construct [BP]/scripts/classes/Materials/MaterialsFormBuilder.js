import { MenuFormBuilder } from "../MenuFormBuilder";

export class InstanceFormBuilder {
    menuTitle = MenuFormBuilder.menuTitle + ' Material Grabber';

    static buildInstanceSelector() {
        const allInstanceNameForm = new ActionFormData()
            .title(this.menuTitle)
            .body('Select an instance:');
        structureCollection.getInstanceNames().forEach(instanceName => {
            allInstanceNameForm.button(`§2${instanceName}`);
        });
        return allInstanceNameForm;
    }
}