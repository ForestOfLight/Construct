import { CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { structureCollection } from '../classes/Structure/StructureCollection';
import { commandError } from '../classes/Commands/lib/commandError';

export class NewCommand extends Command {
    constructor() {
        super({
            name: 'new',
            description: 'construct.commands.new',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String },
                { name: 'structureId', type: CustomCommandParamType.String }
            ],
            callback: (source, instanceName, structureId) => this.run(source, instanceName, structureId)
        });
    }

    run(source, instanceName, structureId) {
        try {
            if (structureCollection.has(instanceName)) {
                system.run(() => source.sendMessage({
                    rawtext: [{ translate: 'construct.commands.new.duplicateName', with: [instanceName] }]
                }));
                return { status: CustomCommandStatus.Failure };
            }
            if (!structureCollection.getWorldStructureIds().includes(structureId)) {
                system.run(() => source.sendMessage({
                    rawtext: [{ translate: 'construct.commands.new.unknownStructure', with: [structureId] }]
                }));
                return { status: CustomCommandStatus.Failure };
            }
            system.run(() => {
                structureCollection.add(instanceName, structureId);
                source.sendMessage({
                    rawtext: [{ translate: 'construct.commands.new.success', with: [instanceName, structureId] }]
                });
            });
            return { status: CustomCommandStatus.Success };
        } catch (err) {
            return commandError(source, err);
        }
    }
}

export const newCommand = new NewCommand();
