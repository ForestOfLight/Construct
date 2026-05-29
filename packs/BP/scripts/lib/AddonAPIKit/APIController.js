export class APIController {
    #endpoints;
    
    constructor(endpoints) {
        if (this.constructor === APIController)
            throw new Error("Cannot instantiate abstract class 'APIController'");
        this.#endpoints = endpoints;
    }

    get endpoints() {
        return this.#endpoints;
    }
}