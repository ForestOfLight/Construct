import { ObservableBoolean, ObservableString } from "@minecraft/server-ui";

export class FormUtils {
    static LIST_PAGE_SIZE = 20;

    static tryShow(form) {
        return form.show().catch(error => {
            this.player.sendMessage({ translate: 'construct.menu.open.error' });
            console.error(error);
        });
    }

    static buildPaginatedListWithFilter(form, options, selectionCallback, filterLabel = 'Filter') {
        if (options.length <= FormUtils.LIST_PAGE_SIZE)
            return FormUtils.buildPaginatedList(form, options, selectionCallback);

        const filter = new ObservableString('', { clientWritable: true });
        form.textField(filterLabel, filter, { description: 'Filter results' });
        form.spacer();

        const getOptions = () => {
            const term = filter.getData().trim().toLowerCase();
            return term ? options.filter(o => String(o).toLowerCase().includes(term)) : options;
        };

        const refresh = FormUtils.#build(form, options, getOptions, selectionCallback);
        filter.subscribe(() => refresh());
        return refresh;
    }

    static buildPaginatedList(form, options, selectionCallback) {
        return FormUtils.#build(form, options, () => options, selectionCallback);
    }

    static #build(form, allOptions, getOptions, selectionCallback) {
        const noResultsVisible = new ObservableBoolean(false, { clientWritable: true });
        form.label({ translate: 'construct.menu.pagination.noresults' }, { visible: noResultsVisible });
        const slots = FormUtils.#buildSlots(form, selectionCallback);
        const pageIndicator = new ObservableString('', { clientWritable: true });
        const pagingVisible = new ObservableBoolean(false, { clientWritable: true });
        let page = 0;

        const render = () => FormUtils.#renderPage(getOptions(), slots, page, pageIndicator, noResultsVisible);
        pagingVisible.setData(FormUtils.#totalPages(allOptions) > 1);

        form.divider({ visible: pagingVisible });
        form.label(pageIndicator, { visible: pagingVisible });
        form.spacer({ visible: pagingVisible });
        form.button({ text: '>' }, () => {
            if (page < FormUtils.#totalPages(getOptions()) - 1)
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
        for (let i = 0; i < FormUtils.LIST_PAGE_SIZE; i++) {
            const label = new ObservableString('', { clientWritable: true });
            const visible = new ObservableBoolean(false, { clientWritable: true });
            slots.push({ label, visible });
            form.button(label, () => selectionCallback(slots[i].label.getData()), { visible });
        }
        return slots;
    }

    static #totalPages(options) {
        return Math.max(1, Math.ceil(options.length / FormUtils.LIST_PAGE_SIZE));
    }

    static #renderPage(options, slots, page, pageIndicator, noResultsVisible) {
        const pages = FormUtils.#totalPages(options);
        const start = page * FormUtils.LIST_PAGE_SIZE;
        for (let i = 0; i < FormUtils.LIST_PAGE_SIZE; i++) {
            const option = options[start + i];
            slots[i].label.setData(option ?? '');
            slots[i].visible.setData(Boolean(option));
        }
        pageIndicator.setData(`${page + 1} / ${pages}`);
        noResultsVisible.setData(options.length === 0);
    }
}