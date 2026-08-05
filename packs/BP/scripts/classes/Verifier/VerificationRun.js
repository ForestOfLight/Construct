import { system } from "@minecraft/server";
import { BlockBudget } from "./BlockBudget";

export class VerificationRun {
    #sweep;
    #blocksPerTick;
    #budget = new BlockBudget();
    #steps;
    #runner;
    #settle;
    #completion;

    constructor(sweep, blocksPerTick) {
        this.#sweep = sweep;
        this.#blocksPerTick = blocksPerTick;
        this.#completion = new Promise((resolve) => { this.#settle = resolve; });
    }

    start() {
        this.#steps = this.#sweep.run();
        this.#runner = system.runInterval(() => this.#advance());
        return this.#completion;
    }

    cancel() {
        this.#settleWith(false);
    }

    #advance() {
        this.#budget.credit(this.#blocksPerTick);
        try {
            while (!this.#budget.isExhausted()) {
                if (!this.#advanceOneStep())
                    return;
            }
        } catch (error) {
            this.#settleWith(false);
            throw error;
        }
    }

    #advanceOneStep() {
        const step = this.#steps.next();
        if (step.done) {
            this.#settleWith(true);
            return false;
        }
        this.#budget.spend(step.value);
        return true;
    }

    #settleWith(didComplete) {
        if (!this.#settle)
            return;
        const settle = this.#settle;
        this.#settle = void 0;
        this.#stop();
        settle(didComplete);
    }

    #stop() {
        if (this.#runner !== void 0)
            system.clearRun(this.#runner);
        this.#runner = void 0;
        this.#steps = void 0;
    }
}
