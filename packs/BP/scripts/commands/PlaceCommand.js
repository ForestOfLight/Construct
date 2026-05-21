import { Command } from '../classes/Commands/Command'; 
import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, DimensionTypes, system, world } from '@minecraft/server';
import { structureCollection } from '../classes/Structure/StructureCollection';
import { InstanceExistsError } from '../classes/Errors/InstanceExistsError';
import { Vector } from '../lib/Vector';

export class PlaceCommand extends Command {
    constructor() {
        super({
            name: 'place',
            description: 'construct.commands.place',
            enums: [ { name: 'dimensionId', values: Object.values(DimensionTypes.getAll().map(d => d.typeId)) } ],
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String },
                { name: 'dimensionId', type: CustomCommandParamType.Enum },
                { name: 'location', type: CustomCommandParamType.Location }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (source, instanceName, dimensionId, location) => this.run(source, instanceName, dimensionId, location)
        });
    }

    run(source, instanceName, dimensionId, location) {
        const instance = structureCollection.get(instanceName);
        const flooredLocation = Vector.from(location).floor();
        this.assertDimensionExists(dimensionId);
        system.run(() => {
            instance.place(dimensionId, flooredLocation);
            source.sendMessage({ translate: 'construct.commands.place.success', with: [instanceName, flooredLocation.toString(), dimensionId.replace('minecraft:', '')] });
        });
        return { status: CustomCommandStatus.Success };
    }

    assertDimensionExists(dimensionId) {
        return world.getDimension(dimensionId) !== void 0;
    }
}

export const placeCommand = new PlaceCommand();
