import { DebugBox, debugDrawer } from "@minecraft/debug-utilities";
import { boxStyleOf } from "../VerificationStyle";

const BLOCK_CENTER = 0.5;

// Persistent debug boxes, one per cell, keyed by VerificationLevels.indexOf.
//
// A DebugShape with no timeLeft never expires, and its colour and scale are
// plain mutable properties, so a level change is two assignments rather than an
// allocation plus an addShape every cycle. The box a player is looking at also
// stops blinking out and back as the render cursor comes around.
//
// The tradeoff is that nothing reclaims these on its own: clear() must be
// called whenever the instance stops rendering, or boxes are left floating in
// the world with no handle left to reach them.
export class DebugBoxLayer {
    #boxes = new Map();
    #bounds;

    // An index only means a cell relative to one set of bounds. Change the
    // bounds and every key here silently refers to somewhere else, while the
    // boxes stay where they were first placed - so they have to go.
    //
    // Keyed on bounds rather than on the grid object because the verifier swaps
    // between two buffers of identical bounds every cycle.
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
        // remove() is documented as re-addable, so a cell that went to Match and
        // back reuses its box rather than allocating another.
        debugDrawer.addShape(entry.box);
        entry.isVisible = true;
    }

    #create(dimension, origin, style) {
        const box = new DebugBox({
            dimension,
            x: origin.x + BLOCK_CENTER,
            y: origin.y + BLOCK_CENTER,
            z: origin.z + BLOCK_CENTER
        });
        box.color = style.color;
        box.scale = style.scale;
        debugDrawer.addShape(box);
        return { box, isVisible: true };
    }
}
