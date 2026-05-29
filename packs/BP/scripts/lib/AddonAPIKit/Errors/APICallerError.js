import { APIErrorEnum } from "./APIErrorEnum";

export class APICallerError extends Error {
    constructor(error) {
        super(error.message);
        this.errorName = error.name;
        this.errorMessage = error.message;
        this.errorCode = APIErrorEnum.Caller;
        this.name = "APICallerError";
    }
}