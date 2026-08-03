import { system } from "@minecraft/server";
import { BlockVerificationLevel } from "../../Enums/BlockVerificationLevel";
import { renderProfileOf } from "../../Enums/RenderMode";
import { RefreshRate } from "../../Verifier/RefreshRate";
import { Vector } from "../../../lib/Vector";
import { DebugBoxLayer } from "./DebugBoxLayer";
import { PreviewParticleLayer } from "./PreviewParticleLayer";
import { PreviewSweep } from "./PreviewSweep";

const RENDER_INTERVAL_TICKS = 1;

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

    refresh(isPriority = false) {
        this.#stop();
        this.#applyRenderMode();
        if (!this.instance.isEnabled() || !this.instance.options.verifier.isEnabled)
            return;
        if (isPriority)
            this.#sweep.arm();
        this.#runner = system.runInterval(() => this.#renderNextSlice(), RENDER_INTERVAL_TICKS);
    }

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

    #openFrame() {
        const bounds = this.instance.getActiveBounds();
        const volume = Vector.volume(bounds.min, bounds.max);
        if (volume <= 0)
            return void 0;
        const grid = this.instance.verifier.getCompletedGrid();
        if (!grid?.matchesBounds(bounds))
            return void 0;
        this.#boxes.retarget(bounds);
        return {
            bounds,
            volume,
            grid,
            dimension: this.instance.getDimension(),
            lifetimeSeconds: RefreshRate.cycleSeconds(volume, this.instance.options.verifier.refreshSeconds)
        };
    }

    #drawCell(frame, location) {
        const verificationLevel = frame.grid.get(location);
        const origin = this.instance.toGlobalCoords(location);
        if (this.#profile.debugMarkers) {
            const index = frame.grid.indexOf(location);
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
            occlusionMask: frame.grid.occlusionMaskAt(location)
        });
    }
}
