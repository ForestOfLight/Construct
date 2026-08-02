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

// Where a verifier reads its settings from.
export class InstanceVerifierSettings {
    #instance;

    constructor(instance) {
        this.#instance = instance;
    }

    isEnabled() {
        return this.#verifierOptions().isEnabled;
    }

    // Derived per pass rather than cached: selecting a layer shrinks the active
    // volume, and the cycle should tighten to match without the player touching
    // the refresh setting.
    blocksPerTick(volume) {
        return RefreshRate.blocksPerTick(volume, this.#verifierOptions().refreshSeconds);
    }

    // Whether a missing block will be drawn as its own model, which decides
    // what shape its cell offers its neighbors. Read once per pass rather than
    // per block, the way the renderer does it.
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

// A verifier with no instance options behind it, for the one-shot sweep behind
// the statistics form. It renders no preview of its own, so its cells describe
// themselves the way the default render mode would.
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
