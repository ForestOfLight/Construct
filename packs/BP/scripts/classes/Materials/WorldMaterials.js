import { system } from "@minecraft/server";
import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel";
import { StructureBlockConverter } from "../Structure/StructureBlockConverter";

const NEEDED_LEVELS = new Set([
    BlockVerificationLevel.Missing,
    BlockVerificationLevel.NoMatch,
    BlockVerificationLevel.Unknown
]);

export class WorldMaterials {
    #instance;
    #cached;
    #pending;

    static formatUnscannedNote(unscannedCount) {
        if (unscannedCount <= 0)
            return void 0;
        const count = String(unscannedCount).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return { rawtext: [
            { translate: 'construct.instance.materials.unscanned.title' },
            { text: '\n' },
            { translate: 'construct.instance.materials.unscanned.body', with: [count] }
        ]};
    }

    constructor(instance) {
        this.#instance = instance;
    }

    compute() {
        if (!this.#instance.canShowWorldMaterials())
            return Promise.resolve(void 0);
        const knownGrid = this.#instance.verifier.getKnownState();
        const bounds = this.#instance.getActiveBounds();
        const key = WorldMaterials.#keyFor(knownGrid, bounds);
        if (this.#cached?.key === key)
            return Promise.resolve(this.#cached.result);
        if (this.#pending?.key === key)
            return this.#pending.promise;
        return this.#start(knownGrid, bounds, key);
    }

    cancel() {
        if (!this.#pending)
            return;
        system.clearJob(this.#pending.jobId);
        this.#settle(this.#pending, void 0);
    }

    static #keyFor(knownGrid, bounds) {
        const { min, max } = bounds;
        return `${knownGrid.version}:${min.x},${min.y},${min.z}:${max.x},${max.y},${max.z}`;
    }

    #start(knownGrid, bounds, key) {
        const superseded = this.#pending;
        const pending = { key };
        pending.promise = new Promise((resolve) => { pending.resolve = resolve; });
        const result = { materials: {}, unscannedCount: 0 };
        pending.jobId = system.runJob(this.#run(knownGrid, bounds, result, pending));
        this.#pending = pending;
        if (superseded) {
            system.clearJob(superseded.jobId);
            superseded.resolve(pending.promise);
        }
        return pending.promise;
    }

    *#run(knownGrid, bounds, result, pending) {
        try {
            yield* this.#tallyMissing(knownGrid, bounds, result);
        } catch (error) {
            this.#settle(pending, void 0);
            throw error;
        }
        this.#cached = { key: pending.key, result };
        this.#settle(pending, result);
    }

    #settle(pending, value) {
        if (this.#pending === pending)
            this.#pending = void 0;
        pending.resolve(value);
    }

    *#tallyMissing(knownGrid, bounds, result) {
        const location = { x: 0, y: 0, z: 0 };
        for (let y = bounds.min.y; y < bounds.max.y; y++) {
            for (let z = bounds.min.z; z < bounds.max.z; z++) {
                for (let x = bounds.min.x; x < bounds.max.x; x++) {
                    location.x = x;
                    location.y = y;
                    location.z = z;
                    this.#countCell(knownGrid, location, result);
                    yield void 0;
                }
            }
        }
    }

    #countCell(knownGrid, location, result) {
        const verificationLevel = knownGrid.get(location);
        if (!NEEDED_LEVELS.has(verificationLevel))
            return;
        const items = this.#itemsAt(location);
        for (const item of items) {
            result.materials[item.typeId] ??= { count: 0, stackSize: item.maxAmount };
            result.materials[item.typeId].count++;
        }
        if (verificationLevel === BlockVerificationLevel.Unknown && items.length > 0)
            result.unscannedCount++;
    }

    #itemsAt(location) {
        const block = this.#instance.getBlock(location);
        if (!block)
            return [];
        return StructureBlockConverter.toPlaceableItemStacks(block.permutation);
    }
}
