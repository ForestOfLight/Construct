import { describe, it, expect } from 'vitest';
import { ChunkGrid } from '../../../../../packs/BP/scripts/classes/Verifier/ChunkGrid.js';

const ALIGNED = new ChunkGrid({ x: 0, y: 0, z: 0 });

describe('ChunkGrid', () => {
    it('a span ends at the next chunk boundary', () => {
        expect(ALIGNED.endOfSpanX(0)).toBe(16);
        expect(ALIGNED.endOfSpanX(1)).toBe(16);
        expect(ALIGNED.endOfSpanX(15)).toBe(16);
        expect(ALIGNED.endOfSpanX(16)).toBe(32);
    });

    it('spans follow the world chunk grid, not the structure', () => {
        const offset = new ChunkGrid({ x: 5, y: 0, z: 0 });
        expect(offset.endOfSpanX(0)).toBe(11);
        expect(offset.endOfSpanX(11)).toBe(27);
    });

    it('a span never runs backwards at negative world coordinates', () => {
        const negative = new ChunkGrid({ x: -37, y: 0, z: 0 });
        for (let x = 0; x < 64; x++)
            expect(negative.endOfSpanX(x), `span from ${x} must advance`).toBeGreaterThan(x);
    });

    it('every column of a chunk shares one key', () => {
        const key = ALIGNED.keyAt(0, 0);
        expect(ALIGNED.keyAt(15, 15)).toBe(key);
        expect(ALIGNED.keyAt(16, 0)).not.toBe(key);
        expect(ALIGNED.keyAt(0, 16)).not.toBe(key);
    });

    it('keys stay distinct across the axes and across zero', () => {
        const grid = new ChunkGrid({ x: 0, y: 0, z: 0 });
        const keys = new Set();
        for (let x = -64; x < 64; x += 16)
            {for (let z = -64; z < 64; z += 16)
                keys.add(grid.keyAt(x, z));}
        expect(keys.size).toBe(64);
    });
});
