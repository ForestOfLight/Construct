import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { structureCollection } from './StructureCollection';

export class MenuFormBuilder {
    static menuTitle = '§l§2StrucTool §8Menu';

    static buildAllInstanceNameForm() {
        const allInstanceNameForm = new ActionFormData()
            .title(this.menuTitle)
            .body('Select an instance:');
        structureCollection.getInstanceNames().forEach(instanceName => {
            allInstanceNameForm.button(`§2${instanceName}`);
        });
        allInstanceNameForm.button('Create New Instance');
        return allInstanceNameForm;
    }

    static buildNewInstanceForm() {
        return new ModalFormData()
            .title(this.menuTitle)
            .textField('Enter a name for the new instance:', 'example_instance')
            .submitButton('Submit');
    }

    static buildAllStructuresForm() {
        const allStructuresForm = new ActionFormData()
            .title(this.menuTitle)
            .body('Select a structure:');
        structureCollection.getWorldStructureIds().forEach(structureId => {
            const structureName = structureId.replace('mystructure:', '');
            allStructuresForm.button(`§2${structureName}`);
        });
        allStructuresForm.button('Other');
        return allStructuresForm;
    }

    static buildOtherStructureForm() {
        return new ModalFormData()
            .title(this.menuTitle)
            .textField('Enter the Structure ID:', 'example_structure')
            .submitButton('Submit');
    }
}