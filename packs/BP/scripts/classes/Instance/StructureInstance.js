import { Vector } from "../../lib/Vector";
import { StructureOutliner } from "../Render/StructureOutliner";
import { StructureVerifier } from "../Verifier/StructureVerifier";
import { Structure } from "../Structure/Structure";
import { InstanceOptions } from "./InstanceOptions";
import { world, system, TicksPerSecond } from "@minecraft/server";
import { InstanceNotPlacedError } from "../Errors/InstanceNotPlacedError";
import { StructureMaterials } from "../Materials/StructureMaterials";
import { VerificationRenderer } from "../Render/VerificationRenderer";

export class StructureInstance {
    options;
    structure = void 0;
    outliner = void 0;
    verifier = void 0;
    verificationRenderer = void 0;
    materials = void 0;
    flexMovingPlayerId = void 0;

    constructor(instanceName, structureId) {
        this.structure = new Structure(structureId);
        this.options = new InstanceOptions(instanceName, structureId);
        this.refreshBox();
        this.subscribeToEvents();
    }

    delete() {
        this.disable();
        this.options.clear();
        delete this.options;
        delete this.structure;
        delete this.outliner;
        delete this.verifier;
        delete this.verificationRenderer;
        delete this.materials;
    }

    refreshBox() {
        if (!this.hasLocation())
            return;
        if (!this.outliner)
            this.outliner = new StructureOutliner(this);
        if (!this.verifier)
            this.verifier = new StructureVerifier(this, { isEnabled: this.options.verifier.isEnabled });
        if (!this.verificationRenderer)
            this.verificationRenderer = new VerificationRenderer(this);
        if (!this.materials)
            this.materials = new StructureMaterials(this);
        this.outliner.refresh();
        this.verifier.refresh();
        this.verificationRenderer.refresh();
        this.materials.refresh();
    }

    subscribeToEvents() {
        this.disableInstanceWhenNoPlayersOnline();
    }

    getName() {
        return this.options.instanceName;
    }

    getStructureId() {
        return this.options.structureId;
    }

    getLocation() {
        return { dimensionId: this.options.dimensionId, location: this.options.worldLocation };
    }

    getDimension() {
        return this.options?.getDimension();
    }
    
    getLayer() {
        return this.options.currentLayer;
    }

    getMaxLayer() {
        return this.structure.getHeight();
    }

    getBounds() {
        return {
            min: this.structure.getMin(),
            max: this.structure.getMax()
        }
    }

    getActiveBounds() {
        if (!this.options.isEnabled)
            throw new InstanceNotPlacedError(`[Construct] Instance '${this.options.instanceName}' is not placed.`);
        if (this.hasLayerSelected())
            return this.getLayerBounds(this.getLayer());
        return this.getBounds();
    }

    getLayerBounds(layer) {
        if (!this.options.isEnabled)
            throw new InstanceNotPlacedError(`[Construct] Instance '${this.options.instanceName}' is not placed.`);
        const min = this.structure.getMin();
        const max = this.structure.getMax();
        return {
            min: new Vector(min.x, layer - 1, min.z),
            max: new Vector(max.x, layer, max.z)
        };
    }

    getBlock(structureLocation) {
        return this.structure.getBlock(structureLocation);
    }

    getBlocks(structureLocations) {
        return this.structure.getBlocks(structureLocations);
    }

    getLayerBlocks(layer) {
        return this.structure.getLayerBlocks(layer);
    }

    getAllBlocks() {
        return this.structure.getAllBlocks();
    }

    getActiveBlocks() {
        if (!this.options.isEnabled)
            throw new InstanceNotPlacedError(`[Construct] Instance '${this.options.instanceName}' is not placed.`);
        if (this.hasLayerSelected())
            return this.getLayerBlocks(this.getLayer() - 1);
        return this.getAllBlocks();
    }

    isLocationActive(dimensionId, structureLocation, { useActiveLayer = true } = {}) {
        if (!this.options.isEnabled || this.options.dimensionId !== dimensionId)
            return false;
        let bounds;
        if (useActiveLayer)
            bounds = this.getActiveBounds();
        else
            bounds = this.getBounds();
        return structureLocation.x >= bounds.min.x && structureLocation.x < bounds.max.x
            && structureLocation.y >= bounds.min.y && structureLocation.y < bounds.max.y
            && structureLocation.z >= bounds.min.z && structureLocation.z < bounds.max.z;
    }

