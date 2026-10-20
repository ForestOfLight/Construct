class CollectedMaterials {
    #items;

    constructor(entries = {}) {
        this.#items = new Map();
        for (const [typeId, amount] of Object.entries(entries ?? {}))
            this.add(typeId, amount);
    }

    static fromInventory(container, materials) {
        const collected = new CollectedMaterials();
        for (let slotIndex = 0; slotIndex < container.size; slotIndex++) {
            const slot = container.getSlot(slotIndex);
            if (!slot.hasItem() || !materials[slot.typeId])
                continue;
            collected.add(slot.typeId, slot.amount);
        }
        return collected;
    }

    get(typeId) {
        return this.#items.get(typeId) ?? 0;
    }

    entries() {
        return this.#items.entries();
    }

    getTotal() {
        let total = 0;
        for (const amount of this.#items.values())
            total += amount;
        return total;
    }

    isEmpty() {
        return this.#items.size === 0;
    }

    add(typeId, amount) {
        if (!Number.isFinite(amount) || amount <= 0)
            return;
        this.#items.set(typeId, this.get(typeId) + Math.floor(amount));
    }

    addAll(other) {
        for (const [typeId, amount] of other.entries())
            this.add(typeId, amount);
    }

    clear() {
        this.#items.clear();
    }

    subtractFrom(materials) {
        const remaining = {};
        for (const [typeId, entry] of Object.entries(materials)) {
            const count = entry.count - this.get(typeId);
            if (count > 0)
                remaining[typeId] = { count, stackSize: entry.stackSize };
        }
        return remaining;
    }

    toJSON() {
        return Object.fromEntries(this.#items);
    }
}

export { CollectedMaterials };
