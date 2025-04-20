import { Vector } from "../../lib/Vector";
import { world } from "@minecraft/server";
import { Option } from "../Option";

export class InstanceOptions extends Option {
    #DP_NAMESPACE = "instanceOptions";
    instanceName = void 0;
    structureId = void 0;
    isEnabled = false;
    dimensionId = void 0;
    worldLocation = new Vector();
    currentLayer = 0;
    verifier = {
        isEnabled: true,
        trackPlayerDistance: 5,
        intervalOrLifetime: 10
    };

    static getInstanceStrucetureId(instanceName) {
        const options = new InstanceOptions(instanceName, void 0);
        return options.structureId;
    }

    constructor(instanceName, structureId) {
        this.instanceName = instanceName;
        this.structureId = structureId;
        this.load();
    }

    save() {
        this.saveToDP(this.#DP_NAMESPACE, this.instanceName, this);
    }

    load() {
        this.loadFromDP(this.#DP_NAMESPACE, this.instanceName);
        this.worldLocation = Vector.from(this.worldLocation);
    }
    
    clear() {
        this.clearDP(this.#DP_NAMESPACE, this.instanceName);
    }

    getDimension() {
        return world.getDimension(this.dimensionId);
    }

    enable() {
        this.isEnabled = true;
        this.save();
    }

    disable() {
        this.isEnabled = false;
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
        this.currentLayer = layer;
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
}