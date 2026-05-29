import { BuilderNotFoundError } from "../../classes/Errors/BuilderNotFoundError";
import { APICallerError } from "../../lib/AddonAPIKit";
import { BuilderIdParameterModel } from "../models/BuildersModel";

export class BuildersController extends APIController {
    #context;

    constructor(context) {
        super({
            "builders:get": { callback: this.getBuilder, parameterModel: BuilderIdParameterModel, returnModel: InstanceModel },
            "builders:edit": { callback: this.editBuilder, parameterModel: InstanceModel, returnModel: InstanceModel }
        });
        this.#context = context;
    }

    getBuilder(playerId) {
        try {
            const builder = this.#context.get(playerId);
            return builder.asPacket();
        } catch(error) {
            if (error instanceof BuilderNotFoundErrors)
                throw new APICallerError(error);
            throw error;
        }
    }

    editBuilder(builderOptions) {
        try {
            const builder = this.#context.get(builderOptions.playerId);
            builder.setOptions(builderOptions);
        } catch(error) {
            if (error instanceof BuilderNotFoundError)
                throw new APICallerError(error);
            throw error;
        }
    }
}
