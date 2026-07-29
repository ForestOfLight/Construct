import { InstanceExistsError } from '../Errors/InstanceExistsError';
import { InstanceNotFoundError } from '../Errors/InstanceNotFoundError';
import { StructureNotFoundError } from '../Errors/StructureNotFoundError';
import { InstanceOptions } from './InstanceOptions';
import { StructureInstance } from './StructureInstance';
import { InvalidStructureError, world } from '@minecraft/server';

class InstanceCollection {
    instances;

    constructor() {
        this.instances = {};
    }

    loadExistingInstances() {
        world.getDynamicPropertyIds().filter(id => id.startsWith('instanceOptions:')).forEach(id => {
            const instanceName = id.replace('instanceOptions:', '');
            let structureId;
            try {
                structureId = InstanceOptions.getInstanceStructureId(instanceName);
                this.instances[instanceName] = new StructureInstance(instanceName, structureId);
            } catch (e) {
                world.sendMessage(`§c[Construct] Error loading structure instance '${instanceName}'. It will be removed.`);
                world.setDynamicProperty(id, void 0);
                throw e;
            }
        });
    }

    add(instanceName, structureId) {
        if (this.instances[instanceName])
            throw new InstanceExistsError(instanceName);
        const instance = new StructureInstance(instanceName, structureId);
        this.instances[instanceName] = instance;
        return instance;
    }

    get(instanceName) {
        const instance = this.instances[instanceName];
        if (!instance)
            throw new InstanceNotFoundError(instanceName);
        return instance;
    }

    has(instanceName) {
        return Boolean(this.instances[instanceName]);
    }

    delete(instanceName) {
        const instance = this.get(instanceName);
        instance.delete();
        delete this.instances[instanceName];
    }

    getInstanceNames() {
        return Object.keys(this.instances);
    }

    getInstancesAt(dimensionId, location, options = {}) {
        return Object.values(this.instances).filter(instance => {
            try {
                return instance.isLocationActive(dimensionId, instance.toStructureCoords(location), options)
            } catch (error) {
                if (error instanceof StructureNotFoundError || error instanceof InvalidStructureError) {
                    this.delete(instance.name);
                    return false;
                } else {
                    throw error;
                }
            }
        });
    }

    getInstanceAt(dimensionId, location, options = {}) {
        return this.getInstancesAt(dimensionId, location, options)[0];
    }

    fetchStructureBlock(dimensionId, location) {
        const instance = this.getInstanceAt(dimensionId, location);
        if (!instance)
            return void 0;
        return instance.getBlockPermutation(instance.toStructureCoords(location));
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
        if (this.instances[newName])
            throw new InstanceExistsError(newName);
        structure.rename(newName);
        this.instances[newName] = structure;
        delete this.instances[instanceName];
        structure.name = newName;
    }
}

export const instanceCollection = new InstanceCollection();

world.afterEvents.worldLoad.subscribe(() => {
    instanceCollection.loadExistingInstances();
});