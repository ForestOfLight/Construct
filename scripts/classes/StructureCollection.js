import { Structure } from './Structure';

class StructureCollection {
    #structures;

    constructor() {
        this.#structures = {};
    }

    add(name) {
        if (this.#structures[name]) {
            throw new Error(`Structure ${name} already exists.`);
        }
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

    getStructuresAtLocation(location) {
        return Object.values(this.#structures).filter(structure => structure.isLocationActive(structure.toStructureCoords(location)));
    }

    fetchStructureBlock(location) {
        const locatedStructures = this.getStructuresAtLocation(location);
        if (locatedStructures.length === 0)
            return void 0;
        const structure = locatedStructures[0];
        return structure.getBlock(structure.toStructureCoords(location));
    }
}

export const structureCollection = new StructureCollection();