import { Structure } from './Structure';

class StructureCollection {
    #structures;

    constructor() {
        this.#structures = {};
    }

    add(name) {
        const structure = new Structure(name);
        this.#structures[name] = structure;
        return structure;
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
}

export const structureCollection = new StructureCollection();