import { Command } from '../classes/Commands/Command';
import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { structureCollection } from '../classes/Structure/StructureCollection';

export class LayerCommand extends Command {
    constructor() {
        super({
            name: 'layer',
            description: 'construct.commands.layer',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String },
                { name: 'layer', type: CustomCommandParamType.Integer }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (origin, instanceName, layer) => this.run(origin, instanceName, layer)
        });
    }

    run(origin, instanceName, layer) {
        const instance = structureCollection.get(instanceName);
        const max = instance.getMaxLayer();
        if (layer < 0 || layer > max) {
            origin.sendMessage({ translate: 'construct.commands.layer.outOfBounds', with: [String(layer), instanceName, String(max)] });
            return void 0;
        }
        instance.setLayer(layer);
        origin.sendMessage({ translate: 'construct.commands.layer.success', with: [instanceName, String(layer)] });
        return { status: CustomCommandStatus.Success };
    }
}

export const layerCommand = new LayerCommand();
