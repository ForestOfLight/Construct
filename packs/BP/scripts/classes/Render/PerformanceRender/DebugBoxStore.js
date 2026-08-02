import { DebugBox, debugDrawer } from "@minecraft/debug-utilities";
import { getVerificationLevelColor, getVerificationLevelScale } from "./VerificationLevelStyle";

// Persistent debug boxes, one per cell, keyed by VerificationLevels.indexOf.
//
// A DebugShape with no timeLeft never expires, and its colour and scale are
// plain mutable properties - so a level change is two assignments rather than
// an allocation plus an addShape every cycle. That allocation was the debug
// path's entire per-tick cost, and the box a player is looking at no longer
// blinks out and back as the cursor comes around.
//
// The tradeoff is that nothing reclaims these on its own. clear() must be
// called whenever the instance stops rendering, or boxes are left floating in
// the world with no handle left to reach them.
export class DebugBoxStore {
    #boxes = new Map();
    #bounds;

    // An index only means a cell relative to one set of bounds. Change the
    // bounds and every key in here silently refers to somewhere else, while
    // the boxes stay where they were first placed - so they have to go.
    //
    // Keyed on bounds rather than on the grid object because the verifier
    // swaps between two buffers of identical bounds every cycle, and clearing
    // on identity would throw the boxes away each time.
    retarget(bounds) {
        if (this.#matchesBounds(bounds))
            return;
        this.clear();
        this.#bounds = {
            min: { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z },
            max: { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z }
        };
    }

    #matchesBounds(bounds) {
        return this.#bounds !== void 0
            && this.#bounds.min.x === bounds.min.x && this.#bounds.max.x === bounds.max.x
            && this.#bounds.min.y === bounds.min.y && this.#bounds.max.y === bounds.max.y
            && this.#bounds.min.z === bounds.min.z && this.#bounds.max.z === bounds.max.z;
    }

    show(index, dimension, globalLocation, verificationLevel) {
        if (index === -1)
            return;
        const color = getVerificationLevelColor(verificationLevel);
        const existing = this.#boxes.get(index);
        if (!color) {
            this.#hide(existing);
            return;
        }
        if (existing) {
            this.#restyle(existing, color, verificationLevel);
            return;
        }
        this.#boxes.set(index, this.#create(dimension, globalLocation, color, verificationLevel));
    }

    #hide(entry) {
        if (!entry?.isVisible)
            return;
        entry.box.remove();
        entry.isVisible = false;
    }

    #restyle(entry, color, verificationLevel) {
        entry.box.color = color;
        entry.box.scale = getVerificationLevelScale(verificationLevel);
        if (entry.isVisible)
            return;
        // remove() is documented as re-addable, so a cell that went to Match
        // and back reuses its box rather than allocating another.
        debugDrawer.addShape(entry.box);
        entry.isVisible = true;
    }

    #create(dimension, globalLocation, color, verificationLevel) {
        const box = new DebugBox({
            dimension,
            x: globalLocation.x + 0.5,
            y: globalLocation.y + 0.5,
            z: globalLocation.z + 0.5
        });
        box.color = color;
        box.scale = getVerificationLevelScale(verificationLevel);
        debugDrawer.addShape(box);
        return { box, isVisible: true };
    }

    clear() {
        for (const entry of this.#boxes.values())
            this.#hide(entry);
        this.#boxes.clear();
        this.#bounds = void 0;
    }
}
