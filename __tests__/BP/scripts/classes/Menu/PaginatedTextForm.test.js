import { describe, it, expect, vi } from 'vitest';
import { CustomForm } from '@minecraft/server-ui';
import { PaginatedTextForm } from '../../../../../packs/BP/scripts/classes/Menu/PaginatedTextForm.js';

function makeForm() {
    const form = new CustomForm({}, 'title');
    form.multiButtonRow = vi.fn((buttons, options) => {
        form.controls.push({ type: 'multiButtonRow', buttons, options });
        return form;
    });
    return form;
}

function makeLines(count) {
    return Array.from({ length: count }, (_, i) => ({ text: `line ${i}` }));
}

function getBodyText(form) {
    const message = form.getControl('label').label.getData();
    return message.rawtext.filter(part => part.text !== '\n').map(part => part.text);
}

function getIndicator(form) {
    return form.controls.filter(control => control.type === 'label')[1];
}

function clickNext(form) {
    form.getControl('multiButtonRow').buttons[1].onClick();
}

function clickPrevious(form) {
    form.getControl('multiButtonRow').buttons[0].onClick();
}

describe('PaginatedTextForm', () => {
    it('shows at most one page of lines', () => {
        const form = makeForm();
        new PaginatedTextForm(form, makeLines(PaginatedTextForm.PAGE_SIZE * 2 + 3));
        expect(getBodyText(form)).toHaveLength(PaginatedTextForm.PAGE_SIZE);
        expect(getIndicator(form).label.getData()).toBe('1 / 3');
        expect(getIndicator(form).options.visible.getData()).toBe(true);
    });

    it('hides the page controls when everything fits on one page', () => {
        const form = makeForm();
        new PaginatedTextForm(form, makeLines(3));
        expect(getBodyText(form)).toEqual(['line 0', 'line 1', 'line 2']);
        expect(getIndicator(form).options.visible.getData()).toBe(false);
    });

    it('pages forward and back within bounds', () => {
        const form = makeForm();
        new PaginatedTextForm(form, makeLines(PaginatedTextForm.PAGE_SIZE + 2));
        clickPrevious(form);
        expect(getBodyText(form)[0]).toBe('line 0');
        clickNext(form);
        expect(getBodyText(form)).toEqual([`line ${PaginatedTextForm.PAGE_SIZE}`, `line ${PaginatedTextForm.PAGE_SIZE + 1}`]);
        clickNext(form);
        expect(getIndicator(form).label.getData()).toBe('2 / 2');
        clickPrevious(form);
        expect(getBodyText(form)[0]).toBe('line 0');
    });

    it('shows the empty message when there are no lines', () => {
        const form = makeForm();
        const emptyMessage = { translate: 'empty' };
        new PaginatedTextForm(form, [], { emptyMessage });
        expect(form.getControl('label').label.getData()).toBe(emptyMessage);
    });

    it('clamps the current page when the lines shrink', () => {
        const form = makeForm();
        const text = new PaginatedTextForm(form, makeLines(PaginatedTextForm.PAGE_SIZE * 3));
        clickNext(form);
        clickNext(form);
        text.setLines(makeLines(PaginatedTextForm.PAGE_SIZE + 1));
        expect(getIndicator(form).label.getData()).toBe('2 / 2');
        expect(getBodyText(form)).toEqual([`line ${PaginatedTextForm.PAGE_SIZE}`]);
    });
});
