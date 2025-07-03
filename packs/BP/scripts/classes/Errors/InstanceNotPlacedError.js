export class InstanceNotPlacedError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InstanceNotPlacedError';
    }
}