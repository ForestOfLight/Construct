import { TicksPerSecond } from "@minecraft/server";

export class ParticleLifetime {
    static MIN_TICKS = 8;

    static toSeconds(ticks) {
        return Math.max(ticks, ParticleLifetime.MIN_TICKS) / TicksPerSecond;
    }
}
