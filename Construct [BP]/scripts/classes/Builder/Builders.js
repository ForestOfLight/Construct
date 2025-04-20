import { world } from "@minecraft/server";
import { Builder } from "./Builder";

export class Builders {
    static builders = {};

    add(playerId) {
        this.builders[playerId] = new Builder(playerId);
    }

    remove(playerId) {
        delete this.builders[playerId];
    }

    get(id) {
        return this.builders[id];
    }

    onJoin(playerId) {
        this.add(playerId);
    }
}

world.afterEvents.playerJoin.subscribe((event) => Builders.onJoin(event.playerId));
world.beforeEvents.playerLeave.subscribe((event) => Builders.onLeave(event.player));