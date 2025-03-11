import { world } from '@minecraft/server';
import { Structure } from './Structure';

class StructureCollection {
    #structures;

    constructor() {
        this.#structures = {};
    }

    add(name) {
        const struct = world.structureManager.get(name);
        this.#structures[name] = new Structure(name, struct);
    }

    get(name) {
        const structure = this.#structures[name];
        if (!structure) {
            throw new Error(`Structure ${name} not found.`);
        }
        return structure;
    }

    remove(name) {
        const struct = this.get(name);
        struct.remove();
        delete this.#structures[name];
    }

    place(name, dimensionId, location) {
        const struct = this.get(name);
        if (!struct) {
            throw new Error(`Structure ${name} not found.`);
        }
        struct.place(dimensionId, location);
    }
}

export const structureCollection = new StructureCollection();