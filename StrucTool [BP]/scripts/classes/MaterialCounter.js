import { structureCollection } from '../classes/StructureCollection';

class MaterialCounter {
    static getAll(name) {
        const structure = structureCollection.get(name);
        const materials = {};
        for (const block of structure.getAllBlocks()) {
            const typeId = block?.getItemStack()?.typeId.replace('minecraft:', '');
            if (!typeId) continue;
            if (!materials[typeId]) {
                materials[typeId] = 0;
            }
            materials[typeId]++;
        }
        return materials;
    }

    static getLayer(name, layer) {
        const structure = structureCollection.get(name);
        const materials = {};
        for (const block of structure.getLayerBlocks(layer)) {
            const typeId = block?.getItemStack()?.typeId.replace('minecraft:', '');
            if (!typeId) continue;
            if (!materials[typeId]) {
                materials[typeId] = 0;
            }
            materials[typeId]++;
        }
        return materials;
    }

    static getPrintable(name) {
        const structure = structureCollection.get(name);
        const materials = {};
        for (const block of structure.getAllBlocks()) {
            const itemStack = block?.getItemStack();
            const typeId = itemStack?.typeId.replace('minecraft:', '');
            if (!typeId) continue;
            if (!materials[typeId]) {
                materials[typeId] = { count: 0, maxStack: itemStack.maxAmount };
            }
            materials[typeId].count++;
        }
        let message = [];
        for (const blockType in materials) {
            let count = materials[blockType].count;
            let countStr = '';
            const maxStack = materials[blockType].maxStack;
            const fullShulker = 27 * maxStack;
            if (count >= fullShulker) {
                countStr = `${Math.floor(count / fullShulker)} sb`;
            }
            if (count > fullShulker) {
                countStr += ' + ';
            }
            count %= fullShulker;
            if (count >= maxStack) {
                countStr += `${Math.floor(count / maxStack)} stack`;
            }
            if (count > maxStack) {
                countStr += ' + ';
            }
            count %= maxStack;
            if (count > 0) {
                countStr += count;
            }
            message.push(`  ${blockType}: ${countStr}`);
        }
        return message.sort().join('\n');
    }
}

export { MaterialCounter };