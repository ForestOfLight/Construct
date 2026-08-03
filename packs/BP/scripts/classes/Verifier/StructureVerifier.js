import { system } from "@minecraft/server";
import { Vector } from "../../lib/Vector";
import { CellVerifier } from "./CellVerifier";
import { GridBuffers } from "./GridBuffers";
import { DebugBoxSweepObserver, SilentSweepObserver } from "./SweepObserver";
import { VerificationRun } from "./VerificationRun";
import { VerificationSweep } from "./VerificationSweep";
import { InstanceVerifierSettings, StandaloneVerifierSettings } from "./VerifierSettings";

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

    refresh() {
        this.#stopLoop();
        this.#cancelRun();
        if (this.#instance.isEnabled())
            this.#startLoop();
    }

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

    patchCell(location) {
        const completed = this.#buffers.completed();
        if (!completed)
            return;
        const cell = this.#tryVerifyCell(location);
        if (!cell)
            return;
        completed.setCell(location, cell.verificationLevel, cell.flags);
        const filling = this.#buffers.filling()
        filling?.setCell(location, cell.verificationLevel, cell.flags);
    }

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
            origin: this.#instance.toGlobalCoords({ x: 0, y: 0, z: 0 }),
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
