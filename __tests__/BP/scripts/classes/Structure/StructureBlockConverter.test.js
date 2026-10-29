/* eslint-disable camelcase */
import { describe, it, expect, vi } from 'vitest';
import { BlockPermutation } from '@minecraft/server';

vi.mock('@minecraft/server', async (importOriginal) => {
    const original = await importOriginal();
    const registry = { get: (id) => ({ id }) };
    const validValues = {
        turtle_egg_count: ['one_egg', 'two_egg', 'three_egg', 'four_egg']
    };
    const BlockStates = { get: (stateName) => ({ id: stateName, validValues: validValues[stateName] ?? [0, 1, 2, 3, 4, 5, 6, 7] }) };
    return { ...original, ItemTypes: registry, BlockTypes: registry, BlockStates };
});

const { StructureBlockConverter } = await import('../../../../../packs/BP/scripts/classes/Structure/StructureBlockConverter.js');

function permutationOf(blockId, states, itemId = blockId) {
    const permutation = new BlockPermutation(blockId, states);
    permutation.getItemStack = () => ({ typeId: itemId });
    return permutation;
}

function itemIdsFor(blockId, states, itemId) {
    return StructureBlockConverter.toPlaceableItemStacks(permutationOf(blockId, states, itemId))
        .map((itemStack) => itemStack.typeId.replace('minecraft:', ''));
}

describe('StructureBlockConverter', () => {
    describe('toPlaceableItemStacks', () => {
        it('requires one candle per candle in the block', () => {
            expect(itemIdsFor('minecraft:candle', { candles: 0, lit: false })).toEqual(['candle']);
            expect(itemIdsFor('minecraft:light_blue_candle', { candles: 3, lit: true })).toEqual(Array(4).fill('light_blue_candle'));
        });

        it('requires one turtle egg per egg in the block', () => {
            expect(itemIdsFor('minecraft:turtle_egg', { turtle_egg_count: 'one_egg', cracked_state: 'no_cracks' })).toEqual(['turtle_egg']);
            expect(itemIdsFor('minecraft:turtle_egg', { turtle_egg_count: 'three_egg', cracked_state: 'cracked' })).toEqual(Array(3).fill('turtle_egg'));
        });

        it('requires one sea pickle per pickle in the cluster', () => {
            expect(itemIdsFor('minecraft:sea_pickle', { cluster_count: 2, dead_bit: false })).toEqual(Array(3).fill('sea_pickle'));
        });

        it('requires one item per petal', () => {
            expect(itemIdsFor('minecraft:pink_petals', { growth: 1, 'minecraft:cardinal_direction': 'north' })).toEqual(Array(2).fill('pink_petals'));
        });

        it('requires one snow layer per layer', () => {
            expect(itemIdsFor('minecraft:snow_layer', { height: 7, covered_bit: false })).toEqual(Array(8).fill('snow_layer'));
        });

        it('requires one item per covered face of multi-face blocks', () => {
            expect(itemIdsFor('minecraft:glow_lichen', { multi_face_direction_bits: 0b100101 })).toEqual(Array(3).fill('glow_lichen'));
            expect(itemIdsFor('minecraft:sculk_vein', { multi_face_direction_bits: 0 })).toEqual(['sculk_vein']);
        });

        it('supports unknown blocks that reuse a counted state', () => {
            expect(itemIdsFor('minecraft:future_candle', { candles: 1 })).toEqual(Array(2).fill('future_candle'));
        });

        it('repeats the item the block is placed with', () => {
            expect(itemIdsFor('minecraft:future_pickle_block', { cluster_count: 1 }, 'minecraft:future_pickle')).toEqual(Array(2).fill('future_pickle'));
        });

        it('only counts block-scoped states on the blocks they are scoped to', () => {
            expect(itemIdsFor('minecraft:wheat', { growth: 7 }, 'minecraft:wheat_seeds')).toEqual(['wheat_seeds']);
        });

        it('prefers block id patterns over block state conversions', () => {
            expect(itemIdsFor('minecraft:oak_double_slab', {})).toEqual(['oak_slab', 'oak_slab']);
        });
    });

    describe('toDefaultState', () => {
        it('keeps counted states that are paid for with items', () => {
            StructureBlockConverter.toDefaultState(permutationOf('minecraft:turtle_egg', { turtle_egg_count: 'four_egg', cracked_state: 'no_cracks' }));
            expect(BlockPermutation.resolve).toHaveBeenLastCalledWith('minecraft:turtle_egg', { turtle_egg_count: 'four_egg', cracked_state: 'no_cracks' });
            StructureBlockConverter.toDefaultState(permutationOf('minecraft:pink_petals', { growth: 3, 'minecraft:cardinal_direction': 'east' }));
            expect(BlockPermutation.resolve).toHaveBeenLastCalledWith('minecraft:pink_petals', { growth: 3, 'minecraft:cardinal_direction': 'east' });
        });

        it('still resets block-scoped states on other blocks', () => {
            StructureBlockConverter.toDefaultState(permutationOf('minecraft:wheat', { growth: 7 }, 'minecraft:wheat_seeds'));
            expect(BlockPermutation.resolve).toHaveBeenLastCalledWith('minecraft:wheat', { growth: 0 });
        });
    });
});
