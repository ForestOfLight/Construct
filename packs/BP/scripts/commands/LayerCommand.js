import { CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { findInstance } from '../classes/Commands/lib/findInstance';
import { commandError } from '../classes/Commands/lib/commandError';

export class LayerCommand extends Command {
    constructor() {
        super({
            name: 'layer',
            description: 'construct.commands.layer',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String },
                { name: 'layer', type: CustomCommandParamType.Integer }
            ],
            callback: (source, instanceName, layer) => this.run(source, instanceName, layer)
        });
    }

    run(source, instanceName, layer) {
        try {
            const instance = findInstance(source, instanceName);
            if (!instance) return { status: CustomCommandStatus.Failure };
            const max = instance.getMaxLayer();
            if (layer < 0 || layer > max) {
                system.run(() => source.sendMessage({
                    rawtext: [{ translate: 'construct.commands.layer.outOfBounds',
                                with: [String(layer), instanceName, String(max)] }]
                }));
                return { status: CustomCommandStatus.Failure };
            }
            system.run(() => {
                instance.setLayer(layer);
                source.sendMessage({
                    rawtext: [{ translate: 'construct.commands.layer.success',
                                with: [instanceName, String(layer)] }]
                });
            });
            return { status: CustomCommandStatus.Success };
        } catch (err) {
            return commandError(source, err);
        }
    }
}

export const layerCommand = new LayerCommand();
