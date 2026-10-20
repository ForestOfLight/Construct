import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KnownStateGrid } from '../packs/BP/scripts/classes/Verifier/KnownStateGrid.js';
import { BlockVerificationLevel } from '../packs/BP/scripts/classes/Enums/BlockVerificationLevel.js';

const BOUNDS = { min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 2, z: 2 } };
const ANCHOR = { dimensionId: 'minecraft:overworld', worldLocation: { x: 10, y: 64, z: 10 }, structureId: 'mystructure:house' };
const CELL = { x: 1, y: 1, z: 1 };

function known() {
    const grid = new KnownStateGrid();
    grid.syncAnchor(ANCHOR, BOUNDS);
    return grid;
}

test('a grid that was never synced knows nothing and ignores writes', () => {
    const grid = new KnownStateGrid();
    grid.setLevel(CELL, BlockVerificationLevel.Match);
    assert.equal(grid.get(CELL), BlockVerificationLevel.Unknown);
});

test('a freshly synced grid knows nothing', () => {
    assert.equal(known().get(CELL), BlockVerificationLevel.Unknown);
});

test('every observed level is remembered', () => {
    const grid = known();
    for (const level of [
        BlockVerificationLevel.Match, BlockVerificationLevel.TypeMatch, BlockVerificationLevel.NoMatch,
        BlockVerificationLevel.Missing, BlockVerificationLevel.Air, BlockVerificationLevel.ShouldBeAir
    ]) {
        grid.setLevel(CELL, level);
        assert.equal(grid.get(CELL), level);
    }
});

test('skipped and unknown results keep the previous level', () => {
    const grid = known();
    grid.setLevel(CELL, BlockVerificationLevel.Match);
    grid.setLevel(CELL, BlockVerificationLevel.Skipped);
    grid.setLevel(CELL, BlockVerificationLevel.Unknown);
    assert.equal(grid.get(CELL), BlockVerificationLevel.Match);
});

test('version only moves when a level actually changes', () => {
    const grid = known();
    const start = grid.version;
    grid.setLevel(CELL, BlockVerificationLevel.Missing);
    assert.equal(grid.version, start + 1);
    grid.setLevel(CELL, BlockVerificationLevel.Missing);
    grid.setLevel(CELL, BlockVerificationLevel.Skipped);
    assert.equal(grid.version, start + 1);
    grid.setLevel(CELL, BlockVerificationLevel.Match);
    assert.equal(grid.version, start + 2);
});

test('writes outside the structure are ignored', () => {
    const grid = known();
    const start = grid.version;
    grid.setLevel({ x: 5, y: 0, z: 0 }, BlockVerificationLevel.Match);
    assert.equal(grid.get({ x: 5, y: 0, z: 0 }), BlockVerificationLevel.Unknown);
    assert.equal(grid.version, start);
});

test('syncing an equal anchor keeps what is known', () => {
    const grid = known();
    grid.setLevel(CELL, BlockVerificationLevel.Match);
    const before = grid.version;
    grid.syncAnchor({ ...ANCHOR, worldLocation: { ...ANCHOR.worldLocation } }, BOUNDS);
    assert.equal(grid.get(CELL), BlockVerificationLevel.Match);
    assert.equal(grid.version, before);
});

test('moving, switching dimension, swapping structure or resizing forgets everything', () => {
    const variants = [
        [{ ...ANCHOR, worldLocation: { x: 11, y: 64, z: 10 } }, BOUNDS],
        [{ ...ANCHOR, dimensionId: 'minecraft:nether' }, BOUNDS],
        [{ ...ANCHOR, structureId: 'mystructure:tower' }, BOUNDS],
        [ANCHOR, { min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 3, z: 2 } }]
    ];
    for (const [anchor, bounds] of variants) {
        const grid = known();
        grid.setLevel(CELL, BlockVerificationLevel.Match);
        const before = grid.version;
        grid.syncAnchor(anchor, bounds);
        assert.equal(grid.get(CELL), BlockVerificationLevel.Unknown);
        assert.ok(grid.version > before);
    }
});

test('the anchor is copied, so later edits to the caller object do not matter', () => {
    const anchor = { ...ANCHOR, worldLocation: { ...ANCHOR.worldLocation } };
    const grid = new KnownStateGrid();
    grid.syncAnchor(anchor, BOUNDS);
    grid.setLevel(CELL, BlockVerificationLevel.Match);
    anchor.worldLocation.x = 999;
    grid.syncAnchor(ANCHOR, BOUNDS);
    assert.equal(grid.get(CELL), BlockVerificationLevel.Match);
});
