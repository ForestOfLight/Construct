import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { structureCollection } from '../classes/Structure/StructureCollection';

export class PrevLayerCommand extends Command {
    constructor() {
        super({
            name: 'prevlayer',
            description: 'construct.commands.prevlayer',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (source, instanceName) => this.run(source, instanceName)
        });
    }

    run(source, instanceName) {
        const instance = structureCollection.get(instanceName);
        instance.decreaseLayer();
        source.sendMessage({ translate: 'construct.commands.prevlayer.success', with: [instanceName, String(instance.getLayer())] });
        return { status: CustomCommandStatus.Success };
    }
}

export const prevLayerCommand = new PrevLayerCommand();
