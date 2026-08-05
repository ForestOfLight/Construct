import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Cuboid } from '../packs/BP/scripts/classes/Render/outline/Cuboid.js';

const MIN = { x: 10, y: 64, z: -30 };
const MAX = { x: 20, y: 74, z: -20 };

test('a cuboid matches the bounds it was built from', () => {
    const cuboid = new Cuboid(MIN, MAX);
    assert.equal(cuboid.matches(MIN, MAX), true);
});

test('a cuboid matches equal bounds from a different object', () => {
    const cuboid = new Cuboid(MIN, MAX);
    assert.equal(cuboid.matches({ ...MIN }, { ...MAX }), true);
});

test('a cuboid does not match when any component moves', () => {
    const cuboid = new Cuboid(MIN, MAX);
    assert.equal(cuboid.matches({ ...MIN, x: 11 }, MAX), false);
    assert.equal(cuboid.matches({ ...MIN, y: 65 }, MAX), false);
    assert.equal(cuboid.matches({ ...MIN, z: -29 }, MAX), false);
    assert.equal(cuboid.matches(MIN, { ...MAX, x: 21 }), false);
    assert.equal(cuboid.matches(MIN, { ...MAX, y: 75 }), false);
    assert.equal(cuboid.matches(MIN, { ...MAX, z: -19 }), false);
});

test('a cuboid does not match bounds that swap min and max', () => {
    const cuboid = new Cuboid(MIN, MAX);
    assert.equal(cuboid.matches(MAX, MIN), false);
});

test('a cuboid matches across sub-block movement only when it lands the same', () => {
    const cuboid = new Cuboid({ x: 0, y: 0, z: 0 }, { x: 4, y: 4, z: 4 });
    assert.equal(cuboid.matches({ x: 0, y: 0, z: 0 }, { x: 4, y: 4, z: 4 }), true);
    assert.equal(cuboid.matches({ x: 0.5, y: 0, z: 0 }, { x: 4, y: 4, z: 4 }), false);
});
