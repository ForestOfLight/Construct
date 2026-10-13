import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tallyMissingMaterials } from '../packs/BP/scripts/classes/Materials/tallyMissingMaterials.js';
import { KnownStateGrid } from '../packs/BP/scripts/classes/Verifier/KnownStateGrid.js';
import { BlockVerificationLevel } from '../packs/BP/scripts/classes/Enums/BlockVerificationLevel.js';

const ANCHOR = { dimensionId: 'minecraft:overworld', worldLocation: { x: 0, y: 0, z: 0 }, structureId: 'mystructure:house' };
const STONE = { typeId: 'minecraft:stone', maxAmount: 64 };
const SLAB = { typeId: 'minecraft:oak_slab', maxAmount: 64 };

function row(length) {
    return { min: { x: 0, y: 0, z: 0 }, max: { x: length, y: 1, z: 1 } };
}

function knownRow(levels) {
    const knownGrid = new KnownStateGrid();
    knownGrid.syncAnchor(ANCHOR, row(levels.length));
    levels.forEach((level, x) => knownGrid.setLevel({ x, y: 0, z: 0 }, level));
    return knownGrid;
}

function tally(knownGrid, bounds, itemsAt = () => [STONE]) {
    const result = { materials: {}, unscannedCount: 0 };
    for (const _ of tallyMissingMaterials({ knownGrid, bounds, itemsAt, result }));
    return result;
}

test('missing and wrong-type blocks are still needed', () => {
    const knownGrid = knownRow([BlockVerificationLevel.Missing, BlockVerificationLevel.NoMatch]);
    const result = tally(knownGrid, row(2));
    assert.deepEqual(result.materials, { 'minecraft:stone': { count: 2, stackSize: 64 } });
    assert.equal(result.unscannedCount, 0);
});

test('placed blocks, air and blocks that should be air are not needed', () => {
    const knownGrid = knownRow([
        BlockVerificationLevel.Match, BlockVerificationLevel.TypeMatch,
        BlockVerificationLevel.Air, BlockVerificationLevel.ShouldBeAir
    ]);
    assert.deepEqual(tally(knownGrid, row(4)).materials, {});
});

test('blocks never checked are counted and reported as unscanned', () => {
    const knownGrid = knownRow([BlockVerificationLevel.Unknown]);
    const result = tally(knownGrid, row(1));
    assert.deepEqual(result.materials, { 'minecraft:stone': { count: 1, stackSize: 64 } });
    assert.equal(result.unscannedCount, 1);
});

test('unchecked cells with no items do not count as unscanned', () => {
    const knownGrid = knownRow([BlockVerificationLevel.Unknown]);
    const result = tally(knownGrid, row(1), () => []);
    assert.deepEqual(result.materials, {});
    assert.equal(result.unscannedCount, 0);
});

test('a block that needs two items counts both', () => {
    const knownGrid = knownRow([BlockVerificationLevel.Missing]);
    const result = tally(knownGrid, row(1), () => [SLAB, SLAB]);
    assert.deepEqual(result.materials, { 'minecraft:oak_slab': { count: 2, stackSize: 64 } });
});

test('items are looked up for the cell being counted', () => {
    const knownGrid = knownRow([BlockVerificationLevel.Missing, BlockVerificationLevel.Missing]);
    const result = tally(knownGrid, row(2), (location) => location.x === 0 ? [STONE] : [SLAB]);
    assert.equal(result.materials['minecraft:stone'].count, 1);
    assert.equal(result.materials['minecraft:oak_slab'].count, 1);
});

test('only cells inside the bounds are counted', () => {
    const knownGrid = new KnownStateGrid();
    knownGrid.syncAnchor(ANCHOR, { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 3, z: 1 } });
    for (let y = 0; y < 3; y++)
        knownGrid.setLevel({ x: 0, y, z: 0 }, BlockVerificationLevel.Missing);
    const layer = { min: { x: 0, y: 1, z: 0 }, max: { x: 1, y: 2, z: 1 } };
    assert.equal(tally(knownGrid, layer).materials['minecraft:stone'].count, 1);
});
