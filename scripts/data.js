export const bannedEasyPlaceBlocks = [
    'air', 'bed', 
    'wooden_door', 'spruce_door', 'birch_door', 'jungle_door', 'acacia_door', 'dark_oak_door', 'mangrove_door', 'cherry_door', 'pale_oak_door', 
    'bamboo_door', 'iron_door', 'crimson_door', 'warped_door', 'copper_door', 'exposed_copper_door', 'weathered_copper_door', 'oxidized_copper_door',
    'waxed_copper_door', 'waxed_exposed_copper_door', 'waxed_weathered_copper_door', 'waxed_oxidized_copper_door',
    'piston_arm_collision', 'sticky_piston_arm_collision', "skeleton_skull"
];

export const bannedToValidBlockMap = {
    'lit_furnace': 'furnace',
    'lit_smoker': 'smoker',
    'lit_blast_furnace': 'blast_furnace',
    'lit_redstone_ore': 'redstone_ore',
    'unlit_redstone_torch': 'redstone_torch',
    'bubble_column': 'water',
    // 'seagrass'? 'tall_seagrass'? kelp?
};

export const defaultStates = {
    growth: 0,
    age: 0,
    height: 0,
    bite_counter: 0,
    fill_level: 0,
    redstone_signal: 0,
    cluster_count: 0,
    respawn_anchor_charge: 0,
    turtle_egg_count: "one_egg",
    cauldron_liquid: "water"
};

export const allowedBlockStates = {
    water: { depth_level: 0 },
    lava: { depth_level: 0 }
};

export const bannedDimensionBlocks = {
    'nether': ['water', 'bubble_column']
};