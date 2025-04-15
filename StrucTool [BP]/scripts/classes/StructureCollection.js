import { StructureInstance } from './StructureInstance';
import { world } from '@minecraft/server';

class StructureCollection {
    structures;

    constructor() {
        this.structures = {};
    }

    loadExistingStructures() {
        world.getDynamicPropertyIds().filter(id => id.startsWith('structOptions:')).forEach(id => {
            const instanceName = id.replace('structOptions:', '');
            let structureId;
            try {
                structureId = StructureInstance.parseOptions(instanceName).structureId;
                this.structures[instanceName] = new StructureInstance(instanceName, structureId);
            } catch (e) {
                world.sendMessage(`§c[StrucTool] Error loading structure instance '${instanceName}'. It will be removed.`);
                world.setDynamicProperty(id, void 0);
                throw e;
            }
        });
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
    structureCollection.loadExistingStructures();
});