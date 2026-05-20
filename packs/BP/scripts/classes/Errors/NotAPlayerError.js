export class NotAPlayerError extends Error {
    constructor(message = 'Command requires a player source.') {
        super(message);
        this.name = 'NotAPlayerError';
    }
}
