import { Vector } from "../../lib/Vector";
import { Side } from "../Enums/Side";
import { instanceCollection } from "../Instance/InstanceCollection";

export class ChangedCellPatcher {
    #patchedOffsets = Object.freeze([Vector.zero, ...Side.OFFSETS]);

    patchAround(dimensionId, worldLocation) {
        for (const offset of this.#patchedOffsets)
            this.#patchCell(dimensionId, Vector.add(worldLocation, offset));
    }

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
