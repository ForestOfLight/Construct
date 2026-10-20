import { Command } from '../classes/Commands/Command';
import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system, world } from '@minecraft/server';
import { Vector } from '../lib/Vector';
import { resolveCommandInstance } from '../options/cliDefaultInstance';
import { PlayerCommandOrigin } from '../classes/Commands/PlayerCommandOrigin';

export class MoveCommand extends Command {
    constructor() {
        super({
            name: 'move',
            description: 'construct.commands.move',
            optionalParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String },
                { name: 'dimensionId', type: CustomCommandParamType.Enum }, // Enum defined in PlaceCommand
                { name: 'location', type: CustomCommandParamType.Location }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (origin, instanceName, dimensionId, location) => this.run(origin, instanceName, dimensionId, location)
        });
    }

    run(origin, instanceName, dimensionId, location) {
        const instance = resolveCommandInstance(origin, instanceName);
        if (dimensionId === void 0 || location === void 0) {
            if (!(origin instanceof PlayerCommandOrigin))
                return { status: CustomCommandStatus.Failure, message: 'construct.commands.move.locationRequired' };
            const player = origin.getSource();
            location = player.location;
            dimensionId = player.dimension.id;
        }
        this.assertDimensionExists(dimensionId);
        const flooredLocation = Vector.from(location).floor();
        system.run(() => {
            instance.move(dimensionId, flooredLocation);
            origin.sendMessage({ translate: 'construct.commands.move.success', with: [instance.getName(), flooredLocation.toString(), dimensionId.replace('minecraft:', '')] });
        });
        return { status: CustomCommandStatus.Success };
    }

    assertDimensionExists(dimensionId) {
        return world.getDimension(dimensionId) !== void 0;
    }
}

export const moveCommand = new MoveCommand();
