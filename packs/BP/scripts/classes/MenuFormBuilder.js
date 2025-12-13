import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { structureCollection } from './Structure/StructureCollection';

export class MenuFormBuilder {
    static menuTitle = { translate: 'construct.mainmenu.title' };

    static buildAllInstanceName() {
        const allInstanceNameForm = new ActionFormData()
            .title(this.menuTitle)
            .body({ translate: 'construct.mainmenu.selectinstance' });
        allInstanceNameForm.button({ translate: 'construct.mainmenu.settings' });
        structureCollection.getInstanceNames().forEach(instanceName => {
            allInstanceNameForm.button(`${structureCollection.get(instanceName).isEnabled() ? '§2' : '§c'}${instanceName}`);
        });
        allInstanceNameForm.button({ translate: 'construct.mainmenu.newinstance' });
        return allInstanceNameForm;
    }

    static buildNewInstance() {
        return new ModalFormData()
            .title(this.menuTitle)
            .textField({ translate: 'construct.mainmenu.newinstance.prompt' }, { translate: 'construct.mainmenu.newinstance.placeholder' })
            .submitButton({ translate: 'construct.menu.submit' });
    }

    static buildAllStructures() {
        const allStructuresForm = new ActionFormData()
            .title(this.menuTitle)
            .body({ translate: construct.mainmenu.selectstructure.header });
        structureCollection.getWorldStructureIds().forEach(structureId => {
            const structureName = structureId.replace('mystructure:', '');
            allStructuresForm.button(`§2${structureName}`);
        });
        allStructuresForm.button({ translate: 'construct.mainmenu.selectstructure.other' });
        allStructuresForm.button({ translate: 'construct.mainmenu.selectstructure.howto' });
        return allStructuresForm;
    }

    static buildOtherStructure() {
        return new ModalFormData()
            .title(this.menuTitle)
            .textField({ translate: 'construct.mainmenu.selectstructure.other.prompt' }, { translate: 'construct.mainmenu.selectstructure.other.placeholder' })
            .submitButton({ translate: 'construct.menu.submit' });
    }

    static buildHowTo() {
        const message = { rawtext: [
            { translate: 'construct.mainmenu.selectstructure.howto.add.header' }, { text: '\n' },
            { translate: 'construct.mainmenu.selectstructure.howto.add.structureblock' }, { text: '\n' },
            { translate: 'construct.mainmenu.selectstructure.howto.add.or' }, { text: '\n' },
            { translate: 'construct.mainmenu.selectstructure.howto.add.mcstructure' }, { text: '\n' },
            { text: '\n' }, { translate: 'construct.mainmenu.selectstructure.howto.remove.header' }, { text: '\n' },
            { translate: 'construct.mainmenu.selectstructure.howto.remove.body' }, { text: '\n' },
        ] };
        return new ActionFormData()
            .title(this.menuTitle)
            .body(message);
    }
}