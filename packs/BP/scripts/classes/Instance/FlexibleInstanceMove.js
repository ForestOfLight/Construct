import { InputPermissionCategory, world, system } from "@minecraft/server";
import { createOutlineRenderer } from "../Render/outline/createOutlineRenderer";
import { MENU_ITEM } from "../../consts";
import { Vector } from "../../lib/Vector";
import { PlayerMovement } from "../PlayerMovement";
import { Builders } from "../Builder/Builders";

const MOVE_OUTLINE_TIMING = Object.freeze({ drawIntervalTicks: 1, lifetimeTicks: 1 });

export class FlexibleInstanceMove {
    player;
    instance;
    outliner;
    currentInstanceLocation;
    runner = void 0;
    #velocity = new Vector();

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
        const { min, max } = this.outlineBounds();
        this.outliner = createOutlineRenderer(
            this.instance.getRenderMode(),
            this.instance.getDimension(),
            min,
            max,
            MOVE_OUTLINE_TIMING
        );
        this.outliner.start();
    }

    prepPlayerForMovement() {
        this.allowPlayerMovement(false);
        world.beforeEvents.itemUse.subscribe(this.onPlayerUseItemBound);
        world.beforeEvents.playerLeave.unsubscribe(this.onPlayerLeaveBound);
        this.sendFeedback({ translate: 'construct.instance.flexibleMove.start', with: [this.instance.getName()] });
    }

    onFlexibleMovementTick() {
        if (!this.player?.isValid)
            this.finish();
        const playerMovement = new PlayerMovement(this.player);
        const instanceVelocity = this.calculateInstanceMovement(playerMovement);
        this.move(instanceVelocity);
    }

    calculateInstanceMovement(playerMovement) {
        const speedFactor = 0.5;

        const viewDir = playerMovement.getMajorDirectionFacing();
        const moveInput = playerMovement.getMovementVector();
        const velocity = this.#velocity.set(
            viewDir.x * moveInput.y + viewDir.z * moveInput.x,
            viewDir.y * moveInput.y,
            viewDir.z * moveInput.y - viewDir.x * moveInput.x
        );

        if (playerMovement.isJumping())
            velocity.y += 1;
        if (playerMovement.isSneaking())
            velocity.y -= 1;

        return velocity.multiplyInPlace(speedFactor);
    }

    move(instanceVelocity) {
        this.currentInstanceLocation = this.currentInstanceLocation.add(instanceVelocity);
        this.moveOutline();
    }
    
    moveOutline() {
        const { min, max } = this.outlineBounds();
        this.outliner.setBounds(this.instance.getDimension(), min, max);
    }

    outlineBounds() {
        const bounds = this.instance.getBounds();
        const origin = this.currentInstanceLocation.floor();
        return {
            min: origin.add(bounds.min),
            max: origin.add(bounds.max)
        };
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
        this.outliner.stop();
        this.outliner = void 0;
        this.instance.move(this.instance.getDimension().id, this.currentInstanceLocation);
        this.instance.enable();
        this.instance.flexMovingPlayerId = void 0;
        this.allowPlayerMovement(true);
        const builder = Builders.get(this.player?.id);
        if (builder)
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
