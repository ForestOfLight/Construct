import { InstanceExistsError } from "../../classes/Errors/InstanceExistsError";
import { InstanceNotFoundError } from "../../classes/Errors/InstanceNotFoundError";
import { StructureNotFoundError } from "../../classes/Errors/StructureNotFoundError";
import { APICallerError, VoidModel, APIController } from "../../lib/AddonAPIKit";
import { AddInstanceParameterModel, InstanceModel, InstanceNameParameterModel, InstancesModel, StructureMaterialsModel } from "../models/InstancesModel";

export class InstancesController extends APIController {
    #context;

    constructor(context) {
        super();
        this.addEndpoint("instances", this.getInstances, VoidModel, InstancesModel);
        this.addEndpoint("instance:get", this.getInstance, InstanceNameParameterModel, InstanceModel);
        this.addEndpoint("instance:add", this.addInstance, AddInstanceParameterModel, InstanceModel);
        this.addEndpoint("instance:edit", this.editInstance, InstanceModel, InstanceModel);
        this.addEndpoint("instance:delete", this.deleteInstance, InstanceNameParameterModel, VoidModel);
        this.addEndpoint("instance:materials", this.getMaterials, InstanceNameParameterModel, StructureMaterialsModel);
        this.#context = context;
    }

    getInstances() {
        return this.#context.getInstanceNames();
    }

    getInstance(instanceName) {
        try {
            const instance = this.#context.get(instanceName);
            return instance.asPacket();
        } catch(error) {
            if (error instanceof InstanceNotFoundError)
                throw new APICallerError(error);
            throw error;
        }
    }

    addInstance(instanceName, structureId) {
        try {
            const instance = this.#context.add(instanceName, structureId);
            return instance.asPacket();
        } catch(error) {
            if (error instanceof InstanceExistsError || error instanceof StructureNotFoundError)
                throw new APICallerError(error);
            throw error;
        }
    }

    editInstance(instanceName, instanceOptions) {
        try {
            const instance = this.#context.get(instanceName);
            instance.setOptions(instanceOptions);
        } catch(error) {
            if (error instanceof InstanceNotFoundError || error instanceof InstanceExistsError || error instanceof StructureNotFoundError)
                throw new APICallerError(error);
            throw error;
        }
    }

    deleteInstance(instanceName) {
        try {
            this.#context.delete(instanceName);
        } catch (error) {
            if (error instanceof InstanceNotFoundError)
                throw new APICallerError(error);
            throw error;
        }
    }

    getMaterials(instanceName) {
        try {
            const instance = this.#context.get(instanceName);
            const structureMaterials = instance.getActiveMaterials();
            return structureMaterials.allMaterials;
        } catch(error) {
            if (error instanceof InstanceNotFoundError)
                throw new APICallerError(error);
            throw error;
        }
    }
}
