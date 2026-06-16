export class BuilderNotFoundError extends Error {
    constructor(builderId) {
        super(`§cBuilder "${builderId}" not found.`);
        this.name = 'BuilderNotFoundError';
    }
}