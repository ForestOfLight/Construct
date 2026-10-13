import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel.js";

const NEEDED_LEVELS = new Set([
    BlockVerificationLevel.Missing,
    BlockVerificationLevel.NoMatch,
    BlockVerificationLevel.Unknown
]);

export function* tallyMissingMaterials({ knownGrid, bounds, itemsAt, result }) {
    const location = { x: 0, y: 0, z: 0 };
    for (let y = bounds.min.y; y < bounds.max.y; y++) {
        for (let z = bounds.min.z; z < bounds.max.z; z++) {
            for (let x = bounds.min.x; x < bounds.max.x; x++) {
                location.x = x;
                location.y = y;
                location.z = z;
                countCell(knownGrid, location, itemsAt, result);
                yield void 0;
            }
        }
    }
}

function countCell(knownGrid, location, itemsAt, result) {
    const verificationLevel = knownGrid.get(location);
    if (!NEEDED_LEVELS.has(verificationLevel))
        return;
    const items = itemsAt(location);
    for (const item of items) {
        result.materials[item.typeId] ??= { count: 0, stackSize: item.maxAmount };
        result.materials[item.typeId].count++;
    }
    if (verificationLevel === BlockVerificationLevel.Unknown && items.length > 0)
        result.unscannedCount++;
}
