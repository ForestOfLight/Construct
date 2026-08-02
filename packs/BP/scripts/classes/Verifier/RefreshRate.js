// Written out rather than imported from @minecraft/server so this module stays
// runnable under `node --test`. Everything else in the rate path is
// unverifiable outside the game.
const TICKS_PER_SECOND = 20;

// How fast a full pass over a structure runs: the player picks a target time,
// this turns it into a per-tick block rate.
export class RefreshRate {
    // The hard ceiling on work per tick, for the verifier sweep and the render
    // cursor alike. Set to the historical verifier default so this can never be
    // a performance regression: past this point the refresh setting stops
    // biting and the cycle stretches instead. Raising it needs frame-time
    // measurement on a real build.
    static MAX_BLOCKS_PER_TICK = 20;

    static MIN_SECONDS = 3;
    static MAX_SECONDS = 60;
    static SECONDS_STEP = 3;
    static DEFAULT_SECONDS = 15;

    static clampSeconds(seconds) {
        return Math.min(RefreshRate.MAX_SECONDS, Math.max(RefreshRate.MIN_SECONDS, seconds));
    }

    // Fractional by design - a small structure on a slow setting wants well
    // under one block per tick, and BlockBudget carries the remainder.
    static blocksPerTick(volume, refreshSeconds) {
        if (volume <= 0)
            return 0;
        const seconds = Math.max(refreshSeconds, RefreshRate.MIN_SECONDS);
        return Math.min(volume / (seconds * TICKS_PER_SECOND), RefreshRate.MAX_BLOCKS_PER_TICK);
    }

    // How long a full pass actually takes, which is the requested time until
    // the cap bites and longer after that. This is the number particle lifetime
    // must match: a particle has to survive until the cursor comes back around
    // to redraw it, or the block goes dark in between.
    static cycleSeconds(volume, refreshSeconds) {
        const rate = RefreshRate.blocksPerTick(volume, refreshSeconds);
        if (rate <= 0)
            return 0;
        return volume / (rate * TICKS_PER_SECOND);
    }
}
