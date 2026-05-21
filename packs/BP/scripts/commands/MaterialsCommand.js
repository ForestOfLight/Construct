import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, EntityComponentTypes, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { structureCollection } from '../classes/Structure/StructureCollection';
import { PlayerCommandOrigin } from '../classes/Commands/PlayerCommandOrigin';
import { NotAPlayerError } from '../classes/Errors/NotAPlayerError';

export class MaterialsCommand extends Command {
    constructor() {
        super({
            name: 'materials',
            description: 'construct.commands.materials',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String }
            ],
            optionalParameters: [
                { name: 'missing', type: CustomCommandParamType.Boolean }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (source, instanceName, missing) => this.run(source, instanceName, missing)
        });
    }

    run(source, instanceName, missing) {
        const instance = structureCollection.get(instanceName);
        const onlyMissing = missing === true;
        if (onlyMissing)
            this.assertIsPlayer(source);
        const headerKey = onlyMissing ? 'construct.commands.materials.headerMissing' : 'construct.commands.materials.headerAll';
        const rawtext = [
            { translate: headerKey, with: [instanceName] },
            { text: '\n' }
        ];
        const list = this.getMaterialList(source, instance, onlyMissing);
        if (!list.rawtext || list.rawtext.length === 0)
            rawtext.push({ translate: 'construct.commands.materials.empty' });
        else
            rawtext.push(list);
        source.sendMessage({ rawtext });
        return { status: CustomCommandStatus.Success };
    }

    assertIsPlayer(source) {
        if (!(source instanceof PlayerCommandOrigin))
            throw new NotAPlayerError();
    }

    getMaterialList(source, instance, onlyMissing) {
        const materials = instance.getActiveMaterials();
        let container;
        if (onlyMissing) {
            const player = source.getSource();
            const inventoryComponent = player?.getComponent(EntityComponentTypes.Inventory);
            container = inventoryComponent?.container;
        }
        const materialsMap = onlyMissing ? materials.getMaterialsDifference(container) : void 0;
        return materials.formatString(materialsMap);
    }
}

export const materialsCommand = new MaterialsCommand();
