import { InstanceExistsError } from "../../classes/Errors/InstanceExistsError";
import { InstanceNotFoundError } from "../../classes/Errors/InstanceNotFoundError";
import { StructureNotFoundError } from "../../classes/Errors/StructureNotFoundError";
import { APICallerError, VoidModel } from "../../lib/AddonAPIKit/AddonAPIKit";
import { AddInstanceParameterModel, InstanceModel, InstanceNameParameterModel, InstancesModel, StructureMaterialsModel } from "../models/InstancesModel";

export class InstancesController extends APIController {
    #context;

    constructor(context) {
        super({
            "instances": { callback: this.getInstances, parameterModel: VoidModel, returnModel: InstancesModel },
            "instance:get": { callback: this.getInstance, parameterModel: InstanceNameParameterModel, returnModel: InstanceModel },
            "instance:add": { callback: this.addInstance, parameterModel: AddInstanceParameterModel, returnModel: InstanceModel },
            "instance:edit": { callback: this.editInstance, parameterModel: InstanceModel, returnModel: InstanceModel },
            "instance:delete": { callback: this.deleteInstance, parameterModel: InstanceNameParameterModel, returnModel: VoidModel },
            "instance:materials": { callback: this.getMaterials, parameterModel: InstanceNameParameterModel, returnModel: StructureMaterialsModel }
        });
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
