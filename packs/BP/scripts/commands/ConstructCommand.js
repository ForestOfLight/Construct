import { CommandPermissionLevel, CustomCommandStatus, EntityComponentTypes, ItemStack, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { PlayerCommandOrigin } from '../classes/Commands/PlayerCommandOrigin';
import { MENU_ITEM } from '../consts';

export class ConstructCommand extends Command {
    constructor() {
        super({
            name: 'construct',
            description: 'construct.commands.construct',
            cheatsRequired: false,
            allowedSources: [PlayerCommandOrigin],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (source) => this.run(source)
        });
    }

    run(source) {
        const player = source.getSource();
        system.run(() => {
            this.giveMenuItem(player);
        });
        return { status: CustomCommandStatus.Success };
    }

    giveMenuItem(player) {
        const inventoryComponent = player.getComponent(EntityComponentTypes.Inventory);
        const inventoryContainer = inventoryComponent?.container;
        const remaining = inventoryContainer?.addItem(new ItemStack(MENU_ITEM));
        if (remaining)
            player.sendMessage({ translate: 'construct.commands.construct.fail' });
        else
            player.sendMessage({ translate: 'construct.commands.construct.success' });
    }
}

export const constructCommand = new ConstructCommand();
