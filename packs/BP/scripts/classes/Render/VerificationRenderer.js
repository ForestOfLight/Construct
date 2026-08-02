import { TicksPerSecond } from "@minecraft/server";
import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel";
import { BlockVerificationLevelPerformanceRender } from "./PerformanceRender/BlockVerificationLevelPerformanceRender";
import { BlockPreviewVerificationLevelParticleRender } from "./ParticleRender/BlockPreviewVerificationLevelParticleRender";
import { system } from "@minecraft/server";
import { Vector } from "../../lib/Vector";
import { showsBlockPreview, usesDebugMarkers, usesParticleOverlays } from "../Enums/RenderMode";

const RENDER_LIFETIME_FACTOR_TICKS = 1;

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
        this.#runner = system.runInterval(() => this.#renderNextChunk(), RENDER_LIFETIME_FACTOR_TICKS);
    }

    #stopContinuousRendering() {
        if (!this.#runner)
            return;
        system.clearRun(this.#runner);
        this.#runner = void 0;
        this.#cursor = 0;
    }

    #renderNextChunk() {
        const bounds = this.instance.getActiveBounds();
        const volume = Vector.volume(bounds.min, bounds.max);
        if (volume <= 0)
            return;
        const isLargeStructure = this.#shouldUseLargeStructureRendering(volume);
        const chunkSize = isLargeStructure ? Math.min(bounds.max.x, bounds.max.z) : 1;
        const lifetime = isLargeStructure
            ? this.#getLargeStructureLifetime(bounds, volume, chunkSize)
            : this.#getSmallStructureLifetime(bounds);
        const verificationLevels = this.instance.verifier.getLastVerificationLevels();
        if (!verificationLevels)
            return;
        const dimension = this.instance.getDimension();

        if (this.#cursor >= volume)
            this.#cursor = 0;
        const end = Math.min(this.#cursor + chunkSize, volume);
        for (let index = this.#cursor; index < end; index++) {
            const location = this.#locationAt(bounds, index);
            this.#renderBlockVerificationLevel(dimension, location, verificationLevels.get(location), lifetime, verificationLevels);
        }
        this.#cursor = end === volume ? 0 : end;
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

    #getLargeStructureLifetime(bounds, volume, shortestSideLength) {
        const maxChunk = (volume / shortestSideLength) / (bounds.max.y - bounds.min.y);
        return (maxChunk * RENDER_LIFETIME_FACTOR_TICKS) / TicksPerSecond;
    }

    #getSmallStructureLifetime(bounds) {
        return (bounds.max.x * (bounds.max.y - bounds.min.y) * bounds.max.z * RENDER_LIFETIME_FACTOR_TICKS) / TicksPerSecond;
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
