import { CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { structureCollection } from '../classes/Structure/StructureCollection';
import { findInstance } from '../classes/Commands/lib/findInstance';
import { commandError } from '../classes/Commands/lib/commandError';

export class RenameCommand extends Command {
    constructor() {
        super({
            name: 'rename',
            description: 'construct.commands.rename',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String },
                { name: 'newName', type: CustomCommandParamType.String }
            ],
            callback: (source, instanceName, newName) => this.run(source, instanceName, newName)
        });
    }

    run(source, instanceName, newName) {
        try {
            const instance = findInstance(source, instanceName);
            if (!instance) return { status: CustomCommandStatus.Failure };
            if (structureCollection.has(newName)) {
                system.run(() => source.sendMessage({
                    rawtext: [{ translate: 'construct.commands.rename.duplicateName', with: [newName] }]
                }));
                return { status: CustomCommandStatus.Failure };
            }
            system.run(() => {
                structureCollection.rename(instanceName, newName);
                source.sendMessage({
                    rawtext: [{ translate: 'construct.commands.rename.success', with: [instanceName, newName] }]
                });
            });
            return { status: CustomCommandStatus.Success };
        } catch (err) {
            return commandError(source, err);
        }
    }
}

export const renameCommand = new RenameCommand();
