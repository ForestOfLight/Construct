import { Command } from '../classes/Commands/Command';
import { CustomCommandParamType, CustomCommandStatus, CommandPermissionLevel, system } from '@minecraft/server';
import { structureCollection } from '../classes/Structure/StructureCollection';

export class DeleteCommand extends Command {
    constructor() {
        super({
            name: 'delete',
            description: 'construct.commands.delete',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (source, instanceName) => this.run(source, instanceName)
        });
    }

    run(source, instanceName) {
        const instance = structureCollection.get(instanceName);
        system.run(() => {
            structureCollection.delete(instanceName);
            source.sendMessage({ translate: 'construct.commands.delete.success', with: [instanceName] });
        });
        return { status: CustomCommandStatus.Success };
    }
}

export const deleteCommand = new DeleteCommand();
