import { CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { findInstance } from '../classes/Commands/lib/findInstance';
import { commandError } from '../classes/Commands/lib/commandError';

export class ActiveCommand extends Command {
    constructor() {
        super({
            name: 'active',
            description: 'construct.commands.active',
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
            if (state && !instance.hasLocation()) {
                system.run(() => source.sendMessage({
                    rawtext: [{ translate: 'construct.commands.error.noLocation', with: [instanceName] }]
                }));
                return { status: CustomCommandStatus.Failure };
            }
            system.run(() => {
                if (state) instance.enable();
                else instance.disable();
                source.sendMessage({
                    rawtext: [{ translate: 'construct.commands.active.success',
                                with: [instanceName, String(state)] }]
                });
            });
            return { status: CustomCommandStatus.Success };
        } catch (err) {
            return commandError(source, err);
        }
    }
}

export const activeCommand = new ActiveCommand();
