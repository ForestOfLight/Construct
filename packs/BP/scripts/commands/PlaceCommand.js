import { CustomCommandParamType, CustomCommandStatus, system, world } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { findInstance } from '../classes/Commands/lib/findInstance';
import { commandError } from '../classes/Commands/lib/commandError';
import { PlayerCommandOrigin } from '../classes/Commands/PlayerCommandOrigin';
import { BlockCommandOrigin } from '../classes/Commands/BlockCommandOrigin';
import { EntityCommandOrigin } from '../classes/Commands/EntityCommandOrigin';

export class PlaceCommand extends Command {
    constructor() {
        super({
            name: 'place',
            description: 'construct.commands.place',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String },
                { name: 'pos', type: CustomCommandParamType.Location }
            ],
            callback: (source, instanceName, pos) => this.run(source, instanceName, pos)
        });
    }

    run(source, instanceName, pos) {
        try {
            const instance = findInstance(source, instanceName);
            if (!instance) return { status: CustomCommandStatus.Failure };
            const dimensionId = this.resolveDimensionId(source);
            system.run(() => {
                instance.place(dimensionId, pos);
                source.sendMessage({
                    rawtext: [{ translate: 'construct.commands.place.success',
                                with: [instanceName, String(pos.x), String(pos.y), String(pos.z),
                                       dimensionId.replace('minecraft:', '')] }]
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

export const placeCommand = new PlaceCommand();
