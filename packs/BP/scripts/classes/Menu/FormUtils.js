import { PaginatedListForm } from "./PaginatedListForm";
import { FolderedListForm } from "./FolderedListForm";
import { RESOURCE_PACK_UUID } from "../../consts";

export class FormUtils {
    static tryShow(form) {
        return form.show().catch(error => {
            this.player.sendMessage({ translate: 'construct.menu.open.error' });
            console.error(error);
        });
    }

    static buildPaginatedListWithFilter(form, options, selectionCallback, filterLabel = 'Filter', listOptions = {}) {
        return PaginatedListForm.buildWithFilter(form, options, selectionCallback, filterLabel, listOptions);
    }

    static buildPaginatedList(form, options, selectionCallback) {
        return PaginatedListForm.build(form, options, selectionCallback);
    }

    static buildFolderedList(form, entries, selectionCallback, pathLabel = 'Path') {
        return new FolderedListForm(form, entries, selectionCallback, pathLabel);
    }

    static getEnabledImage(isEnabled) {
        return { imagePackId: RESOURCE_PACK_UUID, imageSrc: isEnabled ? 'textures/ui/enabled.png' : 'textures/ui/disabled.png' };
    }
}
