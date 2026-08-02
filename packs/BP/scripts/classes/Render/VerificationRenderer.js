import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel";
import { DebugBoxStore } from "./PerformanceRender/DebugBoxStore";
import { BlockPreviewVerificationLevelParticleRender } from "./ParticleRender/BlockPreviewVerificationLevelParticleRender";
import { system } from "@minecraft/server";
import { Vector } from "../../lib/Vector";
import { showsBlockPreview, usesDebugMarkers, usesParticleOverlays } from "../Enums/RenderMode";
import { BlockBudget } from "../Verifier/BlockBudget";
import { blocksPerTick, effectiveCycleSeconds } from "../Verifier/RefreshRate";

const RENDER_INTERVAL_TICKS = 1;

export class VerificationRenderer {
    instance;
    bounds;
    // Resolved from the render mode once per refresh rather than per block -
    // #renderBlockVerificationLevel runs for every block of every chunk.
    #useDebugMarkers;
    #useParticleOverlays;
    #showBlockPreview;

    #runner;
    #cursor = 0;
    #budget = new BlockBudget();
    #boxStore = new DebugBoxStore();

    constructor(instance) {
        this.instance = instance;
        this.#pullRenderMode();
    }

    refresh() {
        this.#stopContinuousRendering();
        this.#pullRenderMode();
        if (!this.instance.isEnabled() || !this.instance.options.verifier.isEnabled)
            return;
        this.#startContinuousRendering();
    }

    #pullRenderMode() {
        const mode = this.instance.options.renderMode;
        this.#useDebugMarkers = usesDebugMarkers(mode);
        this.#useParticleOverlays = usesParticleOverlays(mode);
        this.#showBlockPreview = showsBlockPreview(mode);
    }

    #startContinuousRendering() {
        this.#runner = system.runInterval(() => this.#renderNextChunk(), RENDER_INTERVAL_TICKS);
    }

    #stopContinuousRendering() {
        // Ahead of the runner guard on purpose. Persistent boxes outlive the
        // runner that drew them, and an instance can be disabled without one
        // ever having started - either way the boxes have to go, or they are
        // left in the world with nothing holding a handle to them.
        this.#boxStore.clear();
        if (!this.#runner)
            return;
        system.clearRun(this.#runner);
        this.#runner = void 0;
        this.#cursor = 0;
        this.#budget.clear();
    }

    #renderNextChunk() {
        const bounds = this.instance.getActiveBounds();
        const volume = Vector.volume(bounds.min, bounds.max);
        if (volume <= 0)
            return;
        const verificationLevels = this.instance.verifier.getLastVerificationLevels();
        if (!verificationLevels)
            return;

        const refreshSeconds = this.instance.options.verifier.refreshSeconds;
        // A particle lives exactly one full cursor cycle, so it is still alive
        // when the cursor comes back around to redraw it and the whole
        // structure stays lit at once rather than being swept in a band.
        //
        // That makes the simultaneous particle count the structure's volume,
        // which the refresh rate does not bound - a slower setting redraws less
        // often but each particle lives proportionally longer. What bounds it
        // is face culling: occlusionMaskAt drops every face an opaque neighbor
        // seals, so a solid build spawns its shell rather than its volume.
        const lifetime = effectiveCycleSeconds(volume, refreshSeconds);
        this.#budget.credit(blocksPerTick(volume, refreshSeconds));
        if (this.#budget.isExhausted())
            return;

        const dimension = this.instance.getDimension();
        if (this.#cursor >= volume)
            this.#cursor = 0;
        let index = this.#cursor;
        while (index < volume && !this.#budget.isExhausted()) {
            const location = this.#locationAt(bounds, index);
            this.#renderBlockVerificationLevel(dimension, location, verificationLevels.get(location), lifetime, verificationLevels);
            this.#budget.spend(1);
            index++;
        }
        this.#cursor = index >= volume ? 0 : index;
    }

    // Draw one cell now, outside the cursor sweep.
    //
    // The debug box updates in place, which is instant and leaves no overlap.
    // A particle cannot be recalled once spawned, so the stale one from the
    // previous cursor pass lives out its lifetime alongside the new one - on a
    // wrong-to-correct fix that reads as the old colour fading out under the
    // new. Boxes are the responsive layer; particles catch up.
    renderBlockAt(location) {
        if (!this.#runner)
            return;
        const verificationLevels = this.instance.verifier.getLastVerificationLevels();
        if (!verificationLevels)
            return;
        const bounds = this.instance.getActiveBounds();
        const volume = Vector.volume(bounds.min, bounds.max);
        if (volume <= 0)
            return;
        const lifetime = effectiveCycleSeconds(volume, this.instance.options.verifier.refreshSeconds);
        this.#renderBlockVerificationLevel(
            this.instance.getDimension(), location, verificationLevels.get(location), lifetime, verificationLevels,
        );
    }

    #locationAt(bounds, index) {
        const width = bounds.max.x - bounds.min.x;
        const depth = bounds.max.z - bounds.min.z;
        const layerIndex = index % (width * depth);
        const y = bounds.min.y + Math.floor(index / (width * depth));
        if (bounds.max.x < bounds.max.z) {
            return {
                x: bounds.min.x + (layerIndex % width),
                y,
                z: bounds.min.z + Math.floor(layerIndex / width)
            };
        }
        return {
            x: bounds.min.x + Math.floor(layerIndex / depth),
            y,
            z: bounds.min.z + (layerIndex % depth)
        };
    }

    // The two layers stack rather than choosing between each other: the box
    // marks the block, the particle shades it. Every level gets both in a mode
    // that asks for both - Performance is the only one that skips the particle
    // layer entirely.
    //
    // The box is handled before the early return below, and deliberately so: a
    // cell that has just become Air or Match still needs its persistent box
    // taken away, and returning first would strand it there permanently.
    #renderBlockVerificationLevel(dimension, location, verificationLevel, lifetime, verificationLevels) {
        const dimensionLocation = {
            dimension: dimension,
            location: this.instance.toGlobalCoords(location)
        };
        if (this.#useDebugMarkers)
            this.#boxStore.show(verificationLevels.indexOf(location), dimension, dimensionLocation.location, verificationLevel);
        if (verificationLevel === BlockVerificationLevel.Unknown || verificationLevel === BlockVerificationLevel.Air)
            return;
        if (!this.#useParticleOverlays)
            return;
        // Only a missing block has a model worth drawing - nothing else is
        // rendering in that cell - so the preview flag reaches no other level,
        // and an incorrect block's overlay is the plain translucent cube
        // whatever the mode.
        const showPreview = verificationLevel === BlockVerificationLevel.Missing && this.#showBlockPreview;
        new BlockPreviewVerificationLevelParticleRender(
            dimensionLocation, this.instance.getBlock(location),
            verificationLevel, lifetime, verificationLevels.occlusionMaskAt(location), showPreview,
        );
    }
}
