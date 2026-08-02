import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BlockBudget } from '../packs/BP/scripts/classes/Verifier/BlockBudget.js';

test('starts exhausted', () => {
    const budget = new BlockBudget();
    assert.equal(budget.isExhausted(), true);
});

test('a fractional credit is enough to do work', () => {
    const budget = new BlockBudget();
    budget.credit(0.3);
    assert.equal(budget.isExhausted(), false);
});

test('credit accumulates across ticks instead of being replaced', () => {
    const budget = new BlockBudget();
    budget.credit(0.3);
    budget.credit(0.3);
    budget.spend(0.5);
    assert.equal(budget.isExhausted(), false, '0.6 credited minus 0.5 spent should leave 0.1');
});

test('overshoot is repaid as debt over subsequent ticks', () => {
    const budget = new BlockBudget();
    budget.credit(0.3);
    budget.spend(16);
    assert.equal(budget.isExhausted(), true);

    for (let tick = 0; tick < 52; tick++)
        budget.credit(0.3);
    assert.equal(budget.isExhausted(), true, '52 ticks of 0.3 does not repay a 15.7 debt');

    budget.credit(0.3);
    assert.equal(budget.isExhausted(), false, '53 ticks does');
});

test('clear discards banked credit and debt', () => {
    const budget = new BlockBudget();
    budget.credit(50);
    budget.clear();
    assert.equal(budget.isExhausted(), true);
});
