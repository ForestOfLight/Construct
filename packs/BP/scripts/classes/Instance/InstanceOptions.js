import { Vector } from "../../lib/Vector";
import { world } from "@minecraft/server";
import { Option } from "../Option";
import { RenderMode } from "../Enums/RenderMode";
import { RefreshRate } from "../Verifier/RefreshRate";

const VERIFIER_DEFAULTS = Object.freeze({
    isEnabled: true,
    trackPlayerDistance: 5,
    particleLifetime: 10,
    refreshSeconds: RefreshRate.DEFAULT_SECONDS
});

export class InstanceOptions extends Option {
    #DP_NAMESPACE = "instanceOptions";
    instanceName = void 0;
    structureId = void 0;
    isEnabled = false;
    dimensionId = void 0;
    worldLocation = new Vector();
    currentLayer = 0;
    verifier = { ...VERIFIER_DEFAULTS };
    renderMode = RenderMode.Default;

    static getInstanceStructureId(instanceName) {
        const options = new InstanceOptions(instanceName, void 0);
        return options.structureId;
    }

    constructor(instanceName, structureId, defaults = {}) {
        super();
        this.instanceName = instanceName;
        this.structureId = structureId;
        this.load();
        this.#applyDefaults(defaults);
        this.save();
    }

    #applyDefaults({ renderMode }) {
        if (renderMode !== void 0)
            this.renderMode = renderMode;
    }

    save() {
        this.saveToDP(this.#DP_NAMESPACE, this.instanceName, this);
    }

    load() {
        this.loadFromDP(this.#DP_NAMESPACE, this.instanceName);
        this.worldLocation = Vector.from(this.worldLocation);
        this.verifier = { ...VERIFIER_DEFAULTS, ...this.verifier };
    }
    
    clear() {
        this.clearDP(this.#DP_NAMESPACE, this.instanceName);
    }

    getDimension() {
        return world.getDimension(this.dimensionId);
    }

    setEnabled(enable) {
        this.isEnabled = enable;
        this.save();
    }

    rename(newName) {
        this.clear();
        this.instanceName = newName;
        this.save();
    }

    move(dimensionId, worldLocation) {
        this.dimensionId = dimensionId;
        this.worldLocation = Vector.from(worldLocation).floor();
        this.save();
    }

    setLayer(layer) {
        this.currentLayer = Math.floor(layer);
        this.save();
    }

    setVerifierEnabled(enable) {
        this.verifier.isEnabled = enable;
        this.save();
    }

    setVerifierDistance(distance) {
        this.verifier.trackPlayerDistance = distance;
        this.save();
    }

    setVerifierRefreshSeconds(seconds) {
        this.verifier.refreshSeconds = RefreshRate.clampSeconds(seconds);
        this.save();
    }

    setVerifierParticleLifetime(lifetime) {
        this.verifier.particleLifetime = lifetime;
        this.save();
    }

    setRenderMode(mode) {
        this.renderMode = mode;
        this.save();
    }
}