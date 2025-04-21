class StructureMaterials {
    instance;
    materials;

    constructor(instance) {
        this.instance = instance;
        this.materials = {};
    }

    refresh() {
        this.clear();
        this.populateInstance();
    }

    populateInstance() {
        try {
            if (this.instance.hasLocation())
                this.populateActive();
            else
                this.populateAll();
        } catch (e) {
            if (e.name === 'InstanceNotPlacedError')
                this.clear();
            else
                throw e;
        }
    }

    get(itemType) {
        return this.materials[itemType];
    }

    isEmpty() {
        return Object.keys(this.materials).length === 0;
    }

    has(itemType) {
        return this.materials[itemType] !== undefined;
    }

    remove(itemType, amount) {
        if (!this.materials[itemType]) return;
        this.materials[itemType].count -= amount;
        if (this.materials[itemType].count <= 0)
            delete this.materials[itemType];
    }

    populateAll() {
        for (let layer = 0; layer < this.instance.getMaxLayer(); layer++)
            this.populateLayer(layer)
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
        for (const key in this.materials)
            delete this.materials[key];
    }

    toString() {
        let message = [];
        for (const blockType in this.materials) {
            let count = this.materials[blockType].count;
            let countStr = '';
            const stackSize = this.materials[blockType].stackSize;
            const fullShulker = 27 * stackSize;
            if (count >= fullShulker)
                countStr = `${Math.floor(count / fullShulker)} \uE200`;
            if (count > fullShulker)
                countStr += ' + ';
            count %= fullShulker;
            if (count >= stackSize)
                countStr += `${Math.floor(count / stackSize)} stack`;
            if (count > stackSize)
                countStr += ' + ';
            count %= stackSize;
            if (count > 0)
                countStr += count;
            message.push(`  ${blockType}: ${countStr}`);
        }
        return message.sort().join('\n');
    }
}

export { StructureMaterials };