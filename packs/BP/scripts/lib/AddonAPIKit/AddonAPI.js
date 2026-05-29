import { IPC, PROTO } from "./MCBE-IPC/ipc";
import { APICallerError } from "./Errors/APICallerError";
import { APIErrorEnum } from "./Errors/APIErrorEnum";
import { APIServerError } from "./Errors/APIServerError";
import { APIVersionMismatchError } from "./Errors/APIVersionMismatchError";
import { ReturnModelShell } from "./APIModels";

export class AddonAPI {
    #name;
    #version;

    constructor(name, version) {
        this.#name = name;
        this.#version = version;
    }

    get name() {
        return this.#name;
    }

    get version() {
        return this.#version;
    }

    get endpointBase() {
        return this.#name + ':';
    }

    setupController(apiController) {
        for (const [endpoint, features] of Object.entries(apiController.endpoints)) {
            const {callback, parameterModel, returnModel} = features;
            const boundCallback = callback.bind(apiController);
            this.#setupEndpoint(endpoint, boundCallback, parameterModel, returnModel);
        }
    }

    #setupEndpoint(endpoint, callback, parameterModel, returnDataModel) {
        const returnPacketModel = this.#resolveReturnModel(returnDataModel);
        const endpointPath = this.endpointBase + endpoint;
        IPC.handle(endpointPath, parameterModel, returnPacketModel, (callPacket) => {
            const apiVersion = callPacket.apiVersion;
            const parameters = Object.values(callPacket.parameterMap);
            return this.#handleCallback(apiVersion, callback, parameters);
        });
    }

    #handleCallback(apiVersion, callback, parameters) {
        try {
            this.#assertVersionsMatch(apiVersion);
            const returnValue = callback(...parameters);
            return this.#bundleReturnPacket({ code: APIErrorEnum.Success }, returnValue);
        } catch(error) {
            if (error instanceof APICallerError)
                const errorPacket = this.#resolveErrorPacket(error);
                return this.#bundleReturnPacket(errorPacket);
            console.error(error);
            const apiError = new APIServerError(error);
            const errorPacket = this.#resolveErrorPacket(apiError);
            return this.#bundleReturnPacket(errorPacket);
        }
    }

    #assertVersionsMatch(versionToCheck) {
        if (versionToCheck !== this.version) {
            const apiVersionMismatchError = new APIVersionMismatchError(this.version, versionToCheck);
            throw new APICallerError(apiVersionMismatchError);
        }
    }

    #resolveReturnModel(returnDataModel) {
        let returnModel = { ...ReturnModelShell };
        returnModel.data = returnDataModel;
        returnModel = PROTO.Object(returnModel);
        return returnModel;
    }

    #bundleReturnPacket(errorPacket, returnValue = void 0) {
        return { 
            apiVersion: this.version,
            data: returnValue,
            error: errorPacket
        };
    }

    #resolveErrorPacket(error) {
        return {
            code: error.errorCode,
            name: error.thrownError.name,
            message: error.thrownError.message
        };
    }
}