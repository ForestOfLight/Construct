export class InvalidStructureError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InvalidStructureError';
    }
}