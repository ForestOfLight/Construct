import { DebugBox, debugDrawer } from "@minecraft/debug-utilities";
import { boxStyleOf } from "../VerificationStyle";

export function drawExpiringDebugBox(dimension, origin, verificationLevel, lifetimeSeconds) {
    const style = boxStyleOf(verificationLevel);
    if (!style)
        return;
    const box = new DebugBox({
        dimension,
        x: origin.x + 0.5,
        y: origin.y + 0.5,
        z: origin.z + 0.5
    });
    box.color = style.color;
    box.scale = style.scale;
    box.timeLeft = lifetimeSeconds;
    debugDrawer.addShape(box);
}
