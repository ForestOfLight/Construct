import { ObservableUIRawMessage } from "@minecraft/server-ui";
import { PageControls } from "./PageControls";

// OreUI crashes when a single label grows too long, so long text is split into pages of lines.
export class PaginatedTextForm {
    static PAGE_SIZE = 15;

    #lines;
    #emptyMessage;
    #body;
    #controls;
    #page = 0;

    constructor(form, lines = [], { emptyMessage = { text: '' } } = {}) {
        this.#lines = lines;
        this.#emptyMessage = emptyMessage;
        this.#body = new ObservableUIRawMessage(this.#getPageMessage(), { clientWritable: true });
        form.label(this.#body);
        this.#controls = new PageControls(form, {
            onPrevious: () => {
                if (this.#page > 0)
                    this.#page--;
                this.#render();
            },
            onNext: () => {
                if (this.#page < this.#totalPages() - 1)
                    this.#page++;
                this.#render();
            }
        });
        this.#render();
    }

    setLines(lines) {
        this.#lines = lines;
        this.#page = Math.min(this.#page, this.#totalPages() - 1);
        this.#render();
    }

    #render() {
        this.#body.setData(this.#getPageMessage());
        this.#controls.update(this.#page, this.#totalPages());
    }

    #getPageMessage() {
        if (this.#lines.length === 0)
            return this.#emptyMessage;
        return { rawtext: PaginatedTextForm.getPage(this.#lines, this.#page) };
    }

    #totalPages() {
        return PageControls.totalPages(this.#lines.length, PaginatedTextForm.PAGE_SIZE);
    }

    static getPage(lines, page) {
        const start = page * PaginatedTextForm.PAGE_SIZE;
        const pageLines = lines.slice(start, start + PaginatedTextForm.PAGE_SIZE);
        const rawtext = [];
        pageLines.forEach((line, i) => {
            if (i > 0)
                rawtext.push({ text: '\n' });
            rawtext.push(line);
        });
        return rawtext;
    }
}
