import { world } from "@minecraft/server";

export class Option {
    saveToDP(namespace, id, data) {
        world.setDynamicProperty(`${namespace}:${id}`, JSON.stringify(data));
    }

    loadFromDP(namespace, id) {
        try {
            const options = JSON.parse(world.getDynamicProperty(`${namespace}:${id}`));
            if (options)
                Object.assign(this, options);
            else
                throw new Error("Options not found");
        } catch {
            this.saveToDP(namespace, id, {});
            const options = JSON.parse(world.getDynamicProperty(`${namespace}:${id}`) || "{}");
            Object.assign(this, options);
        }
    }

    clearDP(namespace, id) {
        world.setDynamicProperty(`${namespace}:${id}`, void 0);
    }
}