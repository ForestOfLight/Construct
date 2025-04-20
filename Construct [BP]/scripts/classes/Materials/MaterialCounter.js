class MaterialCounter {
    instance
    materials;

    constructor(instance) {
        this.instance = instance;
        this.materials = {};
    }

    populateAll() {
        for (const layer = 0; layer < this.instance.getMaxLayer(); layer++)
            this.getLayer(layer)
    }

    populateLayer(layer) {
        for (const block of this.instance.getLayerBlocks(layer))
            this.countBlock(block)
    }

    populateActive() {
        for (const block of this.instance.getActiveBlocks())
            this.countBlock(block)
    }

    countBlock(block) {
        const itemStack = block?.getItemStack();
        const typeId = itemStack?.typeId;
        if (!typeId) return;
        if (!this.materials[typeId])
            this.materials[typeId] = { count: 0, stackSize: itemStack.maxAmount };
        this.materials[typeId].count++;
    }

    clear() {
        this.materials = {}; // does this leak memory??
    }

    toString() {
        const materials = {};
        for (const block of this.instance.getAllBlocks()) {
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