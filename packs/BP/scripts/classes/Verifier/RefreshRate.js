// Fixed engine constant, written out rather than imported from
// @minecraft/server so this module stays runnable under `node --test`.
// Everything else in the rate path is unverifiable outside the game.
const TICKS_PER_SECOND = 20;

// The hard ceiling on work per tick, for the verifier sweep and the render
// cursor alike. Set to today's verifier default so this change can never be
// a performance regression: past this point the refresh setting stops
// biting and the cycle stretches instead. Raising it needs frame-time
// measurement on a real build.
export const MAX_BLOCKS_PER_TICK = 20;

export const MIN_REFRESH_SECONDS = 3;
export const MAX_REFRESH_SECONDS = 60;
export const REFRESH_SECONDS_STEP = 3;
export const DEFAULT_REFRESH_SECONDS = 15;

// How much of the structure to get through each tick to finish a full pass
// in `refreshSeconds`, capped. Fractional by design - a small structure on
// a slow setting wants well under one block per tick, and BlockBudget
// carries the remainder.
export function blocksPerTick(volume, refreshSeconds) {
    if (volume <= 0)
        return 0;
    const seconds = Math.max(refreshSeconds, MIN_REFRESH_SECONDS);
    return Math.min(volume / (seconds * TICKS_PER_SECOND), MAX_BLOCKS_PER_TICK);
}

// How long a full pass actually takes, which is the requested time until
// the cap bites and longer after that. This is the number particle lifetime
// must match: a particle has to survive until the cursor comes back around
// to redraw it, or the block goes dark in between.
export function effectiveCycleSeconds(volume, refreshSeconds) {
    const rate = blocksPerTick(volume, refreshSeconds);
    if (rate <= 0)
        return 0;
    return volume / (rate * TICKS_PER_SECOND);
}
