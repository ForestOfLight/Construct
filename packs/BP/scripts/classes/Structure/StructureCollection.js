import { InstanceExistsError } from '../Errors/InstanceExistsError';
import { InstanceNotFoundError } from '../Errors/InstanceNotFoundError';
import { StructureNotFoundError } from '../Errors/StructureNotFoundError';
import { InstanceOptions } from '../Instance/InstanceOptions';
import { StructureInstance } from '../Instance/StructureInstance';
import { InvalidStructureError, world } from '@minecraft/server';

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
            throw new InstanceExistsError(instanceName);
        const structure = new StructureInstance(instanceName, structureId);
        this.structures[instanceName] = structure;
        return structure;
    }

    get(instanceName) {
        const structure = this.structures[instanceName];
        if (!structure)
            throw new InstanceNotFoundError(instanceName);
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
            } catch (error) {
                if (error instanceof StructureNotFoundError || error instanceof InvalidStructureError) {
                    this.delete(structure.name);
                    return false;
                } else {
                    throw error;
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
        const structureManager = world.structureManager;
        const packIds = [...new Set(structureManager.getPackStructureIds()
            .map(id => id.replace('mystructure:', '')))
        ];
        const packIdSet = new Set(packIds);
        let worldStructureIds = [];
        try {
            worldStructureIds = structureManager.getWorldStructureIds()
                .filter(id => id.startsWith('mystructure:'))
                .map(id => id.replace('mystructure:', ''))
                .filter(id => !packIdSet.has(id));
        } catch (error) {
            console.warn('Failed to fetch world structure IDs. They will be ignored. Error:', error);
        }
        return [...packIds, ...worldStructureIds];
    }

    rename(instanceName, newName) {
        const structure = this.get(instanceName);
        if (this.structures[newName])
            throw new InstanceExistsError(newName);
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