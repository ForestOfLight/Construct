import { describe, it, expect } from 'vitest';
import { VerificationSweep } from '../../../../../packs/BP/scripts/classes/Verifier/VerificationSweep.js';
import { VerificationGrid } from '../../../../../packs/BP/scripts/classes/Verifier/VerificationGrid.js';
import { KnownStateGrid } from '../../../../../packs/BP/scripts/classes/Verifier/KnownStateGrid.js';
import { BlockVerificationLevel } from '../../../../../packs/BP/scripts/classes/Enums/BlockVerificationLevel.js';

const ANCHOR = { dimensionId: 'minecraft:overworld', worldLocation: { x: 0, y: 0, z: 0 }, structureId: 'mystructure:house' };
const SILENT = { onCellVerified() {} };

function knownGridFor(bounds) {
    const knownGrid = new KnownStateGrid();
    knownGrid.syncAnchor(ANCHOR, bounds);
    return knownGrid;
}

function unloadedChunkError() {
    const error = new Error('unloaded');
    error.name = 'LocationInUnloadedChunkError';
    return error;
}

function sweep({ bounds, knownGrid, levelAt, isUnloaded = () => false }) {
    const cellVerifier = {
        verify(location) {
            if (isUnloaded(location))
                throw unloadedChunkError();
            return { verificationLevel: levelAt(location), flags: 0 };
        }
    };
    const steps = new VerificationSweep({
        bounds, knownGrid, cellVerifier, observer: SILENT,
        grid: new VerificationGrid(bounds),
        origin: { x: 0, y: 0, z: 0 }
    }).run();
    Array.from(steps);
}

describe('VerificationSweep', () => {
    it('verified cells reach the known grid', () => {
        const bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 1, z: 2 } };
        const knownGrid = knownGridFor(bounds);
        sweep({ bounds, knownGrid, levelAt: () => BlockVerificationLevel.NoMatch });
        for (const location of [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 1 }])
            expect(knownGrid.get(location)).toBe(BlockVerificationLevel.NoMatch);
    });

    it('unloaded chunks keep their last known level', () => {
        const bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 32, y: 1, z: 1 } };
        const knownGrid = knownGridFor(bounds);
        knownGrid.setLevel({ x: 20, y: 0, z: 0 }, BlockVerificationLevel.Match);
        sweep({
            bounds, knownGrid,
            levelAt: () => BlockVerificationLevel.Missing,
            isUnloaded: (location) => location.x >= 16
        });
        expect(knownGrid.get({ x: 5, y: 0, z: 0 })).toBe(BlockVerificationLevel.Missing);
        expect(knownGrid.get({ x: 20, y: 0, z: 0 })).toBe(BlockVerificationLevel.Match);
        expect(knownGrid.get({ x: 25, y: 0, z: 0 })).toBe(BlockVerificationLevel.Unknown);
    });

    it('a layer sweep only touches its own layer', () => {
        const structureBounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 3, z: 2 } };
        const layerBounds = { min: { x: 0, y: 1, z: 0 }, max: { x: 2, y: 2, z: 2 } };
        const knownGrid = knownGridFor(structureBounds);
        sweep({ bounds: layerBounds, knownGrid, levelAt: () => BlockVerificationLevel.NoMatch });
        expect(knownGrid.get({ x: 1, y: 1, z: 1 })).toBe(BlockVerificationLevel.NoMatch);
        expect(knownGrid.get({ x: 1, y: 0, z: 1 })).toBe(BlockVerificationLevel.Unknown);
        expect(knownGrid.get({ x: 1, y: 2, z: 1 })).toBe(BlockVerificationLevel.Unknown);
    });

    it('sweeping an unchanged world leaves the version alone', () => {
        const bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 2, z: 2 } };
        const knownGrid = knownGridFor(bounds);
        const levelAt = (location) => location.x === 0 ? BlockVerificationLevel.Match : BlockVerificationLevel.Missing;
        sweep({ bounds, knownGrid, levelAt });
        const afterFirstPass = knownGrid.version;
        sweep({ bounds, knownGrid, levelAt });
        expect(knownGrid.version).toBe(afterFirstPass);
    });
});
