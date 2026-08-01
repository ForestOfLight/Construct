import { TicksPerSecond } from "@minecraft/server";
import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel";
import { BlockVerificationLevelPerformanceRender } from "./PerformanceRender/BlockVerificationLevelPerformanceRender";
import { BlockPreviewVerificationLevelParticleRender } from "./ParticleRender/BlockPreviewVerificationLevelParticleRender";
import { system } from "@minecraft/server";

const RENDER_LIFETIME_FACTOR_TICKS = 1;

export class VerificationRenderer {
    instance;
    bounds;
    #usePerformanceRendering;

    #runner;
    #cursor = 0;

    constructor(instance, { usePerformanceRendering }) {
        this.instance = instance;
        this.#usePerformanceRendering = usePerformanceRendering;
    }

    refresh() {
        this.#stopContinuousRendering();
        this.#usePerformanceRendering = this.instance.options.performanceRendering;
        if (!this.instance.isEnabled() || !this.instance.options.verifier.isEnabled)
            return;
        this.#startContinuousRendering();
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
        const volume = bounds.min.volume(bounds.max);
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
            this.#renderBlockVerificationLevel(dimension, location, verificationLevels.get(location), lifetime);
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

    #renderBlockVerificationLevel(dimension, location, verificationLevel, lifetime) {
        if (verificationLevel === BlockVerificationLevel.Unknown || verificationLevel === BlockVerificationLevel.Air)
            return;
        const dimensionLocation = {
            dimension: dimension,
            location: this.instance.toGlobalCoords(location)
        };
        const targetPermutation = this.#usePerformanceRendering ? undefined : this.instance.getBlockPermutation(location);
        const blockVerificationLevelType = this.#usePerformanceRendering ? BlockVerificationLevelPerformanceRender : BlockPreviewVerificationLevelParticleRender;
        new blockVerificationLevelType(dimensionLocation, targetPermutation, verificationLevel, lifetime);
    }
}
