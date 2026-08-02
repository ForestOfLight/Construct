import { system } from "@minecraft/server";
import { BlockBudget } from "./BlockBudget";

// Paces one sweep across ticks and settles when it ends, whether it finished,
// was cancelled, or threw.
//
// The budget is spent by this class rather than by the sweep so that a step is
// never started without the credit to pay for it. A step costs up to a whole
// chunk span, so a sweep that checked its own budget mid-step would cover ~16
// blocks regardless of the rate, flattening the slow end of the setting.
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

    // Resolves true if the sweep ran to the end, false if it was cut short.
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
