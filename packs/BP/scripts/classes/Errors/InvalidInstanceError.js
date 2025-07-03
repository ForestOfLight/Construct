export class InvalidInstanceError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InvalidInstanceError';
    }
}