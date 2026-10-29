/* eslint-disable camelcase */
import { BlockStates } from '@minecraft/server';

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
    turtle_egg_count: 'one_egg',
    composter_fill_level: 0,
    end_portal_eye_bit: false
};

export const blockIdToItemStackPatterns = [
    { input: /^water$/, output: ['water_bucket'] },
    { input: /^lava$/, output: ['lava_bucket'] },
    { input: /^(soul_)?fire$/, output: ['fire_charge'] },
    { input: /^(.*_)?double_(.*slab)$/, output: ['$1$2', '$1$2'] }
];

function repeatPerStateValue(stateName, stateValue, itemId) {
    const count = BlockStates.get(stateName)?.validValues.indexOf(stateValue) + 1;
    return Array(Math.max(1, count || 0)).fill(itemId);
}

function repeatPerSetBit(stateName, bits, itemId) {
    let count = 0;
    for (; bits > 0; bits >>= 1)
        count += bits & 1;
    return Array(Math.max(1, count)).fill(itemId);
}

export const blockStateToItemIds = [
    { state: 'candles', output: repeatPerStateValue },
    { state: 'cluster_count', output: repeatPerStateValue },
    { state: 'turtle_egg_count', output: repeatPerStateValue },
    { state: 'height', output: repeatPerStateValue },
    { state: 'multi_face_direction_bits', output: repeatPerSetBit },
    { state: 'growth', input: /^(pink_petals|wildflowers|leaf_litter)$/, output: repeatPerStateValue }
];

export const specialItemPlacementConversions = [
    { input: /^.+_bucket$/, output: ['bucket'] }
];
