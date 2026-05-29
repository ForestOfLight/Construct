export class APIVersionMismatchError extends Error {
    constructor(serverApiVersion, callerApiVersion) {
        super(`API version numbers do not match (${callerApiVersion} != ${serverApiVersion}). Please use API version ${serverApiVersion}.`);
        this.name = 'APIVersionMismatchError';
    }
}