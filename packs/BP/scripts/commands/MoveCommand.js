import { Command } from '../classes/Commands/Command';
import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system, world } from '@minecraft/server';
import { Vector } from '../lib/Vector';
import { structureCollection } from '../classes/Structure/StructureCollection';
import { PlayerCommandOrigin } from '../classes/Commands/PlayerCommandOrigin';

export class MoveCommand extends Command {
    constructor() {
        super({
            name: 'move',
            description: 'construct.commands.move',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String }
            ],
            optionalParameters: [
                { name: 'dimensionId', type: CustomCommandParamType.Enum }, // Enum defined in PlaceCommand.js
                { name: 'location', type: CustomCommandParamType.Location }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (source, instanceName, dimensionId, location) => this.run(source, instanceName, dimensionId, location)
        });
    }

    run(source, instanceName, dimensionId, location) {
        const instance = structureCollection.get(instanceName);
        if (dimensionId === void 0 || location === void 0) {
            if (!(source instanceof PlayerCommandOrigin))
                return { status: CustomCommandStatus.Failure, message: 'construct.commands.move.locationRequired' };
            const player = source.getSource();
            location = player.location;
            dimensionId = player.dimension.id;
        }
        this.assertDimensionExists(dimensionId);
        const flooredLocation = Vector.from(location).floor();
        system.run(() => {
            instance.move(dimensionId, flooredLocation);
            source.sendMessage({ translate: 'construct.commands.move.success', with: [instanceName, flooredLocation.toString(), dimensionId.replace('minecraft:', '')] });
        });
        return { status: CustomCommandStatus.Success };
    }

    assertDimensionExists(dimensionId) {
        return world.getDimension(dimensionId) !== void 0;
    }
}

export const moveCommand = new MoveCommand();
