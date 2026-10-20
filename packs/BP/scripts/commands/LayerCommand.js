import { Command } from '../classes/Commands/Command';
import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus } from '@minecraft/server';
import { resolveCommandInstance } from '../options/cliDefaultInstance';

export class LayerCommand extends Command {
    constructor() {
        super({
            name: 'layer',
            description: 'construct.commands.layer',
            mandatoryParameters: [
                { name: 'layer', type: CustomCommandParamType.Integer }
            ],
            optionalParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (origin, layer, instanceName) => this.run(origin, layer, instanceName)
        });
    }

    run(origin, layer, instanceName) {
        const instance = resolveCommandInstance(origin, instanceName);
        const max = instance.getMaxLayer();
        if (layer < 0 || layer > max) {
            origin.sendMessage({ translate: 'construct.commands.layer.outOfBounds', with: [String(layer), instance.getName(), String(max)] });
            return void 0;
        }
        instance.setLayer(layer);
        origin.sendMessage({ translate: 'construct.commands.layer.success', with: [instance.getName(), String(layer)] });
        return { status: CustomCommandStatus.Success };
    }
}

export const layerCommand = new LayerCommand();
