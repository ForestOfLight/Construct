import { describe, it, expect } from 'vitest';
import { RefreshRate } from '../../../../../packs/BP/scripts/classes/Verifier/RefreshRate.js';
import { TicksPerSecond } from '@minecraft/server';

const CLOSE_DIGITS = 9;
const CAPPED_VOLUME = RefreshRate.MAX_BLOCKS_PER_TICK * 15 * TicksPerSecond * 10;

describe('RefreshRate', () => {
    it('the default refresh is 15 seconds', () => {
        expect(RefreshRate.DEFAULT_SECONDS).toBe(15);
    });

    it('a small structure runs well under the cap', () => {
        expect(RefreshRate.blocksPerTick(343, 15)).toBeCloseTo(343 / 300, CLOSE_DIGITS);
        expect(RefreshRate.blocksPerTick(343, 15)).toBeLessThan(RefreshRate.MAX_BLOCKS_PER_TICK);
    });

    it('a large structure is clamped to the cap', () => {
        expect(RefreshRate.blocksPerTick(CAPPED_VOLUME, 15)).toBe(RefreshRate.MAX_BLOCKS_PER_TICK);
    });

    it('an uncapped structure hits the requested cycle exactly', () => {
        expect(RefreshRate.cycleSeconds(343, 15)).toBeCloseTo(15, CLOSE_DIGITS);
        expect(RefreshRate.cycleSeconds(1000, 15)).toBeCloseTo(15, CLOSE_DIGITS);
    });

    it('a capped structure reports the cycle it actually achieves, not the one requested', () => {
        const achieved = CAPPED_VOLUME / (RefreshRate.MAX_BLOCKS_PER_TICK * TicksPerSecond);
        expect(achieved, 'this volume must actually be cap-bound for the test to mean anything').toBeGreaterThan(15);
        expect(RefreshRate.cycleSeconds(CAPPED_VOLUME, 15)).toBeCloseTo(achieved, CLOSE_DIGITS);
    });

    it('a slow setting produces a sub-one-block-per-tick rate', () => {
        expect(RefreshRate.blocksPerTick(343, 60), 'the whole point of the fractional budget').toBeLessThan(1);
        expect(RefreshRate.cycleSeconds(343, 60)).toBeCloseTo(60, CLOSE_DIGITS);
    });

    it('the fast end of the slider is still uncapped for a small structure', () => {
        expect(RefreshRate.blocksPerTick(343, 3)).toBeLessThan(RefreshRate.MAX_BLOCKS_PER_TICK);
        expect(RefreshRate.cycleSeconds(343, 3)).toBeCloseTo(3, CLOSE_DIGITS);
    });

    it('an empty structure does not divide by zero', () => {
        expect(RefreshRate.blocksPerTick(0, 15)).toBe(0);
        expect(RefreshRate.cycleSeconds(0, 15)).toBe(0);
    });

    it('the slider range is clamped in both directions', () => {
        expect(RefreshRate.clampSeconds(0)).toBe(RefreshRate.MIN_SECONDS);
        expect(RefreshRate.clampSeconds(1000)).toBe(RefreshRate.MAX_SECONDS);
        expect(RefreshRate.clampSeconds(15)).toBe(15);
    });
});
