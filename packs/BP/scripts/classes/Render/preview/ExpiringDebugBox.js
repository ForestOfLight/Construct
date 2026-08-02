import { DebugBox, debugDrawer } from "@minecraft/debug-utilities";
import { boxStyleOf } from "../VerificationStyle";

const BLOCK_CENTER = 0.5;

// A fire-and-forget box that expires on its own, for one-shot renders with a
// definite end - today only the statistics form. The continuous overlay uses
// DebugBoxLayer instead, which keeps its boxes and mutates them in place.
export function drawExpiringDebugBox(dimension, origin, verificationLevel, lifetimeSeconds) {
    const style = boxStyleOf(verificationLevel);
    if (!style)
        return;
    const box = new DebugBox({
        dimension,
        x: origin.x + BLOCK_CENTER,
        y: origin.y + BLOCK_CENTER,
        z: origin.z + BLOCK_CENTER
    });
    box.color = style.color;
    box.scale = style.scale;
    box.timeLeft = lifetimeSeconds;
    debugDrawer.addShape(box);
}
