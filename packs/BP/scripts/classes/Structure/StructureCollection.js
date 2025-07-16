import { InvalidInstanceError } from '../Errors/InvalidInstanceError';
import { InstanceOptions } from '../Instance/InstanceOptions';
import { StructureInstance } from '../Instance/StructureInstance';
import { world } from '@minecraft/server';

class StructureCollection {
    structures;

    constructor() {
        this.structures = {};
    }

    loadExistingInstances() {
        world.getDynamicPropertyIds().filter(id => id.startsWith('instanceOptions:')).forEach(id => {
            const instanceName = id.replace('instanceOptions:', '');
            let structureId;
            try {
                structureId = InstanceOptions.getInstanceStructureId(instanceName);
                this.structures[instanceName] = new StructureInstance(instanceName, structureId);
            } catch (e) {
                world.sendMessage(`§c[Construct] Error loading structure instance '${instanceName}'. It will be removed.`);
                world.setDynamicProperty(id, void 0);
                throw e;
            }
        });
    }

    add(instanceName, structureId) {
        if (this.structures[instanceName])
            throw new InvalidInstanceError(`Instance ${instanceName} already exists.`);
        const structure = new StructureInstance(instanceName, structureId);
        this.structures[instanceName] = structure;
        return structure;
    }

    get(instanceName) {
        const structure = this.structures[instanceName];
        if (!structure)
            throw new InvalidInstanceError(`Instance ${instanceName} not found.`);
        return structure;
    }

    has(instanceName) {
        return Boolean(this.structures[instanceName]);
    }

    delete(instanceName) {
        const struct = this.get(instanceName);
        struct.delete();
        delete this.structures[instanceName];
    }

    getInstanceNames() {
        return Object.keys(this.structures);
    }

    getStructures(dimensionId, location, options = {}) {
        return Object.values(this.structures).filter(structure => {
            try {
                return structure.isLocationActive(dimensionId, structure.toStructureCoords(location), options)
            } catch (e) {
                if (e.name === 'InvalidStructureError') {
                    structureCollection.delete(structure.name);
                    return false;
                } else {
                    throw e;
                }
            }
        });
    }

    getStructure(dimensionId, location, options = {}) {
        return this.getStructures(dimensionId, location, options)[0];
    }

    fetchStructureBlock(dimensionId, location) {
        const structure = this.getStructure(dimensionId, location);
        if (!structure)
            return void 0;
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
            throw new Error(`Instance '${newName}' already exists.`);
        structure.rename(newName);
        this.structures[newName] = structure;
        delete this.structures[instanceName];
        structure.name = newName;
    }
}

export const structureCollection = new StructureCollection();

world.afterEvents.worldLoad.subscribe(() => {
    structureCollection.loadExistingInstances();
});