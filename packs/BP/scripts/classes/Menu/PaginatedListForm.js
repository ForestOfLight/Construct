import { ObservableBoolean, ObservableString } from "@minecraft/server-ui";

export class PaginatedListForm {
    static PAGE_SIZE = 20;

    #getOptions;
    #getLabel;
    #getPagingOptions;
    #slots;
    #pageIndicator;
    #pagingVisible;
    #noResultsVisible;
    #page = 0;

    constructor(form, getOptions, onSelect, { getLabel = String, getPagingOptions = getOptions } = {}) {
        this.#getOptions = getOptions;
        this.#getLabel = getLabel;
        this.#getPagingOptions = getPagingOptions;
        this.#noResultsVisible = new ObservableBoolean(false, { clientWritable: true });
        form.label({ translate: 'construct.menu.pagination.noresults' }, { visible: this.#noResultsVisible });
        this.#slots = PaginatedListForm.#buildSlots(form, onSelect);
        this.#pageIndicator = new ObservableString('', { clientWritable: true });
        this.#pagingVisible = new ObservableBoolean(false, { clientWritable: true });

        form.divider({ visible: this.#pagingVisible });
        form.label(this.#pageIndicator, { visible: this.#pagingVisible });
        form.spacer({ visible: this.#pagingVisible });
        form.button({ text: '>' }, () => {
            if (this.#page < PaginatedListForm.#totalPages(this.#getOptions()) - 1)
                this.#page++;
            this.#render();
        }, { visible: this.#pagingVisible });
        form.button({ text: '<' }, () => {
            if (this.#page > 0)
                this.#page--;
            this.#render();
        }, { visible: this.#pagingVisible });
        form.spacer();

        this.#render();
    }

    static build(form, options, selectionCallback) {
        return new PaginatedListForm(form, () => options, selectionCallback);
    }

    static buildWithFilter(form, options, selectionCallback, filterLabel = 'Filter') {
        if (options.length <= PaginatedListForm.PAGE_SIZE)
            return PaginatedListForm.build(form, options, selectionCallback);

        const filter = new ObservableString('', { clientWritable: true });
        form.textField(filterLabel, filter, { description: 'Filter results' });
        form.spacer();

        const getOptions = () => {
            const term = filter.getData().trim().toLowerCase();
            return term ? options.filter(o => String(o).toLowerCase().includes(term)) : options;
        };

        const list = new PaginatedListForm(form, getOptions, selectionCallback, { getPagingOptions: () => options });
        filter.subscribe(() => list.reset());
        return list;
    }

    reset() {
        this.#page = 0;
        this.#render();
    }

    #render() {
        this.#pagingVisible.setData(PaginatedListForm.#totalPages(this.#getPagingOptions()) > 1);
        const options = this.#getOptions();
        const pages = PaginatedListForm.#totalPages(options);
        const start = this.#page * PaginatedListForm.PAGE_SIZE;
        for (let i = 0; i < PaginatedListForm.PAGE_SIZE; i++) {
            const option = options[start + i];
            this.#slots[i].option = option;
            this.#slots[i].label.setData(option !== void 0 ? this.#getLabel(option) : '');
            this.#slots[i].visible.setData(option !== void 0);
        }
        this.#pageIndicator.setData(`${this.#page + 1} / ${pages}`);
        this.#noResultsVisible.setData(options.length === 0);
    }

    static #buildSlots(form, onSelect) {
        const slots = [];
        for (let i = 0; i < PaginatedListForm.PAGE_SIZE; i++) {
            const label = new ObservableString('', { clientWritable: true });
            const visible = new ObservableBoolean(false, { clientWritable: true });
            const slot = { label, visible, option: void 0 };
            slots.push(slot);
            form.button(label, () => {
                if (slot.option !== void 0)
                    onSelect(slot.option);
            }, { visible });
        }
        return slots;
    }

    static #totalPages(options) {
        return Math.max(1, Math.ceil(options.length / PaginatedListForm.PAGE_SIZE));
    }
}
