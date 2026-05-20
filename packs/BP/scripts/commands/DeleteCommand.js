import { CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { structureCollection } from '../classes/Structure/StructureCollection';
import { findInstance } from '../classes/Commands/lib/findInstance';
import { commandError } from '../classes/Commands/lib/commandError';

export class DeleteCommand extends Command {
    constructor() {
        super({
            name: 'delete',
            description: 'construct.commands.delete',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String }
            ],
            callback: (source, instanceName) => this.run(source, instanceName)
        });
    }

    run(source, instanceName) {
        try {
            const instance = findInstance(source, instanceName);
            if (!instance) return { status: CustomCommandStatus.Failure };
            system.run(() => {
                structureCollection.delete(instanceName);
                source.sendMessage({
                    rawtext: [{ translate: 'construct.commands.delete.success', with: [instanceName] }]
                });
            });
            return { status: CustomCommandStatus.Success };
        } catch (err) {
            return commandError(source, err);
        }
    }
}

export const deleteCommand = new DeleteCommand();
