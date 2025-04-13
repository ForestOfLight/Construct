import { StructureInstance } from './StructureInstance';
import { world } from '@minecraft/server';

class StructureCollection {
    structures;

    constructor() {
        this.structures = {};
    }

    add(instanceName, structureId) {
        if (this.structures[instanceName])
            throw new Error(`Instance ${instanceName} already exists.`);
        const structure = new StructureInstance(instanceName, structureId);
        this.structures[instanceName] = structure;
        return structure;
    }

    get(instanceName) {
        const structure = this.structures[instanceName];
        if (!structure) {
            throw new Error(`Instance ${instanceName} not found.`);
        }
        return structure;
    }

    remove(instanceName) {
        const struct = this.get(instanceName);
        struct.removePlacement();
        delete this.structures[instanceName];
    }

    getInstanceNames() {
        return Object.keys(this.structures);
    }

    getStructuresAtLocation(location) {
        return Object.values(this.structures).filter(structure => structure.isLocationActive(structure.toStructureCoords(location)));
    }

    fetchStructureBlock(location) {
        const locatedStructures = this.getStructuresAtLocation(location);
        if (locatedStructures.length === 0)
            return void 0;
        const structure = locatedStructures[0];
        return structure.getBlock(structure.toStructureCoords(location));
    }

    getWorldStructureIds() {
        return world.structureManager.getWorldStructureIds()
            .filter(id => id.startsWith('mystructure:'))
            .map(id => id.replace('mystructure:', ''));
    }

    rename(instanceName, newName) {
        const structure = this.get(instanceName);
        if (this.structures[newName])
            throw new Error(`Instance ${newName} already exists.`);
        this.structures[newName] = structure;
        delete this.structures[instanceName];
        structure.name = newName;
    }
}

export const structureCollection = new StructureCollection();