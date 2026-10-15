import { PaginatedListForm } from "./PaginatedListForm";
import { FolderedListForm } from "./FolderedListForm";

export class FormUtils {
    static tryShow(form) {
        return form.show().catch(error => {
            this.player.sendMessage({ translate: 'construct.menu.open.error' });
            console.error(error);
        });
    }

    static buildPaginatedListWithFilter(form, options, selectionCallback, filterLabel = 'Filter') {
        return PaginatedListForm.buildWithFilter(form, options, selectionCallback, filterLabel);
    }

    static buildPaginatedList(form, options, selectionCallback) {
        return PaginatedListForm.build(form, options, selectionCallback);
    }

    static buildFolderedList(form, entries, selectionCallback, pathLabel = 'Path') {
        return new FolderedListForm(form, entries, selectionCallback, pathLabel);
    }
}
