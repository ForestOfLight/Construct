import { CommandPermissionLevel, CustomCommandStatus, EntityComponentTypes, ItemStack, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { PlayerCommandOrigin } from '../classes/Commands/PlayerCommandOrigin';
import { requirePlayer } from '../classes/Commands/lib/requirePlayer';
import { commandError } from '../classes/Commands/lib/commandError';
import { MENU_ITEM } from '../consts';

export class ConstructCommand extends Command {
    constructor() {
        super({
            name: 'construct',
            description: 'construct.commands.construct',
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false,
            allowedSources: [PlayerCommandOrigin],
            callback: (source) => this.run(source)
        });
    }

    run(source) {
        try {
            const player = requirePlayer(source);
            system.run(() => {
                const remaining = player.getComponent(EntityComponentTypes.Inventory)
                    ?.container?.addItem(new ItemStack(MENU_ITEM));
                if (remaining)
                    player.sendMessage({ translate: 'construct.commands.construct.fail' });
                else
                    player.sendMessage({ translate: 'construct.commands.construct.success' });
            });
            return { status: CustomCommandStatus.Success };
        } catch (err) {
            return commandError(source, err);
        }
    }
}

export const constructCommand = new ConstructCommand();
