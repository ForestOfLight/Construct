import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { structureCollection } from '../classes/Structure/StructureCollection';

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
            callback: (source, instanceName, state) => this.run(source, instanceName, state)
        });
    }

    run(source, instanceName, state) {
        const instance = structureCollection.get(instanceName);
        if (state)
            instance.setVerifierEnabled(true);
        else
            instance.setVerifierEnabled(false);
        this.sendFeedback(source, instanceName, state);
        return { status: CustomCommandStatus.Success };
    }

    sendFeedback(source, instanceName, state) {
        source.sendMessage({ translate: state ? 'construct.commands.verifier.enabled' : 'construct.commands.verifier.disabled', with: [instanceName] });
    }
}

export const verifierCommand = new VerifierCommand();
