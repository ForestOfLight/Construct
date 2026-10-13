import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, EntityComponentTypes, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { instanceCollection } from '../classes/Instance/InstanceCollection';
import { PlayerCommandOrigin } from '../classes/Commands/PlayerCommandOrigin';
import { NotAPlayerError } from '../classes/Errors/NotAPlayerError';
import { StructureMaterials } from '../classes/Materials/StructureMaterials';
import { WorldMaterials } from '../classes/Materials/WorldMaterials';

export class MaterialsCommand extends Command {
    constructor() {
        super({
            name: 'materials',
            description: 'construct.commands.materials',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String }
            ],
            optionalParameters: [
                { name: 'subtractWorld', type: CustomCommandParamType.Boolean },
                { name: 'subtractInventory', type: CustomCommandParamType.Boolean }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (origin, instanceName, subtractWorld, subtractInventory) =>
                this.run(origin, instanceName, subtractWorld === true, subtractInventory === true)
        });
    }

    run(origin, instanceName, subtractWorld, subtractInventory) {
        const instance = instanceCollection.get(instanceName);
        if (subtractInventory)
            this.assertIsPlayer(origin);
        if (subtractWorld && !instance.canShowWorldMaterials())
            return { status: CustomCommandStatus.Failure, message: this.worldUnavailableKey(instance) };
        system.run(async () => {
            const message = await this.buildMessage(origin, instance, instanceName, subtractWorld, subtractInventory);
            if (message)
                origin.sendMessage(message);
        });
        return { status: CustomCommandStatus.Success };
    }

    assertIsPlayer(origin) {
        if (!(origin instanceof PlayerCommandOrigin))
            throw new NotAPlayerError();
    }

    worldUnavailableKey(instance) {
        if (!instance.isEnabled())
            return 'construct.instance.materials.placeinstance';
        return 'construct.instance.materials.verifieroff';
    }

    async buildMessage(origin, instance, instanceName, subtractWorld, subtractInventory) {
        const baseMaterials = instance.getActiveMaterials();
        let materials = baseMaterials.materials;
        let unscannedNote;
        if (subtractWorld) {
            const worldMaterials = await instance.getWorldMaterials();
            if (!worldMaterials || !instanceCollection.has(instanceName))
                return void 0;
            materials = worldMaterials.materials;
            unscannedNote = WorldMaterials.formatUnscannedNote(worldMaterials.unscannedCount);
        }
        if (subtractInventory)
            materials = StructureMaterials.subtractInventory(materials, this.inventoryOf(origin));
        const rawtext = [
            { translate: this.headerKey(subtractWorld, subtractInventory), with: [instanceName] },
            { text: '\n' }
        ];
        if (unscannedNote)
            rawtext.push(unscannedNote, { text: '§r\n' });
        const list = baseMaterials.formatString(materials);
        if (list.rawtext.length === 0)
            rawtext.push({ translate: 'construct.commands.materials.empty' });
        else
            rawtext.push(list);
        return { rawtext };
    }

    inventoryOf(origin) {
        return origin.getSource()?.getComponent(EntityComponentTypes.Inventory)?.container;
    }

    headerKey(subtractWorld, subtractInventory) {
        if (subtractWorld && subtractInventory)
            return 'construct.commands.materials.headerMissingBoth';
        if (subtractWorld)
            return 'construct.commands.materials.headerMissing';
        if (subtractInventory)
            return 'construct.commands.materials.headerMissingInventory';
        return 'construct.commands.materials.headerAll';
    }
}

export const materialsCommand = new MaterialsCommand();
