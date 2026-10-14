import { ObservableBoolean, ObservableString } from "@minecraft/server-ui";

export class FormPagination {
    static LIST_PAGE_SIZE = 20;

    static buildListWithFilter(form, options, selectionCallback, filterLabel = 'Filter') {
        const filter = new ObservableString('', { clientWritable: true });
        form.textField(filterLabel, filter, { description: 'Filter results' });
        form.spacer();

        const getOptions = () => {
            const term = filter.getData().trim().toLowerCase();
            return term ? options.filter(o => String(o).toLowerCase().includes(term)) : options;
        };

        const refresh = FormPagination.#build(form, options, getOptions, selectionCallback);
        filter.subscribe(() => refresh());
        return refresh;
    }

    static buildList(form, options, selectionCallback) {
        return FormPagination.#build(form, options, () => options, selectionCallback);
    }

    static #build(form, allOptions, getOptions, selectionCallback) {
        const noResultsVisible = new ObservableBoolean(false, { clientWritable: true });
        form.label({ translate: 'construct.menu.pagination.noresults' }, { visible: noResultsVisible });
        const slots = FormPagination.#buildSlots(form, selectionCallback);
        const pageIndicator = new ObservableString('', { clientWritable: true });
        const pagingVisible = new ObservableBoolean(false, { clientWritable: true });
        let page = 0;

        const render = () => FormPagination.#renderPage(getOptions(), slots, page, pageIndicator, noResultsVisible);
        pagingVisible.setData(FormPagination.#totalPages(allOptions) > 1);

        form.divider({ visible: pagingVisible });
        form.label(pageIndicator, { visible: pagingVisible });
        form.spacer({ visible: pagingVisible });
        form.button({ text: '>' }, () => {
            if (page < FormPagination.#totalPages(getOptions()) - 1)
                page++;
            render();
        }, { visible: pagingVisible });
        form.button({ text: '<' }, () => {
            if (page > 0)
                page--;
            render();
        }, { visible: pagingVisible });
        form.spacer();

        render();
        return () => { page = 0; render(); };
    }

    static #buildSlots(form, selectionCallback) {
        const slots = [];
        for (let i = 0; i < FormPagination.LIST_PAGE_SIZE; i++) {
            const label = new ObservableString('', { clientWritable: true });
            const visible = new ObservableBoolean(false, { clientWritable: true });
            slots.push({ label, visible });
            form.button(label, () => selectionCallback(slots[i].label.getData()), { visible });
        }
        return slots;
    }

    static #totalPages(options) {
        return Math.max(1, Math.ceil(options.length / FormPagination.LIST_PAGE_SIZE));
    }

    static #renderPage(options, slots, page, pageIndicator, noResultsVisible) {
        const pages = FormPagination.#totalPages(options);
        const start = page * FormPagination.LIST_PAGE_SIZE;
        for (let i = 0; i < FormPagination.LIST_PAGE_SIZE; i++) {
            const option = options[start + i];
            slots[i].label.setData(option ?? '');
            slots[i].visible.setData(Boolean(option));
        }
        pageIndicator.setData(`${page + 1} / ${pages}`);
        noResultsVisible.setData(options.length === 0);
    }
}