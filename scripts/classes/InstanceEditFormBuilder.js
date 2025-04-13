import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { MenuFormBuilder } from './MenuFormBuilder';

export class InstanceEditFormBuilder {
    static buildInstance(instance, options) {
        const location = instance.getLocation();
        const form = new ActionFormData()
            .title(MenuFormBuilder.menuTitle)
        let body = `Instance: §2${instance.name}\n`;
        if (instance.hasLocation())
            body += `§7(${location.location.x} ${location.location.y} ${location.location.z} in ${location.dimensionId})\n`;
        form.body(body);
        options.forEach(option => {
            form.button(`${option}`);
        });
        return form;
    }

    static buildRenameInstance(currentName) {
        return new ModalFormData()
            .title(MenuFormBuilder.menuTitle)
            .textField('Enter a new name for the instance:', currentName)
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