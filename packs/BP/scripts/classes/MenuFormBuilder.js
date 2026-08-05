import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { instanceCollection } from './Instance/InstanceCollection';

export class MenuFormBuilder {
    static menuTitle = { translate: 'construct.mainmenu.title' };

    static buildAllInstanceName(instanceNames) {
        const allInstanceNameForm = new ActionFormData()
            .title(this.menuTitle)
            .body({ translate: 'construct.mainmenu.selectinstance' });
        allInstanceNameForm.button({ translate: 'construct.mainmenu.settings' });
        instanceNames.forEach(instanceName => {
            allInstanceNameForm.button(`${instanceCollection.get(instanceName).isEnabled() ? '§2' : '§c'}${instanceName}`);
        });
        allInstanceNameForm.button({ translate: 'construct.mainmenu.newinstance' });
        allInstanceNameForm.button({ translate: 'construct.mainmenu.howto' });
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
            .body({ translate: 'construct.mainmenu.selectstructure.header' });
        const worldStructureIds = instanceCollection.getWorldStructureIds();
        worldStructureIds.sort((a, b) => a.localeCompare(b));
        worldStructureIds.forEach(structureId => {
            const structureName = structureId.replace('mystructure:', '');
            allStructuresForm.button(`§2${structureName}`);
        });
        allStructuresForm.button({ translate: 'construct.mainmenu.selectstructure.other' });
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
            { translate: 'construct.mainmenu.howto.add.header' }, { text: '\n' },
            { translate: 'construct.mainmenu.howto.add.structureblock' }, { text: '\n' },
            { translate: 'construct.mainmenu.howto.add.or' }, { text: '\n' },
            { translate: 'construct.mainmenu.howto.add.mcstructure' }, { text: '\n' },
            { text: '\n' }, { translate: 'construct.mainmenu.howto.remove.header' }, { text: '\n' },
            { translate: 'construct.mainmenu.howto.remove.body' }, { text: '\n' },
        ] };
        return new ActionFormData()
            .title(this.menuTitle)
            .body(message);
    }
}
