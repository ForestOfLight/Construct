import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel";

const LEVEL_COUNT = Object.keys(BlockVerificationLevel).length;

export class VerificationLevels {
    #min;
    #sizeX;
    #sizeY;
    #sizeZ;
    #levels;

    constructor(bounds) {
        this.#min = { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z };
        this.#sizeX = Math.max(bounds.max.x - bounds.min.x, 0);
        this.#sizeY = Math.max(bounds.max.y - bounds.min.y, 0);
        this.#sizeZ = Math.max(bounds.max.z - bounds.min.z, 0);
        this.#levels = new Uint8Array(this.#sizeX * this.#sizeY * this.#sizeZ);
    }

    matchesBounds(bounds) {
        return this.#min.x === bounds.min.x && this.#min.y === bounds.min.y && this.#min.z === bounds.min.z
            && this.#sizeX === bounds.max.x - bounds.min.x
            && this.#sizeY === bounds.max.y - bounds.min.y
            && this.#sizeZ === bounds.max.z - bounds.min.z;
    }

    clear() {
        this.#levels.fill(BlockVerificationLevel.Unknown);
    }

    set(location, verificationLevel) {
        const index = this.#indexOf(location);
        if (index === -1)
            return;
        this.#levels[index] = verificationLevel;
    }

    get(location) {
        const index = this.#indexOf(location);
        if (index === -1)
            return BlockVerificationLevel.Unknown;
        return this.#levels[index];
    }

    countByLevel() {
        const counts = new Uint32Array(LEVEL_COUNT);
        for (let index = 0; index < this.#levels.length; index++)
            counts[this.#levels[index]]++;
        return counts;
    }

    #indexOf(location) {
        const x = location.x - this.#min.x;
        const y = location.y - this.#min.y;
        const z = location.z - this.#min.z;
        if (x < 0 || y < 0 || z < 0 || x >= this.#sizeX || y >= this.#sizeY || z >= this.#sizeZ)
            return -1;
        return (y * this.#sizeZ + z) * this.#sizeX + x;
    }
}
