import { describe, it, expect } from 'vitest';
import { KnownStateGrid } from '../../../../../packs/BP/scripts/classes/Verifier/KnownStateGrid.js';
import { BlockVerificationLevel } from '../../../../../packs/BP/scripts/classes/Enums/BlockVerificationLevel.js';

const BOUNDS = { min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 2, z: 2 } };
const ANCHOR = { dimensionId: 'minecraft:overworld', worldLocation: { x: 10, y: 64, z: 10 }, structureId: 'mystructure:house' };
const CELL = { x: 1, y: 1, z: 1 };

function known() {
    const grid = new KnownStateGrid();
    grid.syncAnchor(ANCHOR, BOUNDS);
    return grid;
}

describe('KnownStateGrid', () => {
    it('a grid that was never synced knows nothing and ignores writes', () => {
        const grid = new KnownStateGrid();
        grid.setLevel(CELL, BlockVerificationLevel.Match);
        expect(grid.get(CELL)).toBe(BlockVerificationLevel.Unknown);
    });

    it('a freshly synced grid knows nothing', () => {
        expect(known().get(CELL)).toBe(BlockVerificationLevel.Unknown);
    });

    it('every observed level is remembered', () => {
        const grid = known();
        for (const level of [
            BlockVerificationLevel.Match, BlockVerificationLevel.TypeMatch, BlockVerificationLevel.NoMatch,
            BlockVerificationLevel.Missing, BlockVerificationLevel.Air, BlockVerificationLevel.ShouldBeAir
        ]) {
            grid.setLevel(CELL, level);
            expect(grid.get(CELL)).toBe(level);
        }
    });

    it('skipped and unknown results keep the previous level', () => {
        const grid = known();
        grid.setLevel(CELL, BlockVerificationLevel.Match);
        grid.setLevel(CELL, BlockVerificationLevel.Skipped);
        grid.setLevel(CELL, BlockVerificationLevel.Unknown);
        expect(grid.get(CELL)).toBe(BlockVerificationLevel.Match);
    });

    it('version only moves when a level actually changes', () => {
        const grid = known();
        const start = grid.version;
        grid.setLevel(CELL, BlockVerificationLevel.Missing);
        expect(grid.version).toBe(start + 1);
        grid.setLevel(CELL, BlockVerificationLevel.Missing);
        grid.setLevel(CELL, BlockVerificationLevel.Skipped);
        expect(grid.version).toBe(start + 1);
        grid.setLevel(CELL, BlockVerificationLevel.Match);
        expect(grid.version).toBe(start + 2);
    });

    it('writes outside the structure are ignored', () => {
        const grid = known();
        const start = grid.version;
        grid.setLevel({ x: 5, y: 0, z: 0 }, BlockVerificationLevel.Match);
        expect(grid.get({ x: 5, y: 0, z: 0 })).toBe(BlockVerificationLevel.Unknown);
        expect(grid.version).toBe(start);
    });

    it('syncing an equal anchor keeps what is known', () => {
        const grid = known();
        grid.setLevel(CELL, BlockVerificationLevel.Match);
        const before = grid.version;
        grid.syncAnchor({ ...ANCHOR, worldLocation: { ...ANCHOR.worldLocation } }, BOUNDS);
        expect(grid.get(CELL)).toBe(BlockVerificationLevel.Match);
        expect(grid.version).toBe(before);
    });

    it.each([
        ['moving', { ...ANCHOR, worldLocation: { x: 11, y: 64, z: 10 } }, BOUNDS],
        ['switching dimension', { ...ANCHOR, dimensionId: 'minecraft:nether' }, BOUNDS],
        ['swapping structure', { ...ANCHOR, structureId: 'mystructure:tower' }, BOUNDS],
        ['resizing', ANCHOR, { min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 3, z: 2 } }]
    ])('%s forgets everything', (_, anchor, bounds) => {
        const grid = known();
        grid.setLevel(CELL, BlockVerificationLevel.Match);
        const before = grid.version;
        grid.syncAnchor(anchor, bounds);
        expect(grid.get(CELL)).toBe(BlockVerificationLevel.Unknown);
        expect(grid.version).toBeGreaterThan(before);
    });

    it('the anchor is copied, so later edits to the caller object do not matter', () => {
        const anchor = { ...ANCHOR, worldLocation: { ...ANCHOR.worldLocation } };
        const grid = new KnownStateGrid();
        grid.syncAnchor(anchor, BOUNDS);
        grid.setLevel(CELL, BlockVerificationLevel.Match);
        anchor.worldLocation.x = 999;
        grid.syncAnchor(ANCHOR, BOUNDS);
        expect(grid.get(CELL)).toBe(BlockVerificationLevel.Match);
    });
});
