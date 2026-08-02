import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VerificationGrid } from '../packs/BP/scripts/classes/Verifier/VerificationGrid.js';
import { CellFlags } from '../packs/BP/scripts/classes/Verifier/CellFlags.js';
import { Side } from '../packs/BP/scripts/classes/Enums/Side.js';
import { BlockVerificationLevel } from '../packs/BP/scripts/classes/Enums/BlockVerificationLevel.js';

const ALL_SIDES = 0b111111;

function grid(size = 3) {
    return new VerificationGrid({ min: { x: 0, y: 0, z: 0 }, max: { x: size, y: size, z: size } });
}

const CENTER = { x: 1, y: 1, z: 1 };

test('a cell reads back what was written to it', () => {
    const cells = grid();
    cells.setCell(CENTER, BlockVerificationLevel.NoMatch, CellFlags.pack(0, ALL_SIDES));
    assert.equal(cells.get(CENTER), BlockVerificationLevel.NoMatch);
});

test('a location outside the bounds is unknown rather than an error', () => {
    const cells = grid();
    cells.setCell({ x: 99, y: 0, z: 0 }, BlockVerificationLevel.Match, 0);
    assert.equal(cells.get({ x: 99, y: 0, z: 0 }), BlockVerificationLevel.Unknown);
    assert.equal(cells.indexOf({ x: -1, y: 0, z: 0 }), -1);
});

test('clearing resets levels and flags together', () => {
    const cells = grid();
    cells.setCell(CENTER, BlockVerificationLevel.Match, CellFlags.pack(ALL_SIDES, ALL_SIDES));
    cells.clear();
    assert.equal(cells.get(CENTER), BlockVerificationLevel.Unknown);
    assert.equal(cells.occlusionMaskAt({ x: 1, y: 0, z: 1 }), CellFlags.NONE);
});

test('counts are tallied per level', () => {
    const cells = grid(2);
    cells.setCell({ x: 0, y: 0, z: 0 }, BlockVerificationLevel.Match, 0);
    cells.setCell({ x: 1, y: 0, z: 0 }, BlockVerificationLevel.Match, 0);
    cells.setLevel({ x: 0, y: 1, z: 0 }, BlockVerificationLevel.Skipped);
    const counts = cells.countByLevel();
    assert.equal(counts[BlockVerificationLevel.Match], 2);
    assert.equal(counts[BlockVerificationLevel.Skipped], 1);
    assert.equal(counts[BlockVerificationLevel.Unknown], 5);
});

// The heart of the culling: a face is hidden by the ONE side its neighbor turns
// back towards it, not by the neighbor as a whole.
test('an opaque neighbor hides only the face it turns this way', () => {
    const cells = grid();
    const above = { x: 1, y: 2, z: 1 };
    cells.setCell(above, BlockVerificationLevel.Match, CellFlags.pack(0, 1 << Side.Down));
    const occlusion = cells.occlusionMaskAt(CENTER);
    assert.equal(CellFlags.opaqueMask(occlusion), 1 << Side.Up);
    assert.equal(CellFlags.markerMask(occlusion), 0);
});

// A bottom slab is opaque downwards and open upwards.
test('a one-sided neighbor makes no claim about its far side', () => {
    const cells = grid();
    const slab = { x: 1, y: 1, z: 1 };
    cells.setCell(slab, BlockVerificationLevel.Match, CellFlags.pack(0, 1 << Side.Down));
    assert.equal(CellFlags.opaqueMask(cells.occlusionMaskAt({ x: 1, y: 0, z: 1 })), 1 << Side.Up);
    assert.equal(CellFlags.opaqueMask(cells.occlusionMaskAt({ x: 1, y: 2, z: 1 })), 0);
});

test('marker and opaque neighbors are reported independently', () => {
    const cells = grid();
    cells.setCell({ x: 0, y: 1, z: 1 }, BlockVerificationLevel.NoMatch, CellFlags.pack(1 << Side.East, 0));
    cells.setCell({ x: 2, y: 1, z: 1 }, BlockVerificationLevel.Match, CellFlags.pack(0, 1 << Side.West));
    const occlusion = cells.occlusionMaskAt(CENTER);
    assert.equal(CellFlags.markerMask(occlusion), 1 << Side.West);
    assert.equal(CellFlags.opaqueMask(occlusion), 1 << Side.East);
});

// A missed cull costs a particle; a wrong one punches a hole in the model.
test('a cell on the edge of the bounds is not culled against the outside', () => {
    const cells = grid();
    for (let index = 0; index < Side.COUNT; index++) {
        const offset = Side.OFFSETS[index];
        cells.setCell({ x: 1 + offset.x, y: 1 + offset.y, z: 1 + offset.z },
            BlockVerificationLevel.Match, CellFlags.pack(0, ALL_SIDES));
    }
    assert.equal(CellFlags.opaqueMask(cells.occlusionMaskAt(CENTER)), ALL_SIDES);
    assert.equal(CellFlags.opaqueMask(cells.occlusionMaskAt({ x: 0, y: 0, z: 0 })), 0);
});

test('bounds are matched exactly, position and size alike', () => {
    const cells = grid(3);
    assert.ok(cells.matchesBounds({ min: { x: 0, y: 0, z: 0 }, max: { x: 3, y: 3, z: 3 } }));
    assert.ok(!cells.matchesBounds({ min: { x: 0, y: 0, z: 0 }, max: { x: 3, y: 2, z: 3 } }));
    assert.ok(!cells.matchesBounds({ min: { x: 1, y: 0, z: 0 }, max: { x: 4, y: 3, z: 3 } }));
});
