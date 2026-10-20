import { describe, it, expect } from 'vitest';
import { CollectedMaterials } from '../../../../../packs/BP/scripts/classes/Materials/CollectedMaterials.js';

function fakeContainer(stacks) {
    return {
        size: stacks.length,
        getSlot: (index) => ({
            hasItem: () => stacks[index] !== void 0,
            typeId: stacks[index]?.typeId,
            amount: stacks[index]?.amount
        })
    };
}

const materials = {
    'minecraft:stone': { count: 100, stackSize: 64 },
    'minecraft:oak_log': { count: 10, stackSize: 64 }
};

describe('CollectedMaterials', () => {
    it('fromInventory only counts items on the material list', () => {
        const container = fakeContainer([
            { typeId: 'minecraft:stone', amount: 64 },
            void 0,
            { typeId: 'minecraft:dirt', amount: 32 },
            { typeId: 'minecraft:stone', amount: 10 },
            { typeId: 'minecraft:oak_log', amount: 4 }
        ]);
        const collected = CollectedMaterials.fromInventory(container, materials);
        expect(collected.get('minecraft:stone')).toBe(74);
        expect(collected.get('minecraft:oak_log')).toBe(4);
        expect(collected.get('minecraft:dirt')).toBe(0);
        expect(collected.getTotal()).toBe(78);
    });

    it('addAll accumulates amounts', () => {
        const collected = new CollectedMaterials({ 'minecraft:stone': 5 });
        collected.addAll(new CollectedMaterials({ 'minecraft:stone': 3, 'minecraft:oak_log': 2 }));
        expect(collected.get('minecraft:stone')).toBe(8);
        expect(collected.get('minecraft:oak_log')).toBe(2);
    });

    it('add ignores non-positive and invalid amounts', () => {
        const collected = new CollectedMaterials();
        collected.add('minecraft:stone', 0);
        collected.add('minecraft:stone', -4);
        collected.add('minecraft:stone', NaN);
        expect(collected.isEmpty()).toBe(true);
    });

    it('subtractFrom removes collected amounts and drops completed entries', () => {
        const collected = new CollectedMaterials({ 'minecraft:stone': 40, 'minecraft:oak_log': 15 });
        const remaining = collected.subtractFrom(materials);
        expect(remaining).toEqual({ 'minecraft:stone': { count: 60, stackSize: 64 } });
        expect(materials['minecraft:stone'].count, 'input is not mutated').toBe(100);
    });

    it('round-trips through JSON', () => {
        const collected = new CollectedMaterials({ 'minecraft:stone': 12 });
        const restored = new CollectedMaterials(JSON.parse(JSON.stringify(collected)));
        expect(restored.get('minecraft:stone')).toBe(12);
    });

    it('clear empties the collection', () => {
        const collected = new CollectedMaterials({ 'minecraft:stone': 12 });
        collected.clear();
        expect(collected.isEmpty()).toBe(true);
        expect(collected.getTotal()).toBe(0);
    });
});
