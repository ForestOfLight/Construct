import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { structureCollection } from '../classes/Structure/StructureCollection';

export class NextLayerCommand extends Command {
    constructor() {
        super({
            name: 'nextlayer',
            description: 'construct.commands.nextlayer',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (origin, instanceName) => this.run(origin, instanceName)
        });
    }

    run(origin, instanceName) {
        const instance = structureCollection.get(instanceName);
        instance.increaseLayer();
        origin.sendMessage({ translate: 'construct.commands.nextlayer.success', with: [instanceName, String(instance.getLayer())] });
        return { status: CustomCommandStatus.Success };
    }
}

export const nextLayerCommand = new NextLayerCommand();
