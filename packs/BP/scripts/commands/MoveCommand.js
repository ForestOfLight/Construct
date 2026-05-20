import { CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { findInstance } from '../classes/Commands/lib/findInstance';
import { commandError } from '../classes/Commands/lib/commandError';
import { PlayerCommandOrigin } from '../classes/Commands/PlayerCommandOrigin';
import { BlockCommandOrigin } from '../classes/Commands/BlockCommandOrigin';
import { EntityCommandOrigin } from '../classes/Commands/EntityCommandOrigin';

export class MoveCommand extends Command {
    constructor() {
        super({
            name: 'move',
            description: 'construct.commands.move',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String }
            ],
            optionalParameters: [
                { name: 'pos', type: CustomCommandParamType.Location }
            ],
            callback: (source, instanceName, pos) => this.run(source, instanceName, pos)
        });
    }

    run(source, instanceName, pos) {
        try {
            const instance = findInstance(source, instanceName);
            if (!instance) return { status: CustomCommandStatus.Failure };
            let dimensionId;
            let location = pos;
            if (location === undefined) {
                if (!(source instanceof PlayerCommandOrigin))
                    return { status: CustomCommandStatus.Failure, message: 'construct.commands.move.posRequired' };
                const player = source.getSource();
                location = player.location;
                dimensionId = player.dimension.id;
            } else {
                dimensionId = this.resolveDimensionId(source);
            }
            system.run(() => {
                instance.move(dimensionId, location);
                source.sendMessage({
                    rawtext: [{ translate: 'construct.commands.move.success',
                                with: [instanceName, String(Math.floor(location.x)), String(Math.floor(location.y)),
                                       String(Math.floor(location.z)), dimensionId.replace('minecraft:', '')] }]
                });
            });
            return { status: CustomCommandStatus.Success };
        } catch (err) {
            return commandError(source, err);
        }
    }

    resolveDimensionId(source) {
        if (source instanceof PlayerCommandOrigin || source instanceof EntityCommandOrigin)
            return source.getSource().dimension.id;
        if (source instanceof BlockCommandOrigin)
            return source.getSource().dimension.id;
        return 'minecraft:overworld';
    }
}

export const moveCommand = new MoveCommand();
