import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RefreshRate } from '../packs/BP/scripts/classes/Verifier/RefreshRate.js';

const CLOSE = 1e-9;

const TICKS_PER_SECOND = 20;

// The cap is a tuning number and is expected to move with frame-time
// measurement, so only the default is pinned to a literal. Everything below
// derives its expectations from MAX_BLOCKS_PER_TICK instead.
test('the default refresh is 15 seconds', () => {
    assert.equal(RefreshRate.DEFAULT_SECONDS, 15);
});

test('a small structure runs well under the cap', () => {
    assert.ok(Math.abs(RefreshRate.blocksPerTick(343, 15) - 343 / 300) < CLOSE);
    assert.ok(RefreshRate.blocksPerTick(343, 15) < RefreshRate.MAX_BLOCKS_PER_TICK);
});

// Big enough that 15s would demand more than any plausible cap.
const CAPPED_VOLUME = RefreshRate.MAX_BLOCKS_PER_TICK * 15 * TICKS_PER_SECOND * 10;

test('a large structure is clamped to the cap', () => {
    assert.equal(RefreshRate.blocksPerTick(CAPPED_VOLUME, 15), RefreshRate.MAX_BLOCKS_PER_TICK);
});

test('an uncapped structure hits the requested cycle exactly', () => {
    assert.ok(Math.abs(RefreshRate.cycleSeconds(343, 15) - 15) < CLOSE);
    assert.ok(Math.abs(RefreshRate.cycleSeconds(1000, 15) - 15) < CLOSE);
});

test('a capped structure reports the cycle it actually achieves, not the one requested', () => {
    const achieved = CAPPED_VOLUME / (RefreshRate.MAX_BLOCKS_PER_TICK * TICKS_PER_SECOND);
    assert.ok(achieved > 15, 'this volume must actually be cap-bound for the test to mean anything');
    assert.ok(Math.abs(RefreshRate.cycleSeconds(CAPPED_VOLUME, 15) - achieved) < CLOSE);
});

test('a slow setting produces a sub-one-block-per-tick rate', () => {
    const rate = RefreshRate.blocksPerTick(343, 60);
    assert.ok(rate < 1, 'the whole point of the fractional budget');
    assert.ok(Math.abs(RefreshRate.cycleSeconds(343, 60) - 60) < CLOSE);
});

test('the fast end of the slider is still uncapped for a small structure', () => {
    assert.ok(RefreshRate.blocksPerTick(343, 3) < RefreshRate.MAX_BLOCKS_PER_TICK);
    assert.ok(Math.abs(RefreshRate.cycleSeconds(343, 3) - 3) < CLOSE);
});

test('an empty structure does not divide by zero', () => {
    assert.equal(RefreshRate.blocksPerTick(0, 15), 0);
    assert.equal(RefreshRate.cycleSeconds(0, 15), 0);
});

test('the slider range is clamped in both directions', () => {
    assert.equal(RefreshRate.clampSeconds(0), RefreshRate.MIN_SECONDS);
    assert.equal(RefreshRate.clampSeconds(1000), RefreshRate.MAX_SECONDS);
    assert.equal(RefreshRate.clampSeconds(15), 15);
});
