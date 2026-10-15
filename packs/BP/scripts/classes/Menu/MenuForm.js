import { instanceCollection } from '../Instance/InstanceCollection';
import { InstanceForm } from '../Instance/Form/InstanceForm';
import { BuilderForm } from '../Builder/BuilderForm';
import { getDefaultRenderMode } from '../../options/defaultRenderMode';
import { world } from '@minecraft/server';
import { CustomForm, ObservableBoolean, ObservableString, ObservableUIRawMessage } from '@minecraft/server-ui';
import { FormUtils } from './FormUtils';

export class MenuForm {
    static title = { translate: 'construct.menu.title' };

    constructor(player, { jumpToInstance = false, instanceName = void 0 } = {}) {
        this.player = player;
        this.show(jumpToInstance, instanceName);
    }

    show(jumpToInstance = false, instanceName = void 0) {
        if (jumpToInstance) {
            if (!instanceName)
                instanceName = instanceCollection.getInstanceAt(this.player.dimension.id, this.player.location, { useActiveLayer: false })?.getName();
            if (instanceName) {
                new InstanceForm(this.player, instanceName);
                return;
            }
        }
        this.showInstanceSelection();
    }

    showInstanceSelection() {
        const instanceNames = instanceCollection.getInstanceNamesSortedByEnabled();

        const form = new CustomForm(this.player, MenuForm.title);
        form.label({ translate: 'construct.menu.selectinstance' });
        form.spacer();
        instanceNames.forEach(instanceName => {
            form.button(instanceName, () => {
                form.close();
                new InstanceForm(this.player, instanceName);
            });
        });
        form.divider();
        form.button({ translate: 'construct.menu.newinstance' }, () => {
            form.close();
            this.showCreateNewInstance();
        });
        form.button({ translate: 'construct.menu.settings' }, () => {
            form.close();
            new BuilderForm(this.player)
        });
        form.button({ translate: 'construct.menu.howto' }, () => {
            form.close();
            this.showHowTo();
        });
        FormUtils.tryShow(form);
    }

    showCreateNewInstance() {
        const observableInstanceName = new ObservableString('My Instance', { clientWritable: true });
        const worldStructureIds = instanceCollection.getWorldStructureIds();
        worldStructureIds.sort((a, b) => a.localeCompare(b));

        const form = new CustomForm(this.player, MenuForm.title);
        form.textField({ translate: 'construct.menu.newinstance.prompt' }, observableInstanceName);
        form.spacer();
        FormUtils.buildPaginatedListWithFilter(form, worldStructureIds, (structureId) => {
            const instanceName = observableInstanceName.getData();
            this.#addInstance(form, instanceName, structureId);
        }, { translate: 'construct.menu.selectstructure.header' });
        this.#addOtherStructureInput(form, observableInstanceName);
        FormUtils.tryShow(form);
    }

    #addOtherStructureInput(form, observableInstanceName) {
        const notFoundMessage = { translate: 'construct.menu.selectstructure.other.notfound' };
        const foundMessage = { translate: 'construct.menu.selectstructure.other.found' };
        const tipMessage = { translate: 'construct.menu.selectstructure.other.description' };
        const observableOtherStructure = new ObservableString('', { clientWritable: true });
        const otherDescription = new ObservableUIRawMessage(tipMessage, { clientWritable: true });
        const otherFound = new ObservableBoolean(false, { clientWritable: true });
        observableOtherStructure.subscribe(value => {
            const structureId = value.trim();
            const found = structureId !== '' && world.structureManager.get(structureId) !== void 0;
            otherFound.setData(found);
            otherDescription.setData(structureId === '' ? tipMessage : found ? foundMessage : notFoundMessage);
        });
        form.textField({ translate: 'construct.menu.selectstructure.other' }, observableOtherStructure, { description: otherDescription });
        form.button({ translate: 'construct.menu.selectstructure.other.submit' }, () => {
            const instanceName = observableInstanceName.getData();
            const structureId = observableOtherStructure.getData().trim()
            this.#addInstance(form, instanceName, structureId);
        }, { visible: otherFound });
    }

    #addInstance(form, instanceName, structureId) {
        instanceCollection.add(instanceName, structureId, { renderMode: getDefaultRenderMode(this.player.id) });
        form.close();
        new InstanceForm(this.player, instanceName);
    }

    showHowTo() {
        const addMessage = { rawtext: [
            { translate: 'construct.menu.howto.add.header' }, { text: '\n' },
            { translate: 'construct.menu.howto.add.structureblock' }, { text: '\n' },
            { translate: 'construct.menu.howto.add.or' }, { text: '\n' },
            { translate: 'construct.menu.howto.add.mcstructure' }, { text: '\n' }
        ]};
        const removeMessage = { rawtext: [
            { translate: 'construct.menu.howto.remove.header' }, { text: '\n' },
            { translate: 'construct.menu.howto.remove.body' }, { text: '\n' }
        ]};
        const form = new CustomForm(this.player, MenuForm.title);
        form.label(addMessage);
        form.divider();
        form.label(removeMessage);
        form.closeButton();
        FormUtils.tryShow(form);
    }
}