import { renderProfileOf } from "../Enums/RenderMode";
import { ParticleLifetime } from "./ParticleLifetime";
import { RefreshRate } from "./RefreshRate";

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
