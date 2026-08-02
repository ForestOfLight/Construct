import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    blocksPerTick,
    effectiveCycleSeconds,
    MAX_BLOCKS_PER_TICK,
    DEFAULT_REFRESH_SECONDS,
} from '../packs/BP/scripts/classes/Verifier/RefreshRate.js';

const CLOSE = 1e-9;

test('the default is 15 seconds and the cap is 10 blocks per tick', () => {
    assert.equal(DEFAULT_REFRESH_SECONDS, 15);
    assert.equal(MAX_BLOCKS_PER_TICK, 10);
});

test('a small structure runs well under the cap', () => {
    assert.ok(Math.abs(blocksPerTick(343, 15) - 343 / 300) < CLOSE);
    assert.ok(blocksPerTick(343, 15) < MAX_BLOCKS_PER_TICK);
});

test('a large structure is clamped to the cap', () => {
    assert.equal(blocksPerTick(8000, 15), MAX_BLOCKS_PER_TICK);
    assert.equal(blocksPerTick(125000, 15), MAX_BLOCKS_PER_TICK);
});

test('an uncapped structure hits the requested cycle exactly', () => {
    assert.ok(Math.abs(effectiveCycleSeconds(343, 15) - 15) < CLOSE);
    assert.ok(Math.abs(effectiveCycleSeconds(1000, 15) - 15) < CLOSE);
});

test('a capped structure reports the cycle it actually achieves, not the one requested', () => {
    assert.ok(Math.abs(effectiveCycleSeconds(8000, 15) - 40) < CLOSE);
    assert.ok(Math.abs(effectiveCycleSeconds(125000, 15) - 625) < CLOSE);
});

test('a slow setting produces a sub-one-block-per-tick rate', () => {
    const rate = blocksPerTick(343, 60);
    assert.ok(rate < 1, 'the whole point of the fractional budget');
    assert.ok(Math.abs(effectiveCycleSeconds(343, 60) - 60) < CLOSE);
});

test('the fast end of the slider is still uncapped for a small structure', () => {
    assert.ok(blocksPerTick(343, 3) < MAX_BLOCKS_PER_TICK);
    assert.ok(Math.abs(effectiveCycleSeconds(343, 3) - 3) < CLOSE);
});

test('an empty structure does not divide by zero', () => {
    assert.equal(blocksPerTick(0, 15), 0);
    assert.equal(effectiveCycleSeconds(0, 15), 0);
});
