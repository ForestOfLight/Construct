import { BlockBudget } from "../../Verifier/BlockBudget";
import { PriorityPass } from "../../Verifier/PriorityPass";
import { RefreshRate } from "../../Verifier/RefreshRate";

export class PreviewSweep {
    #cursor = 0;
    #budget = new BlockBudget();
    #priorityPass = new PriorityPass();

    arm() {
        this.#priorityPass.arm();
    }

    reset() {
        this.#cursor = 0;
        this.#budget.clear();
    }

    *locations(bounds, volume, refreshSeconds) {
        this.#budget.credit(this.#blocksPerTick(volume, refreshSeconds));
        if (this.#budget.isExhausted())
            return;
        if (this.#cursor >= volume)
            this.#cursor = 0;
        while (this.#cursor < volume && !this.#budget.isExhausted()) {
            yield locationAt(bounds, this.#cursor);
            this.#budget.spend(1);
            this.#cursor++;
        }
        if (this.#cursor >= volume) {
            this.#cursor = 0;
            this.#priorityPass.disarm();
        }
    }

    #blocksPerTick(volume, refreshSeconds) {
        if (this.#priorityPass.isArmed())
            return RefreshRate.priorityBlocksPerTick();
        return RefreshRate.blocksPerTick(volume, refreshSeconds);
    }
}

function locationAt(bounds, index) {
    const width = bounds.max.x - bounds.min.x;
    const depth = bounds.max.z - bounds.min.z;
    const layerArea = width * depth;
    const y = bounds.min.y + Math.floor(index / layerArea);
    const withinLayer = index % layerArea;
    if (bounds.max.x < bounds.max.z) {
        return {
            x: bounds.min.x + (withinLayer % width),
            y,
            z: bounds.min.z + Math.floor(withinLayer / width)
        };
    }
    return {
        x: bounds.min.x + Math.floor(withinLayer / depth),
        y,
        z: bounds.min.z + (withinLayer % depth)
    };
}
