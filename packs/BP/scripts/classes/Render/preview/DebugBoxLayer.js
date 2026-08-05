import { DebugBox, debugDrawer } from "@minecraft/debug-utilities";
import { boxStyleOf } from "../VerificationStyle";

export class DebugBoxLayer {
    #boxes = new Map();
    #bounds;

    retarget(bounds) {
        if (this.#matchesBounds(bounds))
            return;
        this.clear();
        this.#bounds = {
            min: { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z },
            max: { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z }
        };
    }

    draw(index, dimension, origin, verificationLevel) {
        if (index === -1)
            return;
        const style = boxStyleOf(verificationLevel);
        const existing = this.#boxes.get(index);
        if (!style)
            this.#hide(existing);
        else if (existing)
            this.#restyle(existing, style);
        else
            this.#boxes.set(index, this.#create(dimension, origin, style));
    }

    clear() {
        for (const entry of this.#boxes.values())
            this.#hide(entry);
        this.#boxes.clear();
        this.#bounds = void 0;
    }

    #matchesBounds(bounds) {
        return this.#bounds !== void 0
            && this.#bounds.min.x === bounds.min.x && this.#bounds.max.x === bounds.max.x
            && this.#bounds.min.y === bounds.min.y && this.#bounds.max.y === bounds.max.y
            && this.#bounds.min.z === bounds.min.z && this.#bounds.max.z === bounds.max.z;
    }

    #hide(entry) {
        if (!entry?.isVisible)
            return;
        entry.box.remove();
        entry.isVisible = false;
    }

    #restyle(entry, style) {
        entry.box.color = style.color;
        entry.box.scale = style.scale;
        if (entry.isVisible)
            return;
        debugDrawer.addShape(entry.box);
        entry.isVisible = true;
    }

    #create(dimension, origin, style) {
        const box = new DebugBox({
            dimension,
            x: origin.x + 0.5,
            y: origin.y + 0.5,
            z: origin.z + 0.5
        });
        box.color = style.color;
        box.scale = style.scale;
        debugDrawer.addShape(box);
        return { box, isVisible: true };
    }
}
