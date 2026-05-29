import { world } from "@minecraft/server";
import { Builder } from "./Builder";
import { BuilderNotFoundError } from "../Errors/BuilderNotFoundError";

export class Builders {
    static builders = {};

    static add(playerId) {
        if (Builders.builders[playerId])
            return;
        Builders.builders[playerId] = new Builder(playerId);
    }

    static remove(playerId) {
        delete Builders.builders[playerId];
    }

    static get(id) {
        const builder = Builders.builders[id];
        if (builder === void 0)
            throw new BuilderNotFoundError(id);
    }

    static onJoin(playerId) {
        Builders.add(playerId);
    }

    static onLeave(playerId) {
        Builders.remove(playerId);
    }

    static getIds() {
        return Object.keys(Builders.builders);
    }
}

world.afterEvents.playerJoin.subscribe((event) => Builders.onJoin(event.playerId));
world.beforeEvents.playerLeave.subscribe((event) => {
    if (!event.player)
        return;
    Builders.onLeave(event.player.id);
});
world.afterEvents.worldLoad.subscribe(() => {
    for (const player of world.getAllPlayers()) {
        if (!player)
            continue;
        Builders.onJoin(player.id);
    }
});