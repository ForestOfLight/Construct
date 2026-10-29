import { describe, it, expect } from 'vitest';
import { Cuboid } from '../../../../../../packs/BP/scripts/classes/Render/outline/Cuboid.js';

const MIN = { x: 10, y: 64, z: -30 };
const MAX = { x: 20, y: 74, z: -20 };

describe('Cuboid', () => {
    it('a cuboid matches the bounds it was built from', () => {
        const cuboid = new Cuboid(MIN, MAX);
        expect(cuboid.matches(MIN, MAX)).toBe(true);
    });

    it('a cuboid matches equal bounds from a different object', () => {
        const cuboid = new Cuboid(MIN, MAX);
        expect(cuboid.matches({ ...MIN }, { ...MAX })).toBe(true);
    });

    it('a cuboid does not match when any component moves', () => {
        const cuboid = new Cuboid(MIN, MAX);
        expect(cuboid.matches({ ...MIN, x: 11 }, MAX)).toBe(false);
        expect(cuboid.matches({ ...MIN, y: 65 }, MAX)).toBe(false);
        expect(cuboid.matches({ ...MIN, z: -29 }, MAX)).toBe(false);
        expect(cuboid.matches(MIN, { ...MAX, x: 21 })).toBe(false);
        expect(cuboid.matches(MIN, { ...MAX, y: 75 })).toBe(false);
        expect(cuboid.matches(MIN, { ...MAX, z: -19 })).toBe(false);
    });

    it('a cuboid does not match bounds that swap min and max', () => {
        const cuboid = new Cuboid(MIN, MAX);
        expect(cuboid.matches(MAX, MIN)).toBe(false);
    });

    it('a cuboid matches across sub-block movement only when it lands the same', () => {
        const cuboid = new Cuboid({ x: 0, y: 0, z: 0 }, { x: 4, y: 4, z: 4 });
        expect(cuboid.matches({ x: 0, y: 0, z: 0 }, { x: 4, y: 4, z: 4 })).toBe(true);
        expect(cuboid.matches({ x: 0.5, y: 0, z: 0 }, { x: 4, y: 4, z: 4 })).toBe(false);
    });
});
