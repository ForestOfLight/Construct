import { CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { findInstance } from '../classes/Commands/lib/findInstance';
import { commandError } from '../classes/Commands/lib/commandError';

export class InfoCommand extends Command {
    constructor() {
        super({
            name: 'info',
            description: 'construct.commands.info',
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
            const rawtext = [
                { translate: 'construct.commands.info.header', with: [instance.getName()] },
                { text: '\n' },
                { translate: 'construct.commands.info.structure', with: [instance.getStructureId()] },
                { text: '\n' },
                { translate: 'construct.commands.info.enabled', with: [String(instance.isEnabled())] },
                { text: '\n' }
            ];
            if (instance.hasLocation()) {
                const { dimensionId, location } = instance.getLocation();
                rawtext.push({ translate: 'construct.commands.info.location',
                    with: [String(location.x), String(location.y), String(location.z),
                           dimensionId.replace('minecraft:', '')] });
            } else {
                rawtext.push({ translate: 'construct.commands.info.noLocation' });
            }
            rawtext.push({ text: '\n' });
            rawtext.push({ translate: 'construct.commands.info.layer',
                with: [String(instance.getLayer()), String(instance.getMaxLayer())] });
            rawtext.push({ text: '\n' });
            rawtext.push({ translate: 'construct.commands.info.verifier',
                with: [String(instance.options.verifier.isEnabled)] });
            rawtext.push({ text: '\n' });
            const bounds = instance.getBounds();
            rawtext.push({ translate: 'construct.commands.info.bounds',
                with: [String(bounds.min.x), String(bounds.min.y), String(bounds.min.z),
                       String(bounds.max.x), String(bounds.max.y), String(bounds.max.z)] });
            system.run(() => source.sendMessage({ rawtext }));
            return { status: CustomCommandStatus.Success };
        } catch (err) {
            return commandError(source, err);
        }
    }
}

export const infoCommand = new InfoCommand();
