import { CommandResponseError } from "./CommandResponseError";

export class NotAPlayerError extends CommandResponseError {
    constructor(message = 'Command requires a player source.') {
        super(message);
        this.name = 'NotAPlayerError';
    }

    getRawMessage() {
        return { translate: 'construct.commands.error.notAPlayer' };
    }
}
