import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { resolveCommandInstance } from '../options/cliDefaultInstance';

export class NextLayerCommand extends Command {
    constructor() {
        super({
            name: 'nextlayer',
            description: 'construct.commands.nextlayer',
            optionalParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (origin, instanceName) => this.run(origin, instanceName)
        });
    }

    run(origin, instanceName) {
        const instance = resolveCommandInstance(origin, instanceName);
        instance.increaseLayer();
        origin.sendMessage({ translate: 'construct.commands.nextlayer.success', with: [instance.getName(), String(instance.getLayer())] });
        return { status: CustomCommandStatus.Success };
    }
}

export const nextLayerCommand = new NextLayerCommand();
