import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { resolveCommandInstance } from '../options/cliDefaultInstance';

export class PrevLayerCommand extends Command {
    constructor() {
        super({
            name: 'prevlayer',
            description: 'construct.commands.prevlayer',
            optionalParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (origin, instanceName) => this.run(origin, instanceName)
        });
    }

    run(origin, instanceName) {
        const instance = resolveCommandInstance(origin, instanceName);
        instance.decreaseLayer();
        origin.sendMessage({ translate: 'construct.commands.prevlayer.success', with: [instance.getName(), String(instance.getLayer())] });
        return { status: CustomCommandStatus.Success };
    }
}

export const prevLayerCommand = new PrevLayerCommand();