    getAllActiveLocations() {
        if (!this.options.isEnabled)
            throw new InstanceNotPlacedError(`[Construct] Instance '${this.options.instanceName}' is not placed.`);
        if (this.hasLayerSelected())
            return this.structure.getLayerLocations(this.getLayer()-1);
        else
            return this.structure.getAllLocations();
    }

    getActiveMaterials() {
        return this.materials;
    }

    isEnabled() {
        return this.options.isEnabled;
    }

    hasLocation() {
        return this.options.dimensionId && (this.options.worldLocation.x !== 0 || this.options.worldLocation.y !== 0 || this.options.worldLocation.z !== 0);
    }

    hasLayers() {
        return this.getMaxLayer() > 1;
    }

    hasLayerSelected() {
        return this.hasLayers() && this.options.currentLayer !== 0;
    }

    hasWholeStructureSelected() {
        return this.hasLocation() && this.options.currentLayer === 0;
    }

    isAtMaxLayer() {
        return !this.hasLayers || this.options.currentLayer >= this.getMaxLayer();
    }

    isAtMinLayer() {
        return !this.hasLayers || this.options.currentLayer <= 0;
    }

    enable() {
        this.options.enable();
        this.refreshBox();
    }

    disable() {
        this.options.disable();
        this.refreshBox();
    }

    rename(newName) {
        this.options.rename(newName);
    }

    place(dimensionId, worldLocation) {
        this.enable();
        this.move(dimensionId, worldLocation);
    }

    move(dimensionId, worldLocation) {
        this.options.move(dimensionId, worldLocation);
        this.refreshBox();
    }

    setLayer(layer) {
        if (layer < 0 || layer > this.getMaxLayer())
            throw new Error(`[Construct] Layer ${layer} is out of bounds.`);
        this.options.setLayer(layer);
        this.refreshBox();
    }

    setVerifierEnabled(enable) {
        this.options.setVerifierEnabled(enable);
        this.verifier.refresh();
        this.verificationRenderer.refresh();
    }

    setVerifierDistance(distance) {
        this.options.setVerifierDistance(distance);
        if (this.options.verifier.trackPlayerDistance === 0) {
            const bounds = this.getBounds();
            this.options.verifier.particleLifetime = Math.max(bounds.min.volume(bounds.max) / TicksPerSecond, 2*TicksPerSecond);
        } else {
            this.options.verifier.particleLifetime = 10;
        }
        this.verificationRenderer.refresh();
    }

    increaseLayer() {
        if (this.isAtMaxLayer())
            this.setLayer(0);
        else
            this.setLayer(this.options.currentLayer + 1);
    }

    decreaseLayer() {
        if (this.isAtMinLayer())
            this.setLayer(this.getMaxLayer());
        else
            this.setLayer(this.options.currentLayer - 1);
    }

    startFlexibleMove(player) {
        this.flexMovingPlayerId = player.id;
        this.disable();
        // create flex movement outliner
    }

    stopFlexibleMove(finalLocation) {
        // disable flex movement outliner
        this.move(this.getDimension(), finalLocation);
        this.enable();
        this.flexMovingPlayerId = void 0;
    }

    isFlexibleMoving() {
        return this.flexMovingPlayerId !== void 0;
    }

    disableInstanceWhenNoPlayersOnline() {
        // This prevents a memory leak when no players are online.
        world.beforeEvents.playerLeave.subscribe(event => {
            system.run(() => {
                if (world.getAllPlayers().length === 0 && this.options.isEnabled) {
                    console.info(`[Construct] No players are online. Disabling instance: '${this.options.instanceName}'`);
                    this.disable();
                    this.shouldEnableOnJoin = true;
                }
            });
        });
        world.afterEvents.playerJoin.subscribe(event => {
            if (this.shouldEnableOnJoin) {
                console.info(`[Construct] A player rejoined. Re-enabling instance: '${this.options.instanceName}'`);
                this.enable();
                this.shouldEnableOnJoin = false;
            }
        });
    }

    toGlobalCoords(structureLocation) {
        return Vector.from(structureLocation).add(this.options.worldLocation);
    }

    toStructureCoords(worldLocation) {
        return Vector.from(worldLocation).subtract(this.options.worldLocation);
    }
}