import { CustomCommandParamType, CustomCommandStatus, EntityComponentTypes, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { findInstance } from '../classes/Commands/lib/findInstance';
import { requirePlayer } from '../classes/Commands/lib/requirePlayer';
import { commandError } from '../classes/Commands/lib/commandError';

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
            callback: (source, instanceName, missing) => this.run(source, instanceName, missing)
        });
    }

    run(source, instanceName, missing) {
        try {
            const instance = findInstance(source, instanceName);
            if (!instance) return { status: CustomCommandStatus.Failure };
            const onlyMissing = missing === true;
            let container;
            let headerKey;
            if (onlyMissing) {
                const player = requirePlayer(source);
                container = player.getComponent(EntityComponentTypes.Inventory)?.container;
                headerKey = 'construct.commands.materials.headerMissing';
            } else {
                headerKey = 'construct.commands.materials.headerAll';
            }
            system.run(() => {
                const materials = instance.getActiveMaterials();
                const materialsMap = onlyMissing
                    ? materials.getMaterialsDifference(container)
                    : undefined;
                const list = materials.formatString(materialsMap);
                const rawtext = [
                    { translate: headerKey, with: [instanceName] },
                    { text: '\n' }
                ];
                if (!list.rawtext || list.rawtext.length === 0)
                    rawtext.push({ translate: 'construct.commands.materials.empty' });
                else
                    rawtext.push(list);
                source.sendMessage({ rawtext });
            });
            return { status: CustomCommandStatus.Success };
        } catch (err) {
            return commandError(source, err);
        }
    }
}

export const materialsCommand = new MaterialsCommand();
