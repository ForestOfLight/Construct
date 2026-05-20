import { CustomCommandStatus, system, world } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { structureCollection } from '../classes/Structure/StructureCollection';
import { commandError } from '../classes/Commands/lib/commandError';

export class ListCommand extends Command {
    constructor() {
        super({
            name: 'list',
            description: 'construct.commands.list',
            callback: (source) => this.run(source)
        });
    }

    run(source) {
        try {
            const names = structureCollection.getInstanceNames();
            if (names.length === 0) {
                return { status: CustomCommandStatus.Success, message: 'construct.commands.list.empty' };
            }
            system.run(() => {
                const rawtext = [
                    { translate: 'construct.commands.list.header', with: [String(names.length)] },
                    { text: '\n' }
                ];
                for (const name of names) {
                    const instance = structureCollection.get(name);
                    const status = this.formatStatus(instance);
                    rawtext.push({
                        translate: 'construct.commands.list.row',
                        with: [name, instance.getStructureId(), status]
                    });
                    rawtext.push({ text: '\n' });
                }
                source.sendMessage({ rawtext });
            });
            return { status: CustomCommandStatus.Success };
        } catch (err) {
            return commandError(source, err);
        }
    }

    formatStatus(instance) {
        if (!instance.hasLocation())
            return 'no location';
        if (!instance.isEnabled())
            return 'disabled';
        const { dimensionId, location } = instance.getLocation();
        const dim = dimensionId.replace('minecraft:', '');
        return `enabled @ ${location.x} ${location.y} ${location.z} (${dim})`;
    }
}

export const listCommand = new ListCommand();
