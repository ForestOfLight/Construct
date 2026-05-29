import { APIErrorEnum } from "./APIErrorEnum";

export class APIServerError extends Error {
    constructor(error) {
        super(error.message);
        this.thrownError = error;
        this.errorCode = APIErrorEnum.Server;
        this.name = "APIServerError";
    }
}