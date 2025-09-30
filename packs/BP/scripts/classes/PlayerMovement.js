import { ButtonState, InputButton } from "@minecraft/server";

export class PlayerMovement {
    inputInfo;

    constructor(player) {
        this.player = player;
        this.inputInfo = player.inputInfo;
    }

    isJumping() {
        return this.inputInfo.getButtonState(InputButton.Jump) === ButtonState.Pressed;
    }

    isSneaking() {
        return this.inputInfo.getButtonState(InputButton.Sneak) === ButtonState.Pressed;
    }

    getMovementVector() {
        return this.inputInfo.getMovementVector();
    }

    getMajorDirectionFacing() {
        const { x, y, z } = this.player.getViewDirection();
        const xzAngle = Math.atan2(z, x) * (180 / Math.PI); 
        if (y > 0.7) 
            return { x: 0, y: 1, z: 0 };
        if (y < -0.7) 
            return { x: 0, y: -1, z: 0 };
        if (xzAngle >= -45 && xzAngle < 45)
            return { x: 1, y: 0, z: 0 };
        else if (xzAngle >= 45 && xzAngle < 135)
            return { x: 0, y: 0, z: 1 };
        else if (xzAngle >= 135 || xzAngle < -135)
            return { x: -1, y: 0, z: 0 };
        return { x: 0, y: 0, z: -1 };
    }
}