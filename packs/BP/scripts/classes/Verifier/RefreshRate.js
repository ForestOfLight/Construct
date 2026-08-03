import { TicksPerSecond } from "@minecraft/server";

export class RefreshRate {
    static MAX_BLOCKS_PER_TICK = 30;

    static MIN_SECONDS = 1;
    static MAX_SECONDS = 60;
    static SECONDS_STEP = 1;
    static DEFAULT_SECONDS = 15;

    static clampSeconds(seconds) {
        return Math.min(RefreshRate.MAX_SECONDS, Math.max(RefreshRate.MIN_SECONDS, seconds));
    }

    static priorityBlocksPerTick() {
        return RefreshRate.MAX_BLOCKS_PER_TICK;
    }

    static blocksPerTick(volume, refreshSeconds) {
        if (volume <= 0)
            return 0;
        const seconds = Math.max(refreshSeconds, RefreshRate.MIN_SECONDS);
        return Math.min(volume / (seconds * TicksPerSecond), RefreshRate.MAX_BLOCKS_PER_TICK);
    }

    static cycleSeconds(volume, refreshSeconds) {
        const rate = RefreshRate.blocksPerTick(volume, refreshSeconds);
        if (rate <= 0)
            return 0;
        return volume / (rate * TicksPerSecond);
    }
}
