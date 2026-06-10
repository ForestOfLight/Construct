import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { structureCollection } from '../classes/Structure/StructureCollection';

export class AutoArmorStandCommand extends Command {
    constructor() {
        super({
            name: 'autoarmorstand',
            description: 'construct.commands.autoArmorStand',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String },
                { name: 'state', type: CustomCommandParamType.Boolean }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (origin, instanceName, state) => this.run(origin, instanceName, state)
        });
    }

    run(origin, instanceName, state) {
        const instance = structureCollection.get(instanceName);
        system.run(() => {
            if (state)
                instance.setArmorStandPoserEnabled(true);
            else
                instance.setArmorStandPoserEnabled(false);
            this.sendFeedback(origin, instanceName, state);
        });
        return { status: CustomCommandStatus.Success };
    }

    sendFeedback(origin, instanceName, state) {
        origin.sendMessage({ translate: state ? 'construct.commands.autoArmorStand.enabled' : 'construct.commands.autoArmorStand.disabled', with: [instanceName] });
    }
}

export const autoArmorStandCommand = new AutoArmorStandCommand();
