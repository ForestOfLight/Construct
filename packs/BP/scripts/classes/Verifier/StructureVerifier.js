import { system } from "@minecraft/server";
import { Vector } from "../../lib/Vector";
import { CellVerifier } from "./CellVerifier";
import { GridBuffers } from "./GridBuffers";
import { DebugBoxSweepObserver, SilentSweepObserver } from "./SweepObserver";
import { VerificationRun } from "./VerificationRun";
import { VerificationSweep } from "./VerificationSweep";
import { InstanceVerifierSettings, StandaloneVerifierSettings } from "./VerifierSettings";

const ORIGIN = Object.freeze({ x: 0, y: 0, z: 0 });

// Keeps an instance's verification grid current: a sweep that walks the whole
// structure on a loop, plus point patches for blocks a player just changed.
export class StructureVerifier {
    #instance;
    #settings;
    #buffers = new GridBuffers();
    #run;
    #loop;
    #isPassPending = false;

    static forInstance(instance) {
        return new StructureVerifier(instance, new InstanceVerifierSettings(instance));
    }

    static standalone(instance, options) {
        return new StructureVerifier(instance, new StandaloneVerifierSettings(options));
    }

    constructor(instance, settings) {
        this.#instance = instance;
        this.#settings = settings;
    }

    isEnabled() {
        return this.#settings.isEnabled();
    }

    getCompletedGrid() {
        return this.#buffers.completed();
    }

    // Anything that moves the active bounds comes through here - a move, a
    // resize, a layer change - so the pass in flight is abandoned rather than
    // finished against bounds that no longer exist.
    refresh() {
        this.#stopLoop();
        this.#cancelRun();
        if (this.#instance.isEnabled())
            this.#startLoop();
    }

    // Resolves with the newly completed grid, or with the previous one if the
    // pass was cut short.
    async verifyStructure(shouldRender = false) {
        if (!this.isEnabled())
            return void 0;
        const bounds = this.#instance.getActiveBounds();
        const volume = Vector.volume(bounds.min, bounds.max);
        if (volume <= 0)
            return this.#buffers.completed();
        this.#cancelRun();
        const run = this.#beginRun(bounds, volume, shouldRender);
        this.#finishRun(run, await run.start());
        return this.#buffers.completed();
    }

    // Re-verifies one cell outside the sweep, for a block a player just changed.
    //
    // Writes BOTH grids. The completed one is what the renderer reads, so it is
    // what makes the change visible. The filling one belongs to the in-flight
    // sweep: if that sweep has already walked past this cell it still holds the
    // stale value and would undo the patch at the next commit - for a whole
    // sweep period, which is the latency this exists to remove.
    patchCell(location) {
        const completed = this.#buffers.completed();
        if (!completed)
            return;
        const cell = this.#tryVerifyCell(location);
        if (!cell)
            return;
        completed.setCell(location, cell.verificationLevel, cell.flags);
        // setCell no-ops on an out-of-range location, so the two grids
        // disagreeing about bounds mid-refresh is safe.
        this.#buffers.filling()?.setCell(location, cell.verificationLevel, cell.flags);
    }

    // The sweep tracks unreadable chunks because it walks blindly. Here the
    // player is standing next to the block they just changed, so the chunk is
    // loaded by definition and a throw means something unexpected. Leave the
    // cell as the sweep last saw it and let the next pass settle it.
    #tryVerifyCell(location) {
        try {
            return this.#newCellVerifier().verify(location);
        } catch {
            return void 0;
        }
    }

    #startLoop() {
        this.#isPassPending = true;
        this.#loop = system.runInterval(() => {
            if (this.#isPassPending)
                this.verifyStructure();
        });
    }

    #stopLoop() {
        if (!this.#loop)
            return;
        system.clearRun(this.#loop);
        this.#loop = void 0;
    }

    #beginRun(bounds, volume, shouldRender) {
        this.#isPassPending = false;
        this.#run = new VerificationRun(
            this.#newSweep(bounds, shouldRender),
            this.#settings.blocksPerTick(volume)
        );
        return this.#run;
    }

    // Guarded on identity because cancelling settles the previous run's promise,
    // and the call awaiting it resumes after the replacement is already in place.
    #finishRun(run, didComplete) {
        if (this.#run === run)
            this.#run = void 0;
        if (!didComplete)
            return;
        this.#buffers.commit();
        this.#isPassPending = true;
    }

    #cancelRun() {
        this.#run?.cancel();
    }

    #newSweep(bounds, shouldRender) {
        return new VerificationSweep({
            bounds,
            grid: this.#buffers.beginPass(bounds),
            origin: this.#instance.toGlobalCoords(ORIGIN),
            cellVerifier: this.#newCellVerifier(),
            observer: this.#newObserver(shouldRender)
        });
    }

    #newCellVerifier() {
        return new CellVerifier(this.#instance, this.#settings.showsBlockPreview());
    }

    #newObserver(shouldRender) {
        if (!shouldRender)
            return new SilentSweepObserver();
        return new DebugBoxSweepObserver(this.#instance, this.#settings.particleLifetimeSeconds());
    }
}
