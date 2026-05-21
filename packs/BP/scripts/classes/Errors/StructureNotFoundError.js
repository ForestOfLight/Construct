import { CommandResponseError } from "./CommandResponseError";

export class StructureNotFoundError extends CommandResponseError {
    structureId;

    constructor(structureId) {
        super(`Structure with ID "${structureId}" not found.`);
        this.name = 'StructureNotFoundError';
        this.structureId = structureId;
    }

    getRawMessage() {
        return { translate: 'construct.error.structureNotFound', with: [this.structureId] };
    }
}