import { CustomCommandParamType, CustomCommandStatus, EntityComponentTypes, EquipmentSlot, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { PlayerCommandOrigin } from '../classes/Commands/PlayerCommandOrigin';
import { findInstance } from '../classes/Commands/lib/findInstance';
import { requirePlayer } from '../classes/Commands/lib/requirePlayer';
import { commandError } from '../classes/Commands/lib/commandError';
import { MENU_ITEM } from '../consts';

export class TagCommand extends Command {
    constructor() {
        super({
            name: 'tag',
            description: 'construct.commands.tag',
            allowedSources: [PlayerCommandOrigin],
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String }
            ],
            callback: (source, instanceName) => this.run(source, instanceName)
        });
    }

    run(source, instanceName) {
        try {
            const player = requirePlayer(source);
            const instance = findInstance(source, instanceName);
            if (!instance) return { status: CustomCommandStatus.Failure };
            const equipment = player.getComponent(EntityComponentTypes.Equippable);
            const itemStack = equipment?.getEquipment(EquipmentSlot.Mainhand);
            if (itemStack?.typeId !== MENU_ITEM) {
                system.run(() => source.sendMessage({ translate: 'construct.commands.tag.notHoldingItem' }));
                return { status: CustomCommandStatus.Failure };
            }
            system.run(() => {
                itemStack.nameTag = instanceName;
                equipment.setEquipment(EquipmentSlot.Mainhand, itemStack);
                source.sendMessage({
                    rawtext: [{ translate: 'construct.commands.tag.success', with: [instanceName] }]
                });
            });
            return { status: CustomCommandStatus.Success };
        } catch (err) {
            return commandError(source, err);
        }
    }
}

export const tagCommand = new TagCommand();
