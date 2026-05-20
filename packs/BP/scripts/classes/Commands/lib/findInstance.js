import { system } from '@minecraft/server';
import { structureCollection } from '../../Structure/StructureCollection';

export function findInstance(source, name) {
    if (!structureCollection.has(name)) {
        system.run(() => source.sendMessage({
            rawtext: [{ translate: 'construct.commands.error.instanceNotFound', with: [name] }]
        }));
        return null;
    }
    return structureCollection.get(name);
}
