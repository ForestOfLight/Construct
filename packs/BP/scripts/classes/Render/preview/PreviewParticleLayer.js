import { BlockVerificationLevel } from "../../Enums/BlockVerificationLevel";
import { markerCullMask, opaqueCullMask } from "../../Verifier/VerificationLevels";
import { CubeFaceLibrary } from "../model/CubeFaceLibrary";
import { blockModelResolver } from "../model/BlockModelResolver";
import { UNRESOLVED_FACE_STYLE, WATER_MATERIAL, particleStyleOf } from "../VerificationStyle";
import { FaceParticleSpawner } from "./FaceParticleSpawner";

// The particle half of a cell's preview: the block's own model where one is
// missing, a flat translucent cube everywhere else.
export class PreviewParticleLayer {
    #showsBlockPreview;
    #spawner = new FaceParticleSpawner();

    constructor(showsBlockPreview) {
        this.#showsBlockPreview = showsBlockPreview;
    }

    draw(cell) {
        const style = particleStyleOf(cell.verificationLevel, this.#showsBlockPreview);
        if (!style || !cell.block)
            return;
        const culls = this.#cullMasks(cell);
        this.#spawner.startBlock(cell.dimension, cell.origin, cell.lifetimeSeconds);
        for (const layer of this.#faceLayers(cell, style.material))
            this.#drawLayer(cell, layer, style, culls);
    }

    // Two cull rules, because a face drawing a real texture and a face drawing
    // a flat verification color are hidden by different things.
    //
    // An opaque neighbor hides anything laid against it, and is the only thing
    // that can hide a textured face. A marker face - an incorrect block's
    // overlay, or the placeholder standing in for a block the pipeline could
    // not resolve - is additionally hidden by a neighbor drawing a marker of
    // its own, so a run of them reads as one volume. Merely covering the side
    // is not enough: a block embedded in real glass covers every side and hides
    // nothing, and treating that as a cull cost incorrect blocks their overlay.
    //
    // The plain marker cube culls against nothing. It is inset far enough that
    // its neighbors never reach it, so any cull would open a hole in a cube
    // standing in clear air.
    #cullMasks(cell) {
        if (this.#isMarkerCube(cell.verificationLevel))
            return { opaque: 0, marker: 0 };
        const opaque = opaqueCullMask(cell.occlusionMask);
        return { opaque, marker: opaque | markerCullMask(cell.occlusionMask) };
    }

    // Usually one layer - the block's shape - but a waterlogged block is two.
    //
    // Only Missing needs the target block's real shape, since nothing else is
    // rendering there. An incorrect block overlays something already visible,
    // so a plain cube is enough and skips the model lookup entirely; that also
    // means those levels never draw water, because the real block in the world
    // already has its own drawn around it.
    #faceLayers(cell, material) {
        if (!this.#showsBlockPreview || cell.verificationLevel !== BlockVerificationLevel.Missing)
            return [{ faces: CubeFaceLibrary.createPlainCubeFaces(), material, isMarker: true }];
        const layers = [{
            faces: blockModelResolver.facesOf(cell.block),
            material: blockModelResolver.isWater(cell.block) ? WATER_MATERIAL : material
        }];
        // Bedrock keeps a waterlogged block's water outside the permutation, so
        // no baked model can include it; the block's own faces are only ever
        // the stair or fence standing in it.
        if (cell.block.isWaterlogged)
            layers.push({ faces: blockModelResolver.waterloggedFaces(), material: WATER_MATERIAL });
        return layers;
    }

    #drawLayer(cell, layer, style, culls) {
        const layerCull = layer.isMarker ? culls.marker : culls.opaque;
        for (const face of layer.faces) {
            // A face the model itself could not resolve is a marker inside an
            // otherwise real layer, and goes by the marker rule on its own.
            const unresolved = face.missing === true;
            if (this.#isCulled(face, unresolved ? culls.marker : layerCull))
                continue;
            try {
                if (unresolved)
                    this.#spawner.spawnFace(face, UNRESOLVED_FACE_STYLE.color, UNRESOLVED_FACE_STYLE.material, style.scale);
                else
                    this.#spawner.spawnFace(face, style.color, layer.material, style.scale);
            } catch (error) {
                console.warn(`Failed to render face for block ${cell.block.typeId} at ${JSON.stringify(cell.origin)} with verification level ${cell.verificationLevel}:`, error, error.stack);
            }
        }
    }

    // `cull` is the neighbor that can hide this face, and is absent on the
    // faces none can reach - anything inside the block, and every diagonal.
    #isCulled(face, cullMask) {
        return face.cull !== void 0 && ((cullMask >> face.cull) & 1) === 1;
    }

    #isMarkerCube(verificationLevel) {
        return verificationLevel === BlockVerificationLevel.Missing && !this.#showsBlockPreview;
    }
}
