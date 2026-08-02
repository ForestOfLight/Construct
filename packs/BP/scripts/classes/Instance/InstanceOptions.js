import { Vector } from "../../lib/Vector";
import { world } from "@minecraft/server";
import { Option } from "../Option";
import { RenderMode } from "../Enums/RenderMode";
import { DEFAULT_REFRESH_SECONDS, MAX_REFRESH_SECONDS, MIN_REFRESH_SECONDS } from "../Verifier/RefreshRate";

// Hoisted so load() can merge them back over a stored options object.
// loadFromDP shallow-assigns, so a stored verifier replaces this whole
// object and any field added since it was saved comes back undefined.
const VERIFIER_DEFAULTS = Object.freeze({
    isEnabled: true,
    trackPlayerDistance: 5,
    particleLifetime: 10,
    refreshSeconds: DEFAULT_REFRESH_SECONDS
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

    // defaults hold the creating player's preferences. They are applied after
    // load so that the class defaults above are what they replace, and an
    // instance that already has saved options is never touched - load only
    // finds something when this name has been used before.
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
        // Merge the defaults back underneath a stored verifier object, so an
        // instance saved before a field existed doesn't load it as undefined.
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
        this.verifier.refreshSeconds = Math.min(MAX_REFRESH_SECONDS, Math.max(MIN_REFRESH_SECONDS, seconds));
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