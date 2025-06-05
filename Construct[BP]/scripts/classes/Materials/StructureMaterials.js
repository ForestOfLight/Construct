import { ItemStack } from "@minecraft/server";

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

    formatString(otherMaterials = void 0) {
        const materials = otherMaterials || this.materials;
        let message = { rawtext: [] };
        const sortedTypes = Object.keys(materials).sort(
            (a, b) => materials[b].count - materials[a].count
        );
        for (const blockType of sortedTypes) {
            let count = materials[blockType].count;
            let countStr = '';
            const stackSize = materials[blockType].stackSize;
            const fullShulker = 27 * stackSize;
            if (count >= fullShulker)
                countStr = `${Math.floor(count / fullShulker)}\uE200`;
            if (count > fullShulker && count % fullShulker > 0)
                countStr += ' + ';
            count %= fullShulker;
            if (count >= stackSize) {
                const numStacks = Math.floor(count / stackSize);
                countStr += `${numStacks} stack`;
                if (numStacks > 1)
                    countStr += 's';
            }
            if (count > stackSize && count % stackSize > 0)
                countStr += ' + ';
            count %= stackSize;
            if (count > 0)
                countStr += count;
            message.rawtext.push({ text: '§3' });
            message.rawtext.push({ translate: new ItemStack(blockType).localizationKey })
            message.rawtext.push({ text: `§f: ${countStr}\n` });
        }
        return message;
    }

    getMaterialsDifference(container) {
        const missingMaterials = JSON.parse(JSON.stringify(this.materials));
        for (let slotIndex = 0; slotIndex < container.size; slotIndex++) {
            const slot = container.getSlot(slotIndex);
            if (slot.hasItem()) {
                const itemType = slot.getItem().typeId;
                if (!missingMaterials[itemType])
                    continue;
                missingMaterials[itemType].count -= slot.amount;
                if (missingMaterials[itemType].count <= 0)
                    delete missingMaterials[itemType];
            }
        }
        return missingMaterials;
    }
}

export { StructureMaterials };