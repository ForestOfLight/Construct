import { ObservableString } from "@minecraft/server-ui";
import { PaginatedListForm } from "./PaginatedListForm";

export class FolderedListForm {
    #root;
    #path;
    #list;

    constructor(form, entries, selectionCallback, pathLabel = 'Path') {
        this.#root = FolderedListForm.#buildTree(entries);
        this.#path = new ObservableString('/', { clientWritable: true });
        form.textField(pathLabel, this.#path);
        form.spacer();

        const onSelect = (option) => {
            if (option.folder) {
                this.#path.setData(FolderedListForm.#formatPath(option.folder));
                this.reset();
            } else {
                selectionCallback(option.value);
            }
        };
        this.#list = new PaginatedListForm(form, () => this.#getOptions(), onSelect, { getLabel: option => option.label });
        this.#path.subscribe(() => this.reset());
    }

    reset() {
        this.#list.reset();
    }

    #getOptions() {
        const parts = FolderedListForm.#splitPath(this.#path.getData());
        const folder = FolderedListForm.#getFolder(this.#root, parts);
        if (!folder)
            return [];
        const options = [];
        if (parts.length > 0)
            options.push({ label: '..', folder: parts.slice(0, -1) });
        for (const name of [...folder.folders.keys()].sort((a, b) => a.localeCompare(b)))
            options.push({ label: `${name} >`, folder: [...parts, name] });
        for (const file of [...folder.files].sort((a, b) => a.name.localeCompare(b.name)))
            options.push({ label: file.name, value: file.value });
        return options;
    }

    static #buildTree(entries) {
        const root = FolderedListForm.#newFolder();
        for (const { path, value } of entries) {
            const parts = FolderedListForm.#splitPath(path);
            const fileName = parts.pop();
            if (fileName === void 0)
                continue;
            let folder = root;
            for (const part of parts) {
                if (!folder.folders.has(part))
                    folder.folders.set(part, FolderedListForm.#newFolder());
                folder = folder.folders.get(part);
            }
            folder.files.push({ name: fileName, value });
        }
        return root;
    }

    static #newFolder() {
        return { folders: new Map(), files: [] };
    }

    static #getFolder(root, parts) {
        let folder = root;
        for (const part of parts) {
            folder = folder.folders.get(part);
            if (!folder)
                return void 0;
        }
        return folder;
    }

    static #splitPath(path) {
        return String(path).split('/').map(part => part.trim()).filter(Boolean);
    }

    static #formatPath(parts) {
        return '/' + parts.map(part => `${part}/`).join('');
    }
}
