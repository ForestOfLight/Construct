import { TicksPerSecond } from "@minecraft/server";
import { renderProfileOf } from "../Enums/RenderMode";
import { RefreshRate } from "./RefreshRate";

const DEFAULT_PARTICLE_LIFETIME_TICKS = 10;
const DEFAULT_BLOCKS_PER_TICK = 10;

class ParticleLifetime {
    static MIN_TICKS = 8;

    static toSeconds(ticks) {
        return Math.max(ticks, ParticleLifetime.MIN_TICKS) / TicksPerSecond;
    }
}    

export class InstanceVerifierSettings {
    #instance;

    constructor(instance) {
        this.#instance = instance;
    }

    isEnabled() {
        return this.#verifierOptions().isEnabled;
    }

    blocksPerTick(volume) {
        return RefreshRate.blocksPerTick(volume, this.#verifierOptions().refreshSeconds);
    }

    showsBlockPreview() {
        return renderProfileOf(this.#instance.options.renderMode).blockPreview;
    }

    particleLifetimeSeconds() {
        return ParticleLifetime.toSeconds(this.#verifierOptions().particleLifetime);
    }

    #verifierOptions() {
        return this.#instance.options.verifier;
    }
}

export class StandaloneVerifierSettings {
    #blocksPerTick;
    #particleLifetimeTicks;

    constructor({ blocksPerTick = DEFAULT_BLOCKS_PER_TICK, particleLifetime = DEFAULT_PARTICLE_LIFETIME_TICKS } = {}) {
        this.#blocksPerTick = blocksPerTick;
        this.#particleLifetimeTicks = particleLifetime;
    }

    isEnabled() {
        return true;
    }

    blocksPerTick() {
        return this.#blocksPerTick;
    }

    showsBlockPreview() {
        return true;
    }

    particleLifetimeSeconds() {
        return ParticleLifetime.toSeconds(this.#particleLifetimeTicks);
    }
}
