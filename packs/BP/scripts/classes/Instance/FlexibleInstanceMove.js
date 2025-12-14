import { InputPermissionCategory, world, system } from "@minecraft/server";
import { Outliner } from "../Outliner";
import { MENU_ITEM } from "../../commands/construct";
import { Vector } from "../../lib/Vector";
import { PlayerMovement } from "../PlayerMovement";
import { Builders } from "../Builder/Builders";

export class FlexibleInstanceMove {
    player;
    instance;
    outliner;
    currentInstanceLocation;
    runner = void 0;

    constructor(instance, player) {
        this.instance = instance;
        this.player = player;
        this.currentInstanceLocation = Vector.from(instance.getLocation().location);
        this.onPlayerUseItemBound = this.onPlayerUseItem.bind(this);
        this.onPlayerLeaveBound = this.onPlayerLeave.bind(this);
        this.tryStart();
    }

    tryStart() {
        if (this.instance.isFlexibleMoving()) {
            this.sendFeedback({ translate: 'construct.instance.flexibleMove.alreadyMoving' });
            return;
        }
        this.start();
    }
    
    start() {
        this.prepInstanceForMovement();
        this.prepPlayerForMovement();
        this.runner = system.runInterval(this.onFlexibleMovementTick.bind(this));
    }

    prepInstanceForMovement() {
        this.instance.flexMovingPlayerId = this.player.id;
        this.instance.disable();
        const bounds = this.instance.getBounds();
        const maxWorldLocation = this.currentInstanceLocation.add(Vector.from(bounds.max));
        this.outliner = new Outliner(this.instance.getDimension(), this.currentInstanceLocation, maxWorldLocation, 1, 1);
        this.outliner.startDraw();
    }

    prepPlayerForMovement() {
        this.allowPlayerMovement(false);
        world.beforeEvents.itemUse.subscribe(this.onPlayerUseItemBound);
        world.beforeEvents.playerLeave.unsubscribe(this.onPlayerLeaveBound);
        this.sendFeedback({ translate: 'construct.instance.flexibleMove.start', with: [this.instance.getName()] });
    }

    onFlexibleMovementTick() {
        const playerMovement = new PlayerMovement(this.player);
        const instanceVelocity = this.calculateInstanceMovement(playerMovement);
        this.move(instanceVelocity);
    }

    calculateInstanceMovement(playerMovement) {
        const speedFactor = 0.5;

        const viewDir = playerMovement.getMajorDirectionFacing();
        const forward = new Vector(viewDir.x, viewDir.y, viewDir.z);
        const right = new Vector(forward.z, 0, -forward.x);
        const moveInput = playerMovement.getMovementVector();
        let velocity = forward.multiply(moveInput.y).add(right.multiply(moveInput.x));

        if (playerMovement.isJumping())
            velocity.y += 1;
        if (playerMovement.isSneaking())
            velocity.y -= 1;

        return velocity.multiply(speedFactor);
    }

    move(instanceVelocity) {
        this.currentInstanceLocation = this.currentInstanceLocation.add(instanceVelocity);
        this.moveOutline();
    }
    
    moveOutline() {
        const bounds = this.instance.getBounds();
        const minWorldLocation = this.currentInstanceLocation.floor()
        const maxWorldLocation = minWorldLocation.add(Vector.from(bounds.max));
        this.outliner.setVertices(this.instance.getDimension(), minWorldLocation, maxWorldLocation);
    }

    onPlayerUseItem(event) {
        if (!event.source || event.itemStack?.typeId !== MENU_ITEM) return;
        event.cancel = true;
        system.run(() => this.finish());
    }

    onPlayerLeave(event) {
        if (event.player?.id === this.player.id)
            system.run(() => this.finish());
    }

    finish() {
        system.clearRun(this.runner);
        this.outliner.stopDraw();
        this.outliner = void 0;
        this.instance.move(this.instance.getDimension().id, this.currentInstanceLocation);
        this.instance.enable();
        this.instance.flexMovingPlayerId = void 0;
        this.allowPlayerMovement(true);
        const builder = Builders.get(this.player.id);
        builder.flexibleInstanceMovement = void 0;
        world.beforeEvents.itemUse.unsubscribe(this.onPlayerUseItemBound);
        world.beforeEvents.playerLeave.unsubscribe(this.onPlayerLeaveBound);
        this.sendFeedback({ translate: 'construct.instance.flexibleMove.finish', with: [
            this.instance.getName(), 
            String(this.currentInstanceLocation.floor())
        ] });
    }

    allowPlayerMovement(enable) {
        const inputPermissions = this.player.inputPermissions;
        inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, enable);
    }

    sendFeedback(message) {
        system.run(() => this.player.onScreenDisplay.setActionBar(message));
    }
}
