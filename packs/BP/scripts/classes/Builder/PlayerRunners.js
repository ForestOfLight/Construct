export class PlayerRunners {
    #scheduler;
    #runIdByPlayer = new Map();

    constructor(scheduler) {
        this.#scheduler = scheduler;
    }

    start(playerId, callback) {
        this.stop(playerId);
        this.#runIdByPlayer.set(playerId, this.#scheduler.runInterval(callback));
    }

    stop(playerId) {
        const runId = this.#runIdByPlayer.get(playerId);
        if (runId === void 0)
            return;
        this.#scheduler.clearRun(runId);
        this.#runIdByPlayer.delete(playerId);
    }
}
