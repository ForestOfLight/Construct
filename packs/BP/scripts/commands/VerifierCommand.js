import { CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { findInstance } from '../classes/Commands/lib/findInstance';
import { commandError } from '../classes/Commands/lib/commandError';

export class VerifierCommand extends Command {
    constructor() {
        super({
            name: 'verifier',
            description: 'construct.commands.verifier',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String },
                { name: 'state', type: CustomCommandParamType.Boolean }
            ],
            callback: (source, instanceName, state) => this.run(source, instanceName, state)
        });
    }

    run(source, instanceName, state) {
        try {
            const instance = findInstance(source, instanceName);
            if (!instance) return { status: CustomCommandStatus.Failure };
            system.run(() => {
                instance.setVerifierEnabled(state);
                source.sendMessage({
                    rawtext: [{ translate: 'construct.commands.verifier.success',
                                with: [instanceName, String(state)] }]
                });
            });
            return { status: CustomCommandStatus.Success };
        } catch (err) {
            return commandError(source, err);
        }
    }
}

export const verifierCommand = new VerifierCommand();
