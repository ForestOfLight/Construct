import { Command } from '../classes/Commands/Command';
import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { instanceCollection } from '../classes/Instance/InstanceCollection';

export class RenameCommand extends Command {
    constructor() {
        super({
            name: 'rename',
            description: 'construct.commands.rename',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String },
                { name: 'newName', type: CustomCommandParamType.String }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (origin, instanceName, newName) => this.run(origin, instanceName, newName)
        });
    }

    run(origin, instanceName, newName) {
        const instance = instanceCollection.get(instanceName);
        if (instanceCollection.has(newName)) {
            origin.sendMessage({ translate: 'construct.error.instanceExists', with: [newName] });
            return void 0;
        }
        instanceCollection.rename(instanceName, newName);
        origin.sendMessage({ translate: 'construct.commands.rename.success', with: [instanceName, newName] });
        return { status: CustomCommandStatus.Success };
    }
}

export const renameCommand = new RenameCommand();
