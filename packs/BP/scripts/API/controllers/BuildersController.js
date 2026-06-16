import { BuilderNotFoundError } from "../../classes/Errors/BuilderNotFoundError";
import { APICallerError, APIController } from "../../lib/AddonAPIKit";
import { BuilderIdParameterModel, BuilderModel } from "../ConstructAPIModel";

export class BuildersController extends APIController {
    #context;

    constructor(context) {
        super();
        this.addEndpoint("builder:get", this.getBuilder, BuilderIdParameterModel, BuilderModel);
        this.addEndpoint("builder:edit", this.editBuilder, BuilderModel, BuilderModel);
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
