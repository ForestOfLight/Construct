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
    }
}
