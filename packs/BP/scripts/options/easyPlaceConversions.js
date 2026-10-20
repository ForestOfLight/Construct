export const bannedBlocks = [
    /^air$/, /^bed$/, /^(sticky_)?piston_arm_collision$/, /^skeleton_skull$/, /^(standing|wall)_banner$/,
    /_door$/, /^dried_ghast$/, /shulker_box$/
];

export const bannedDimensionBlocks = {
    'overworld': [],
    'nether': ['water'],
    'end': []
};

export const whitelistedBlockStates = {
    'water': { liquid_depth: 0 },
    'lava': { liquid_depth: 0 }
};

export const bannedToValidBlockPatterns = [
    { input: /^lit_(?!pumpkin$)(.+)$/, output: ['$1'] },
    { input: /^unlit_(.+)$/, output: ['$1'] },
    { input: /^powered_(.+)$/, output: ['unpowered_$1'] }
];

export const resetToBlockStates = {
    growth: 0,
    age: 0,
    height: 0,
    bite_counter: 0,
    fill_level: 0,
    redstone_signal: 0,
    cluster_count: 0,
    respawn_anchor_charge: 0,
    turtle_egg_count: 0,
    composter_fill_level: 0,
    end_portal_eye_bit: false
};

export const blockIdToItemStackPatterns = [
    { input: /^water$/, output: ['water_bucket'] },
    { input: /^lava$/, output: ['lava_bucket'] },
    { input: /^(soul_)?fire$/, output: ['fire_charge'] },
    { input: /^(.*_)?double_(.*slab)$/, output: ['$1$2', '$1$2'] }
];

export const specialItemPlacementConversions = [
    { input: /^.+_bucket$/, output: ['bucket'] }
];
