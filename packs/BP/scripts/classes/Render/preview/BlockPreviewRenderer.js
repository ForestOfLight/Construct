import { system } from "@minecraft/server";
import { BlockVerificationLevel } from "../../Enums/BlockVerificationLevel";
import { renderProfileOf } from "../../Enums/RenderMode";
import { effectiveCycleSeconds } from "../../Verifier/RefreshRate";
import { Vector } from "../../../lib/Vector";
import { DebugBoxLayer } from "./DebugBoxLayer";
import { PreviewParticleLayer } from "./PreviewParticleLayer";
import { PreviewSweep } from "./PreviewSweep";

const RENDER_INTERVAL_TICKS = 1;

// Draws an instance's verification results: a debug box marking each cell and a
// particle layer shading it. The two stack rather than choosing between each
// other, and the render mode decides which of them are on.
export class BlockPreviewRenderer {
    instance;

    #profile;
    #sweep = new PreviewSweep();
    #boxes = new DebugBoxLayer();
    #particles;
    #runner;

    constructor(instance) {
        this.instance = instance;
        this.#applyRenderMode();
    }

    refresh() {
        this.#stop();
        this.#applyRenderMode();
        if (!this.instance.isEnabled() || !this.instance.options.verifier.isEnabled)
            return;
        this.#runner = system.runInterval(() => this.#renderNextSlice(), RENDER_INTERVAL_TICKS);
    }

    // Draw one cell now, outside the cursor sweep.
    //
    // The debug box updates in place, which is instant. A particle cannot be
    // recalled once spawned, so the stale one from the previous pass lives out
    // its lifetime alongside the new one - on a wrong-to-correct fix that reads
    // as the old colour fading out under the new.
    renderBlockAt(location) {
        if (!this.#runner)
            return;
        const frame = this.#openFrame();
        if (frame)
            this.#drawCell(frame, location);
    }

    #applyRenderMode() {
        this.#profile = renderProfileOf(this.instance.options.renderMode);
        this.#particles = new PreviewParticleLayer(this.#profile.blockPreview);
    }

    #stop() {
        // Ahead of the runner guard on purpose: persistent boxes outlive the
        // runner that drew them, and an instance can be disabled without one
        // ever having started.
        this.#boxes.clear();
        if (!this.#runner)
            return;
        system.clearRun(this.#runner);
        this.#runner = void 0;
        this.#sweep.reset();
    }

    #renderNextSlice() {
        const frame = this.#openFrame();
        if (!frame)
            return;
        const refreshSeconds = this.instance.options.verifier.refreshSeconds;
        for (const location of this.#sweep.locations(frame.bounds, frame.volume, refreshSeconds))
            this.#drawCell(frame, location);
    }

    // Everything a pass over the current bounds needs, or undefined if there is
    // nothing safe to draw.
    //
    // The completed grid is only usable if it actually describes the bounds we
    // are about to iterate. verifier.refresh() restarts the sweep without
    // touching that grid, so after a layer change, a move or a resize it still
    // describes the OLD bounds until a whole new verification finishes.
    // Drawing through it in the meantime maps new-bounds locations onto old
    // indices, and persistent boxes make that stick: a box is positioned once,
    // when its index is first seen, so one created against the wrong grid never
    // moves again.
    #openFrame() {
        const bounds = this.instance.getActiveBounds();
        const volume = Vector.volume(bounds.min, bounds.max);
        if (volume <= 0)
            return void 0;
        const verificationLevels = this.instance.verifier.getLastVerificationLevels();
        if (!verificationLevels?.matchesBounds(bounds))
            return void 0;
        this.#boxes.retarget(bounds);
        return {
            bounds,
            volume,
            verificationLevels,
            dimension: this.instance.getDimension(),
            // A particle lives exactly one full cursor cycle, so it is still
            // alive when the cursor comes back around to redraw it and the whole
            // structure stays lit at once rather than being swept in a band.
            lifetimeSeconds: effectiveCycleSeconds(volume, this.instance.options.verifier.refreshSeconds)
        };
    }

    #drawCell(frame, location) {
        const verificationLevel = frame.verificationLevels.get(location);
        const origin = this.instance.toGlobalCoords(location);
        // Before the early return below, and deliberately so: a cell that has
        // just become Air or Match still needs its persistent box taken away.
        if (this.#profile.debugMarkers) {
            const index = frame.verificationLevels.indexOf(location);
            this.#boxes.draw(index, frame.dimension, origin, verificationLevel);
        }
        if (!this.#profile.particleOverlays)
            return;
        if (verificationLevel === BlockVerificationLevel.Unknown || verificationLevel === BlockVerificationLevel.Air)
            return;
        this.#particles.draw({
            dimension: frame.dimension,
            origin,
            block: this.instance.getBlock(location),
            verificationLevel,
            lifetimeSeconds: frame.lifetimeSeconds,
            occlusionMask: frame.verificationLevels.occlusionMaskAt(location)
        });
    }
}
