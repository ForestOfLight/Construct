import { TicksPerSecond } from "@minecraft/server";
import { BlockVerificationLevelParticleRender } from "./ParticleRender/BlockVerificationLevelParticleRender";
import { BlockVerificationLevelPerformanceRender } from "./PerformanceRender/BlockVerificationLevelPerformanceRender";
import { BlockPreviewVerificationLevelParticleRender } from "./ParticleRender/BlockPreviewVerificationLevelParticleRender";
import { system } from "@minecraft/server";

const RENDER_LIFETIME_FACTOR_TICKS = 1;

export class VerificationRenderer {
    instance;
    lastRenderedChunk;
    bounds;
    shortestDimension;
    #usePerformanceRendering;

    #runner;
    #renderQueue = [];

    constructor(instance, { usePerformanceRendering }) {
        this.instance = instance;
        this.lastRenderedChunk = 0;
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
        this.#runner = system.runInterval(() => {
            if (this.#renderQueue.length === 0)
                this.#prepareRenderQueue();
            this.#renderNextChunk();
        }, RENDER_LIFETIME_FACTOR_TICKS);
    }

    #stopContinuousRendering() {
        if (!this.#runner)
            return;
        system.clearRun(this.#runner);
        this.#runner = void 0;
        this.#renderQueue = [];
    }

    #prepareRenderQueue() {
        this.#renderQueue = [];
        const bounds = this.instance.getActiveBounds();
            for (let y = bounds.min.y; y < bounds.max.y; y++) {
                this.#prepareRenderQueueLayer(bounds, y);
            }
        this.lastRenderedChunk = 0;
    }

    #prepareRenderQueueLayer(bounds, y) {
        if (bounds.max.x < bounds.max.z) {
            for (let z = bounds.min.z; z < bounds.max.z; z++) {
                for (let x = bounds.min.x; x < bounds.max.x; x++) {
                    this.#renderQueue.push({ x, y, z });
                }
            }
        } else {
            for (let x = bounds.min.x; x < bounds.max.x; x++) {
                for (let z = bounds.min.z; z < bounds.max.z; z++) {
                    this.#renderQueue.push({ x, y, z });
                }
            }
        }
    }

    #renderNextChunk() {
        if (this.#shouldUseLargeStructureRendering())
            this.#renderNextChunkForLargeStructure();
        else
            this.#renderNextChunkForSmallStructure();
    }

    #renderNextChunkForLargeStructure() {
        const bounds = this.instance.getActiveBounds();
        const shortestSideLength = Math.min(bounds.max.x, bounds.max.z);
        const maxChunk = (bounds.min.volume(bounds.max) / shortestSideLength) / (bounds.max.y - bounds.min.y);
        const lifetime = (maxChunk * RENDER_LIFETIME_FACTOR_TICKS) / TicksPerSecond;
        const verificationLevels = this.instance.verifier.getLastVerificationLevels();
        const dimension = this.instance.getDimension();
        const chunk = this.#renderQueue.splice(0, shortestSideLength);
        for (const location of chunk) {
            const verificationLevel = verificationLevels[JSON.stringify(location)];
            this.#renderBlockVerificationLevel(dimension, location, verificationLevel, lifetime);
        }
    }

    #renderNextChunkForSmallStructure() {
        const bounds = this.instance.getActiveBounds();
        const lifetime = (bounds.max.x * (bounds.max.y - bounds.min.y) * bounds.max.z * RENDER_LIFETIME_FACTOR_TICKS) / TicksPerSecond;
        const verificationLevels = this.instance.verifier.getLastVerificationLevels();
        const dimension = this.instance.getDimension();
        const nextBlock = this.#renderQueue.splice(0, 1);
        for (const location of nextBlock) {
            const verificationLevel = verificationLevels[JSON.stringify(location)];
            this.#renderBlockVerificationLevel(dimension, location, verificationLevel, lifetime);
        }
    }

    #shouldUseLargeStructureRendering() {
        const bounds = this.instance.getActiveBounds();
        const maxVolume = 343;
        return this.instance.hasLayerSelected() || bounds.min.volume(bounds.max) > maxVolume;
    }

    #renderBlockVerificationLevel(dimension, location, verificationLevel, lifetime) {
        if (!verificationLevel)
            return;
        const dimensionLocation = {
            dimension: dimension,
            location: this.instance.toGlobalCoords(location)
        };
        const blockVerificationLevelType = this.#usePerformanceRendering ? BlockVerificationLevelPerformanceRender : BlockPreviewVerificationLevelParticleRender;
        new blockVerificationLevelType(dimensionLocation, verificationLevel, lifetime);
    }
}
