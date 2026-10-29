import { ParticleLifetime } from "./ParticleLifetime";

const DEFAULT_PARTICLE_LIFETIME_TICKS = 10;
const DEFAULT_BLOCKS_PER_TICK = 10;

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
