import { CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { findInstance } from '../classes/Commands/lib/findInstance';
import { commandError } from '../classes/Commands/lib/commandError';

export class PrevLayerCommand extends Command {
    constructor() {
        super({
            name: 'prevlayer',
            description: 'construct.commands.prevlayer',
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
                instance.decreaseLayer();
                source.sendMessage({
                    rawtext: [{ translate: 'construct.commands.prevlayer.success',
                                with: [instanceName, String(instance.getLayer())] }]
                });
            });
            return { status: CustomCommandStatus.Success };
        } catch (err) {
            return commandError(source, err);
        }
    }
}

export const prevLayerCommand = new PrevLayerCommand();
