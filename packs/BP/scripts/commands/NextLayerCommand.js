import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { instanceCollection } from '../classes/Instance/InstanceCollection';

export class NextLayerCommand extends Command {
    constructor() {
        super({
            name: 'nextlayer',
            description: 'construct.commands.nextlayer',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (origin, instanceName) => this.run(origin, instanceName)
        });
    }

    run(origin, instanceName) {
        const instance = instanceCollection.get(instanceName);
        instance.increaseLayer();
        origin.sendMessage({ translate: 'construct.commands.nextlayer.success', with: [instanceName, String(instance.getLayer())] });
        return { status: CustomCommandStatus.Success };
    }
}

export const nextLayerCommand = new NextLayerCommand();
