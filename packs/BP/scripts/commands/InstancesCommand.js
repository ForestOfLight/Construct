import { CommandPermissionLevel, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { instanceCollection } from '../classes/Instance/InstanceCollection';

export class InstancesCommand extends Command {
    constructor() {
        super({
            name: 'instances',
            description: 'construct.commands.instances',
            permissionLevel: CommandPermissionLevel.Any,
            callback: (origin) => this.run(origin)
        });
    }

    run(origin) {
        const names = instanceCollection.getInstanceNames();
        if (names.length === 0)
            return { status: CustomCommandStatus.Success, message: 'construct.commands.instances.empty' };
        const rawtext = [
            { translate: 'construct.commands.instances.header', with: [String(names.length)] },
            { text: '\n' }
        ];
        for (const name of names) {
            const instance = instanceCollection.get(name);
            const status = this.formatStatus(instance);
            rawtext.push({
                translate: 'construct.commands.instances.row',
                with: { rawtext: [{ text: name }, { text: instance.getStructureId() }, status] }
            });
            rawtext.push({ text: '\n' });
        }
        origin.sendMessage({ rawtext });
        return { status: CustomCommandStatus.Success };
    }

    formatStatus(instance) {
        const statusMessage = { rawtext: [] };
        if (instance.isEnabled())
            statusMessage.rawtext.push({ translate: 'construct.commands.instances.row.enabled' });
        else
            statusMessage.rawtext.push({ translate: 'construct.commands.instances.row.disabled' });
        if (instance.hasLocation()) {
            const { dimensionId, location } = instance.getLocation();
            statusMessage.rawtext.push({ translate: 'construct.commands.instances.row.location', with: [location.toString(), dimensionId.replace('minecraft:', '')] });
        } else {
            statusMessage.rawtext.push({ translate: 'construct.commands.instances.row.nolocation' });
        }
        return statusMessage;
    }
}

export const instancesCommand = new InstancesCommand();
