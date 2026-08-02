import { Vector } from "../../lib/Vector";
import { Side } from "../Enums/Side";
import { instanceCollection } from "../Instance/InstanceCollection";

const PATCHED_OFFSETS = Object.freeze([Vector.zero, ...Side.OFFSETS]);

// Re-verifies a changed cell in every instance that covers it, and redraws it.
export class ChangedCellPatcher {
    // All seven cells, not just the one that changed. The structure side of a
    // neighbor is untouched by this, but the WORLD side is not: walls, fences,
    // panes, bars, redstone and stairs rewrite their own permutation when an
    // adjacent block appears or disappears, moving between Match, TypeMatch and
    // NoMatch with no event of their own ever firing.
    patchAround(dimensionId, worldLocation) {
        for (const offset of PATCHED_OFFSETS)
            this.#patchCell(dimensionId, Vector.add(worldLocation, offset));
    }

    // Each cell is tested for containment on its own rather than rejecting on
    // the changed block once. The block that changed is often NOT the one inside
    // the structure - stacking a wall on a wall while a lower layer is selected
    // restates the wall below, and the placement itself lands outside the active
    // bounds entirely.
    //
    // getInstancesAt filters on enabled, dimension, and active layer bounds, so
    // a cell outside every structure costs one bounds test per instance.
    #patchCell(dimensionId, worldLocation) {
        for (const instance of instanceCollection.getInstancesAt(dimensionId, worldLocation)) {
            if (!instance.verifier || !instance.previewRenderer)
                continue;
            const location = instance.toStructureCoords(worldLocation);
            instance.verifier.patchCell(location);
            instance.previewRenderer.renderBlockAt(location);
        }
    }
}
