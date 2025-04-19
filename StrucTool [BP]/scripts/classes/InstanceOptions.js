import { Vector } from "../lib/Vector";
import { world } from "@minecraft/server";

export class InstanceOptions {
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
        world.setDynamicProperty(`instanceOptions:${this.instanceName}`, JSON.stringify(this));
    }

    load() {
        try {
            const options = JSON.parse(world.getDynamicProperty(`instanceOptions:${this.instanceName}`));
            if (options)
                Object.assign(this, options);
            else
                throw new Error("Options not found");
        } catch {
            this.save();
            const options = JSON.parse(world.getDynamicProperty(`instanceOptions:${this.instanceName}`) || "{}");
            Object.assign(this, options);
        }
        this.worldLocation = Vector.from(this.worldLocation);
    }
    
    clear() {
        world.setDynamicProperty(`instanceOptions:${this.instanceName}`, void 0);
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