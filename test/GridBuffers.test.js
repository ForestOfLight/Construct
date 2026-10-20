import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GridBuffers } from '../packs/BP/scripts/classes/Verifier/GridBuffers.js';
import { BlockVerificationLevel } from '../packs/BP/scripts/classes/Enums/BlockVerificationLevel.js';

const BOUNDS = { min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 2, z: 2 } };
const ANCHOR = { dimensionId: 'minecraft:overworld', worldLocation: { x: 0, y: 0, z: 0 }, structureId: 'mystructure:house' };

test('there is no known grid until the first sync', () => {
    assert.equal(new GridBuffers().known(), undefined);
});

test('re-syncing the same anchor keeps the same known grid and what it knows', () => {
    const buffers = new GridBuffers();
    buffers.syncKnown(ANCHOR, BOUNDS);
    const knownGrid = buffers.known();
    knownGrid.setLevel({ x: 0, y: 0, z: 0 }, BlockVerificationLevel.Match);
    buffers.syncKnown(ANCHOR, BOUNDS);
    assert.equal(buffers.known(), knownGrid);
    assert.equal(knownGrid.get({ x: 0, y: 0, z: 0 }), BlockVerificationLevel.Match);
});

test('committing a pass does not touch the known grid', () => {
    const buffers = new GridBuffers();
    buffers.syncKnown(ANCHOR, BOUNDS);
    const before = buffers.known().version;
    buffers.beginPass(BOUNDS).setLevel({ x: 0, y: 0, z: 0 }, BlockVerificationLevel.Missing);
    buffers.commit();
    assert.equal(buffers.known().version, before);
});
