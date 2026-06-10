import { system, world } from "@minecraft/server";
import { Vector } from "../../lib/Vector";

export class ArmorStandPoser {
    instance;
    dimension;
    location;
    armorStand;

    constructor(instance) {
        this.instance = instance;
        this.pullInstanceData();
    }

    pullInstanceData() {
        try {
            this.dimension = this.instance.getDimension();
            const bounds = this.instance.getBounds();
            this.location = this.instance.toGlobalCoords(bounds.min).add(new Vector(0.5, 0, 0.5));
        } catch (error) {
            if (error instanceof StructureNotFoundError)
                this.disable();
            else
                throw error;
        }
    }

    refresh() {
        this.pullInstanceData();
        if (this.armorStand) {
            this.setLayer(this.instance.getLayer());
            this.move(this.location);
        }
    }

    enable() {
        if (this.armorStand)
            return this.armorStand;
        this.createOrFindArmorStand();
        this.armorStand.triggerEvent("construct:claim");
        this.armorStand.nameTag = "§2" + this.instance.getName();
        this.startRunner();
        this.refresh();
    }

    createOrFindArmorStand() {
        try {
            this.armorStand = world.getEntity(this.instance.options.armorStandPoser.armorStandId);
            if (!this.armorStand)
                this.createArmorStand();
        } catch (error) {
            console.warn(error);
            this.createArmorStand();
        }
        this.instance.options.armorStandPoser.armorStandId = this.armorStand.id;
    }

    createArmorStand() {
        this.armorStand = this.dimension.spawnEntity("minecraft:armor_stand", this.location, { initialRotation: 180 });
    }

    hasArmorStand() {
        return this.armorStand !== void 0;
    }

    disable() {
        this.stopRunner();
        if (this.armorStand?.isValid)
            this.armorStand.remove();
        this.armorStand = void 0;
    }

    startRunner() {
        this.runner = system.runInterval(() => {
            if (!this.armorStand.isValid)
                this.instance.setArmorStandPoserEnabled(false);
        }, 0);
    }

    stopRunner() {
        if (this.runner === void 0)
            return;
        system.clearRun(this.runner);
        this.runner = void 0;
    }

    setLayer(layer) {
        const playAnimationOptions = {
            stopExpression: `v.hologram.layer=${layer-1};return 0;`,
            players: world.getAllPlayers()
        };
        this.armorStand.playAnimation("hologram.align", playAnimationOptions);
        console.warn("set to " + (layer-1));
    }

    move(location) {
        this.location = Vector.from(location);
        this.armorStand.teleport(this.location);
    }
}