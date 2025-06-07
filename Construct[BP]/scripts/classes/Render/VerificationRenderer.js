import { TicksPerSecond } from "@minecraft/server";
import { BlockVerificationLevelRender } from "./BlockVerificationLevelRender";
import { system } from "@minecraft/server";

const RENDER_LIFETIME_FACTOR_TICKS = 1;

export class VerificationRenderer {
    instance;
    lastRenderedChunk;
    bounds;
    shortestDimension;
    #runner;
    #renderQueue = [];

    constructor(instance) {
        this.instance = instance;
        this.lastRenderedChunk = 0;
    }

    startContinuousRendering() {
        this.#runner = system.runInterval(() => {
            if (this.#renderQueue.length === 0)
                this.prepareRenderQueue();
            this.renderNextChunk();
        }, RENDER_LIFETIME_FACTOR_TICKS);
    }

    stopContinuousRendering() {
        if (!this.#runner)
            return;
        system.clearRun(this.#runner);
        this.#runner = void 0;
        this.#renderQueue = [];
    }

    refresh() {
        this.stopContinuousRendering();
        if (!this.instance.isEnabled() || !this.instance.options.verifier.isEnabled)
            return;
        this.startContinuousRendering();
    }

    prepareRenderQueue() {
        this.#renderQueue = [];
        const bounds = this.instance.getActiveBounds();
            for (let y = bounds.min.y; y < bounds.max.y; y++) {
                this.prepareRenderQueueLayer(bounds, y);
            }
        this.lastRenderedChunk = 0;
    }

    prepareRenderQueueLayer(bounds, y) {
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

    renderNextChunk() {
        if (this.shouldUseLargeStructureRendering())
            this.renderNextChunkForLargeStructure();
        else
            this.renderNextChunkForSmallStructure();
    }

    renderNextChunkForLargeStructure() {
        const bounds = this.instance.getActiveBounds();
        const shortestSideLength = Math.min(bounds.max.x, bounds.max.z);
        const maxChunk = (bounds.min.volume(bounds.max) / shortestSideLength) / (bounds.max.y - bounds.min.y);
        const lifetime = (maxChunk * RENDER_LIFETIME_FACTOR_TICKS) / TicksPerSecond;
        const verificationLevels = this.instance.verifier.getLastVerificationLevels();
        const dimension = this.instance.getDimension();
        const chunk = this.#renderQueue.splice(0, shortestSideLength);
        for (const location of chunk) {
            const verificationLevel = verificationLevels[JSON.stringify(location)];
            if (!verificationLevel)
                continue;
            const dimensionLocation = {
                dimension: dimension,
                location: this.instance.toGlobalCoords(location)
            };
            new BlockVerificationLevelRender(dimensionLocation, verificationLevel, lifetime);
        }
    }

    renderNextChunkForSmallStructure() {
        const bounds = this.instance.getActiveBounds();
        const lifetime = (bounds.max.x * (bounds.max.y - bounds.min.y) * bounds.max.z * RENDER_LIFETIME_FACTOR_TICKS) / TicksPerSecond;
        const verificationLevels = this.instance.verifier.getLastVerificationLevels();
        const dimension = this.instance.getDimension();
        for (const location of this.#renderQueue.splice(0, 1)) {
            const verificationLevel = verificationLevels[JSON.stringify(location)];
            if (!verificationLevel)
                continue;
            const dimensionLocation = {
                dimension: dimension,
                location: this.instance.toGlobalCoords(location)
            };
            new BlockVerificationLevelRender(dimensionLocation, verificationLevel, lifetime);
        }
    }

    shouldUseLargeStructureRendering() {
        const bounds = this.instance.getActiveBounds();
        const maxVolume = 343;
        return this.instance.hasLayerSelected() || bounds.min.volume(bounds.max) > maxVolume;
    }
}