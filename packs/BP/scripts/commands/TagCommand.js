import { Command } from '../classes/Commands/Command';
import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, EntityComponentTypes, EquipmentSlot, system } from '@minecraft/server';
import { PlayerCommandOrigin } from '../classes/Commands/PlayerCommandOrigin';
import { MENU_ITEM } from '../consts';
import { structureCollection } from '../classes/Structure/StructureCollection';

export class TagCommand extends Command {
    constructor() {
        super({
            name: 'tag',
            description: 'construct.commands.tag',
            allowedSources: [PlayerCommandOrigin],
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (source, instanceName) => this.run(source, instanceName)
        });
    }

    run(source, instanceName) {
        const instance = structureCollection.get(instanceName);
        const player = source.getSource();
        const equipment = player.getComponent(EntityComponentTypes.Equippable);
        const itemStack = equipment?.getEquipment(EquipmentSlot.Mainhand);
        if (itemStack?.typeId !== MENU_ITEM)
            return { status: CustomCommandStatus.Failure, message: 'construct.commands.tag.notHoldingItem' };
        system.run(() => {
            itemStack.nameTag = instanceName;
            equipment.setEquipment(EquipmentSlot.Mainhand, itemStack);
            source.sendMessage({ translate: 'construct.commands.tag.success', with: [instanceName] });
        });
        return { status: CustomCommandStatus.Success };
    }
}

export const tagCommand = new TagCommand();
