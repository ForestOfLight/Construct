import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { MenuFormBuilder } from './MenuFormBuilder';

export class InstanceEditFormBuilder {
    static buildInstance(instanceName, currentOptions, commonOptions) {
        const form = new ActionFormData()
            .title(MenuFormBuilder.menuTitle)
            .body(`Instance: §2${instanceName}`)
        currentOptions.forEach(option => {
            form.button(`${option}`);
        });
        commonOptions.forEach(option => {
            form.button(`${option}`);
        });
        return form;
    }

    static buildRenameInstance() {
        return new ModalFormData()
            .title(MenuFormBuilder.menuTitle)
            .textField('Enter a new name for the instance:', 'example_instance')
            .submitButton('Rename');
    }

    static buildSetLayer(maxLayer, currentLayer) {
        return new ModalFormData()
            .title(MenuFormBuilder.menuTitle)
            .label('Use the slider to select the layer. Use 0 for all layers.')
            .slider("Layer", 0, maxLayer, 1, currentLayer)
            .submitButton('Set Layer');
    }
}