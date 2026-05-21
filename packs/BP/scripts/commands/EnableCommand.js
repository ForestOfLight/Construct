import { Command } from '../classes/Commands/Command';
import { CustomCommandParamType, CustomCommandStatus, CommandPermissionLevel, system } from '@minecraft/server';
import { structureCollection } from '../classes/Structure/StructureCollection';

export class EnableCommand extends Command {
    constructor() {
        super({
            name: 'enable',
            description: 'construct.commands.enable',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String },
                { name: 'state', type: CustomCommandParamType.Boolean }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (source, instanceName, state) => this.run(source, instanceName, state)
        });
    }

    run(source, instanceName, state) {
        const instance = structureCollection.get(instanceName);
        if (state && !instance.hasLocation()) {
            source.sendMessage({ translate: 'construct.commands.error.noLocation', with: [instanceName] });
            return void 0;
        }
        system.run(() => {
            if (state)
                instance.enable();
            else
                instance.disable();
            this.sendFeedback(source, instanceName, state);
        });
        return { status: CustomCommandStatus.Success };
    }

    sendFeedback(source, instanceName, state) {
        source.sendMessage({ translate: state ? 'construct.commands.enable.true' : 'construct.commands.enable.false', with: [instanceName] });
    }
}

export const enableCommand = new EnableCommand();
