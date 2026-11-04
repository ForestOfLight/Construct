import { ObservableBoolean, ObservableString } from "@minecraft/server-ui";

export class PageControls {
    #indicator;
    #visible;

    constructor(form, { onPrevious, onNext }) {
        this.#indicator = new ObservableString('', { clientWritable: true });
        this.#visible = new ObservableBoolean(false, { clientWritable: true });
        form.divider({ visible: this.#visible });
        form.label(this.#indicator, { visible: this.#visible });
        form.spacer({ visible: this.#visible });
        form.multiButtonRow([
            { label: { text: '<' }, onClick: onPrevious },
            { label: { text: '>' }, onClick: onNext }
        ], { visible: this.#visible });
    }

    update(page, totalPages, visible = totalPages > 1) {
        this.#visible.setData(visible);
        this.#indicator.setData(`${page + 1} / ${totalPages}`);
    }

    static totalPages(count, pageSize) {
        return Math.max(1, Math.ceil(count / pageSize));
    }
}
