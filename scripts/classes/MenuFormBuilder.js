import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { structureCollection } from './StructureCollection';

export class MenuFormBuilder {
    static menuTitle = '§l§2StrucTool §8Menu';

    static buildAllInstanceName() {
        const allInstanceNameForm = new ActionFormData()
            .title(this.menuTitle)
            .body('Select an instance:');
        structureCollection.getInstanceNames().forEach(instanceName => {
            allInstanceNameForm.button(`§2${instanceName}`);
        });
        allInstanceNameForm.button('Create New Instance');
        allInstanceNameForm.button('How to Add New Structures');
        return allInstanceNameForm;
    }

    static buildNewInstance() {
        return new ModalFormData()
            .title(this.menuTitle)
            .textField('Enter a name for the new instance:', 'example_instance')
            .submitButton('Submit');
    }

    static buildAllStructures() {
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

    static buildOtherStructure() {
        return new ModalFormData()
            .title(this.menuTitle)
            .textField('Enter the Structure ID:', 'example_structure')
            .submitButton('Submit');
    }

    static buildHowToAddNewStructures() {
        let body = "How to Add Structures:\n"
        body += "§7- Save a structure using a structure block or the /structure command.\n"
        body += "§7OR\n"
        body += "§7- Add a .mcstructure file to this pack's structures folder. When selecting your structure, select the 'Other' option and then use the filename (without '.mcstructure') as the Structure ID. After its first use, it will be added to the list of structures.";
        return new ActionFormData()
            .title(this.menuTitle)
            .body(body);
    }
}