import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { instanceCollection } from '../classes/Instance/InstanceCollection';

export class PrevLayerCommand extends Command {
    constructor() {
        super({
            name: 'prevlayer',
            description: 'construct.commands.prevlayer',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (origin, instanceName) => this.run(origin, instanceName)
        });
    }

    run(origin, instanceName) {
        const instance = instanceCollection.get(instanceName);
        instance.decreaseLayer();
        origin.sendMessage({ translate: 'construct.commands.prevlayer.success', with: [instanceName, String(instance.getLayer())] });
        return { status: CustomCommandStatus.Success };
    }
}

export const prevLayerCommand = new PrevLayerCommand();
