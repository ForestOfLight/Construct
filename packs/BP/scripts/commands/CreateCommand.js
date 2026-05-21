import { Command } from '../classes/Commands/Command';
import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { structureCollection } from '../classes/Structure/StructureCollection';
import { InstanceExistsError } from '../classes/Errors/InstanceExistsError';
import { StructureNotFoundError } from '../classes/Errors/StructureNotFoundError';

export class CreateCommand extends Command {
    constructor() {
        super({
            name: 'create',
            description: 'construct.commands.create',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String },
                { name: 'structureId', type: CustomCommandParamType.String }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (source, instanceName, structureId) => this.run(source, instanceName, structureId)
        });
    }

    run(source, instanceName, structureId) {
        this.tryAddStructure(source, instanceName, structureId);
        return { status: CustomCommandStatus.Success };
    }

    tryAddStructure(source, instanceName, structureId) {
        system.run(() => {
            try {
                this.addStructure(source, instanceName, structureId);
            } catch (error) {
                this.handleStructureAdditionErrors(source, error);
            }
        });
    }

    addStructure(source, instanceName, structureId) {
        structureCollection.add(instanceName, structureId);
        source.sendMessage({ translate: 'construct.commands.create.success', with: [instanceName, structureId] });
    }

    handleStructureAdditionErrors(source, error) {
        if (error instanceof InstanceExistsError || error instanceof StructureNotFoundError)
            error.sendTo(source);
        else
            throw error;
    }

}

export const createCommand = new CreateCommand();
