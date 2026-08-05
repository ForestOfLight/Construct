import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { instanceCollection } from '../classes/Instance/InstanceCollection';

export class VerifierCommand extends Command {
    constructor() {
        super({
            name: 'verifier',
            description: 'construct.commands.verifier',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String },
                { name: 'state', type: CustomCommandParamType.Boolean }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (origin, instanceName, state) => this.run(origin, instanceName, state)
        });
    }

    run(origin, instanceName, state) {
        const instance = instanceCollection.get(instanceName);
        if (state)
            instance.setVerifierEnabled(true);
        else
            instance.setVerifierEnabled(false);
        this.sendFeedback(origin, instanceName, state);
        return { status: CustomCommandStatus.Success };
    }

    sendFeedback(origin, instanceName, state) {
        origin.sendMessage({ translate: state ? 'construct.commands.verifier.enabled' : 'construct.commands.verifier.disabled', with: [instanceName] });
    }
}

export const verifierCommand = new VerifierCommand();
