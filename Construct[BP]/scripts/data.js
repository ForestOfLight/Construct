export const bannedBlocks = [
    'air', 'bed', 'piston_arm_collision', 'sticky_piston_arm_collision', "skeleton_skull", 'standing_banner', 'wall_banner',
    'wooden_door', 'spruce_door', 'birch_door', 'jungle_door', 'acacia_door', 'dark_oak_door', 'mangrove_door', 'cherry_door', 'pale_oak_door', 
    'bamboo_door', 'iron_door', 'crimson_door', 'warped_door', 'copper_door', 'exposed_copper_door', 'weathered_copper_door', 'oxidized_copper_door',
    'waxed_copper_door', 'waxed_exposed_copper_door', 'waxed_weathered_copper_door', 'waxed_oxidized_copper_door',
    'seagrass', 'kelp'
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

export const bannedToValidBlockMap = {
    'lit_furnace': 'furnace',
    'lit_smoker': 'smoker',
    'lit_blast_furnace': 'blast_furnace',
    'lit_redstone_ore': 'redstone_ore',
    'lit_redstone_lamp': 'redstone_lamp',
    'unlit_redstone_torch': 'redstone_torch'
};

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
    cluster_count: 0,
    end_portal_eye_bit: false
};

export const blockIdToItemStackMap = {
    'water': 'water_bucket',
    'lava': 'lava_bucket',
    'fire': 'fire_charge',
    'soul_fire': 'fire_charge',
};

export const specialItemPlacementConversions = {
    'water_bucket': 'bucket',
    'lava_bucket': 'bucket'
}