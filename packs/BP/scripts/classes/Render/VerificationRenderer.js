import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel";
import { BlockVerificationLevelPerformanceRender } from "./PerformanceRender/BlockVerificationLevelPerformanceRender";
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
        const lifetime = this.#getLifetime(bounds, volume, refreshSeconds);
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

    // How long a particle lives, which is what decides how much of the
    // structure is lit at once. Below the threshold the whole thing is lit.
    // Above it, only a single layer-thick band is, sweeping upward.
    //
    // Dividing the full cycle by the height is what pins that band's cost:
    //
    //   concurrent = blocksPerSecond * lifetime
    //              = (blocksPerTick * 20) * cycle / height
    //              = volume / height          - one layer's area, constant
    //
    // so the number of simultaneous particles is independent of both the
    // structure's size and the refresh rate. The setting changes how fast the
    // band sweeps, never how much is alive. Dropping the divisor would light
    // a 50-cubed build all at once - 125,000 particles instead of 2,500.
    #getLifetime(bounds, volume, refreshSeconds) {
        const cycle = effectiveCycleSeconds(volume, refreshSeconds);
        if (!this.#shouldUseLargeStructureRendering(volume))
            return cycle;
        const height = Math.max(bounds.max.y - bounds.min.y, 1);
        return cycle / height;
    }

    #shouldUseLargeStructureRendering(volume) {
        const maxVolume = 343;
        return this.instance.hasLayerSelected() || volume > maxVolume;
    }

    #renderBlockVerificationLevel(dimension, location, verificationLevel, lifetime, verificationLevels) {
        if (verificationLevel === BlockVerificationLevel.Unknown || verificationLevel === BlockVerificationLevel.Air)
            return;
        const dimensionLocation = {
            dimension: dimension,
            location: this.instance.toGlobalCoords(location)
        };
        // The two layers stack rather than choosing between each other: the box
        // marks the block, the particle shades it. Every level gets both in a
        // mode that asks for both - Performance is the only one that skips the
        // particle layer entirely.
        if (this.#useDebugMarkers)
            new BlockVerificationLevelPerformanceRender(dimensionLocation, verificationLevel, lifetime);
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
