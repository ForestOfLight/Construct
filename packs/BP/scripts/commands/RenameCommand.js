import { Command } from '../classes/Commands/Command';
import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { structureCollection } from '../classes/Structure/StructureCollection';

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
        const instance = structureCollection.get(instanceName);
        if (structureCollection.has(newName)) {
            origin.sendMessage({ translate: 'construct.error.instanceExists', with: [newName] });
            return void 0;
        }
        structureCollection.rename(instanceName, newName);
        origin.sendMessage({ translate: 'construct.commands.rename.success', with: [instanceName, newName] });
        return { status: CustomCommandStatus.Success };
    }
}

export const renameCommand = new RenameCommand();
