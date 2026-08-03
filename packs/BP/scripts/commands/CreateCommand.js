import { Command } from '../classes/Commands/Command';
import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { instanceCollection } from '../classes/Instance/InstanceCollection';
import { InstanceExistsError } from '../classes/Errors/InstanceExistsError';
import { StructureNotFoundError } from '../classes/Errors/StructureNotFoundError';
import { getDefaultRenderMode } from '../options/defaultRenderMode';

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
            callback: (origin, instanceName, structureId) => this.run(origin, instanceName, structureId)
        });
    }

    run(origin, instanceName, structureId) {
        this.tryAddStructure(origin, instanceName, structureId);
        return { status: CustomCommandStatus.Success };
    }

    tryAddStructure(origin, instanceName, structureId) {
        system.run(() => {
            try {
                this.addStructure(origin, instanceName, structureId);
            } catch (error) {
                this.handleStructureAdditionErrors(origin, error);
            }
        });
    }

    addStructure(origin, instanceName, structureId) {
        const playerId = origin.getType() === 'Player' ? origin.getSource().id : void 0;
        instanceCollection.add(instanceName, structureId, { renderMode: getDefaultRenderMode(playerId) });
        origin.sendMessage({ translate: 'construct.commands.create.success', with: [instanceName, structureId] });
    }

    handleStructureAdditionErrors(origin, error) {
        if (error instanceof InstanceExistsError || error instanceof StructureNotFoundError)
            error.sendTo(origin);
        else
            throw error;
    }

}

export const createCommand = new CreateCommand();
