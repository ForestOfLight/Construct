export class CommandResponseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CommandResponseError';
    }

    getRawMessage() {
        throw new Error('getRawMessage() must be implemented by subclasses of CommandResponseError');
    }

    sendTo(source) {
        source.sendMessage(this.getRawMessage());
    }
}
