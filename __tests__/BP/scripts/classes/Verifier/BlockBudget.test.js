import { describe, it, expect } from 'vitest';
import { BlockBudget } from '../../../../../packs/BP/scripts/classes/Verifier/BlockBudget.js';

describe('BlockBudget', () => {
    it('starts exhausted', () => {
        const budget = new BlockBudget();
        expect(budget.isExhausted()).toBe(true);
    });

    it('a fractional credit is enough to do work', () => {
        const budget = new BlockBudget();
        budget.credit(0.3);
        expect(budget.isExhausted()).toBe(false);
    });

    it('credit accumulates across ticks instead of being replaced', () => {
        const budget = new BlockBudget();
        budget.credit(0.3);
        budget.credit(0.3);
        budget.spend(0.5);
        expect(budget.isExhausted(), '0.6 credited minus 0.5 spent should leave 0.1').toBe(false);
    });

    it('overshoot is repaid as debt over subsequent ticks', () => {
        const budget = new BlockBudget();
        budget.credit(0.3);
        budget.spend(16);
        expect(budget.isExhausted()).toBe(true);

        for (let tick = 0; tick < 52; tick++)
            budget.credit(0.3);
        expect(budget.isExhausted(), '52 ticks of 0.3 does not repay a 15.7 debt').toBe(true);

        budget.credit(0.3);
        expect(budget.isExhausted(), '53 ticks does').toBe(false);
    });

    it('clear discards banked credit and debt', () => {
        const budget = new BlockBudget();
        budget.credit(50);
        budget.clear();
        expect(budget.isExhausted()).toBe(true);
    });
});
