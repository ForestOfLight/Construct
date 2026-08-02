import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BlockComparator } from '../packs/BP/scripts/classes/Verifier/BlockComparator.js';
import { BlockVerificationLevel } from '../packs/BP/scripts/classes/Enums/BlockVerificationLevel.js';

function block({ typeId = 'minecraft:stone', isAir = false, isWaterlogged = false, states, matches = true } = {}) {
    return {
        typeId,
        isAir,
        isWaterlogged,
        states,
        hasStates: states !== void 0,
        permutation: { matches: () => matches }
    };
}

const AIR = block({ typeId: 'minecraft:air', isAir: true });

test('a cell the structure says nothing about is air', () => {
    assert.equal(BlockComparator.compare(block(), void 0), BlockVerificationLevel.Air);
});

test('air the structure wants is only air when the world agrees', () => {
    assert.equal(BlockComparator.compare(AIR, AIR), BlockVerificationLevel.Air);
    assert.equal(BlockComparator.compare(block(), AIR), BlockVerificationLevel.NoMatch);
});

test('a block the structure wants but the world lacks is missing', () => {
    assert.equal(BlockComparator.compare(AIR, block()), BlockVerificationLevel.Missing);
});

test('a different block is no match', () => {
    const world = block({ typeId: 'minecraft:dirt' });
    assert.equal(BlockComparator.compare(world, block()), BlockVerificationLevel.NoMatch);
});

test('the right block with no states to compare is a match', () => {
    assert.equal(BlockComparator.compare(block(), block()), BlockVerificationLevel.Match);
});

// Waterlogging is not a block state, so it is checked on its own or a
// waterlogged fence would grade identically to a dry one.
test('the right block waterlogged differently is only a type match', () => {
    const world = block({ typeId: 'minecraft:oak_fence', isWaterlogged: true });
    const wanted = block({ typeId: 'minecraft:oak_fence', isWaterlogged: false });
    assert.equal(BlockComparator.compare(world, wanted), BlockVerificationLevel.TypeMatch);
});

test('states decide between a match and a type match', () => {
    const wanted = block({ states: { facing: 'north' } });
    assert.equal(BlockComparator.compare(block({ matches: true }), wanted), BlockVerificationLevel.Match);
    assert.equal(BlockComparator.compare(block({ matches: false }), wanted), BlockVerificationLevel.TypeMatch);
});
