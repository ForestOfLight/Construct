import { Command } from '../classes/Commands/Command';
import { CustomCommandParamType, CustomCommandStatus, CommandPermissionLevel, system } from '@minecraft/server';
import { instanceCollection } from '../classes/Instance/InstanceCollection';

export class DeleteCommand extends Command {
    constructor() {
        super({
            name: 'delete',
            description: 'construct.commands.delete',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (origin, instanceName) => this.run(origin, instanceName)
        });
    }

    run(origin, instanceName) {
        const instance = instanceCollection.get(instanceName);
        system.run(() => {
            instanceCollection.delete(instanceName);
            origin.sendMessage({ translate: 'construct.commands.delete.success', with: [instanceName] });
        });
        return { status: CustomCommandStatus.Success };
    }
}

export const deleteCommand = new DeleteCommand();
