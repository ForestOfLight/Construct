import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ChunkGrid } from '../packs/BP/scripts/classes/Verifier/ChunkGrid.js';

const ALIGNED = new ChunkGrid({ x: 0, y: 0, z: 0 });

test('a span ends at the next chunk boundary', () => {
    assert.equal(ALIGNED.endOfSpanX(0), 16);
    assert.equal(ALIGNED.endOfSpanX(1), 16);
    assert.equal(ALIGNED.endOfSpanX(15), 16);
    assert.equal(ALIGNED.endOfSpanX(16), 32);
});

// A structure rarely sits on a chunk boundary, so the first span of a row is
// usually a partial one - splitting on the structure's own 16s instead would
// attribute two different chunks' failures to one key.
test('spans follow the world chunk grid, not the structure', () => {
    const offset = new ChunkGrid({ x: 5, y: 0, z: 0 });
    assert.equal(offset.endOfSpanX(0), 11);
    assert.equal(offset.endOfSpanX(11), 27);
});

test('a span never runs backwards at negative world coordinates', () => {
    const negative = new ChunkGrid({ x: -37, y: 0, z: 0 });
    for (let x = 0; x < 64; x++)
        assert.ok(negative.endOfSpanX(x) > x, `span from ${x} must advance`);
});

test('every column of a chunk shares one key', () => {
    const key = ALIGNED.keyAt(0, 0);
    assert.equal(ALIGNED.keyAt(15, 15), key);
    assert.notEqual(ALIGNED.keyAt(16, 0), key);
    assert.notEqual(ALIGNED.keyAt(0, 16), key);
});

test('keys stay distinct across the axes and across zero', () => {
    const grid = new ChunkGrid({ x: 0, y: 0, z: 0 });
    const keys = new Set();
    for (let x = -64; x < 64; x += 16)
        for (let z = -64; z < 64; z += 16)
            keys.add(grid.keyAt(x, z));
    assert.equal(keys.size, 64);
});
