import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CollectedMaterials } from '../packs/BP/scripts/classes/Materials/CollectedMaterials.js';

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

test('fromInventory only counts items on the material list', () => {
    const container = fakeContainer([
        { typeId: 'minecraft:stone', amount: 64 },
        void 0,
        { typeId: 'minecraft:dirt', amount: 32 },
        { typeId: 'minecraft:stone', amount: 10 },
        { typeId: 'minecraft:oak_log', amount: 4 }
    ]);
    const collected = CollectedMaterials.fromInventory(container, materials);
    assert.equal(collected.get('minecraft:stone'), 74);
    assert.equal(collected.get('minecraft:oak_log'), 4);
    assert.equal(collected.get('minecraft:dirt'), 0);
    assert.equal(collected.getTotal(), 78);
});

test('addAll accumulates amounts', () => {
    const collected = new CollectedMaterials({ 'minecraft:stone': 5 });
    collected.addAll(new CollectedMaterials({ 'minecraft:stone': 3, 'minecraft:oak_log': 2 }));
    assert.equal(collected.get('minecraft:stone'), 8);
    assert.equal(collected.get('minecraft:oak_log'), 2);
});

test('add ignores non-positive and invalid amounts', () => {
    const collected = new CollectedMaterials();
    collected.add('minecraft:stone', 0);
    collected.add('minecraft:stone', -4);
    collected.add('minecraft:stone', NaN);
    assert.equal(collected.isEmpty(), true);
});

test('subtractFrom removes collected amounts and drops completed entries', () => {
    const collected = new CollectedMaterials({ 'minecraft:stone': 40, 'minecraft:oak_log': 15 });
    const remaining = collected.subtractFrom(materials);
    assert.deepEqual(remaining, { 'minecraft:stone': { count: 60, stackSize: 64 } });
    assert.equal(materials['minecraft:stone'].count, 100, 'input is not mutated');
});

test('round-trips through JSON', () => {
    const collected = new CollectedMaterials({ 'minecraft:stone': 12 });
    const restored = new CollectedMaterials(JSON.parse(JSON.stringify(collected)));
    assert.equal(restored.get('minecraft:stone'), 12);
});

test('clear empties the collection', () => {
    const collected = new CollectedMaterials({ 'minecraft:stone': 12 });
    collected.clear();
    assert.equal(collected.isEmpty(), true);
    assert.equal(collected.getTotal(), 0);
});
