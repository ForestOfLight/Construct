import { CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { findInstance } from '../classes/Commands/lib/findInstance';
import { commandError } from '../classes/Commands/lib/commandError';

export class NextLayerCommand extends Command {
    constructor() {
        super({
            name: 'nextlayer',
            description: 'construct.commands.nextlayer',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String }
            ],
            callback: (source, instanceName) => this.run(source, instanceName)
        });
    }

    run(source, instanceName) {
        try {
            const instance = findInstance(source, instanceName);
            if (!instance) return { status: CustomCommandStatus.Failure };
            system.run(() => {
                instance.increaseLayer();
                source.sendMessage({
                    rawtext: [{ translate: 'construct.commands.nextlayer.success',
                                with: [instanceName, String(instance.getLayer())] }]
                });
            });
            return { status: CustomCommandStatus.Success };
        } catch (err) {
            return commandError(source, err);
        }
    }
}

export const nextLayerCommand = new NextLayerCommand();
