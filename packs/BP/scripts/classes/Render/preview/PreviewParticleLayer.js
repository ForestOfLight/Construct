import { BlockVerificationLevel } from "../../Enums/BlockVerificationLevel";
import { CellFlags } from "../../Verifier/CellFlags";
import { CubeFaceLibrary } from "../model/CubeFaceLibrary";
import { blockModelResolver } from "../model/BlockModelResolver";
import { UNRESOLVED_FACE_STYLE, WATER_MATERIAL, particleStyleOf } from "../VerificationStyle";
import { FaceParticleSpawner } from "./FaceParticleSpawner";

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

    #cullMasks(cell) {
        if (this.#isMarkerCube(cell.verificationLevel))
            return { opaque: 0, marker: 0 };
        const opaque = CellFlags.opaqueMask(cell.occlusionMask);
        return { opaque, marker: opaque | CellFlags.markerMask(cell.occlusionMask) };
    }

    #faceLayers(cell, material) {
        if (!this.#showsBlockPreview || cell.verificationLevel !== BlockVerificationLevel.Missing)
            return [{ faces: CubeFaceLibrary.createPlainCubeFaces(), material, isMarker: true }];
        const layers = [{
            faces: blockModelResolver.facesOf(cell.block),
            material: blockModelResolver.isWater(cell.block) ? WATER_MATERIAL : material
        }];
        if (cell.block.isWaterlogged)
            layers.push({ faces: blockModelResolver.waterloggedFaces(), material: WATER_MATERIAL });
        return layers;
    }

    #drawLayer(cell, layer, style, culls) {
        const layerCull = layer.isMarker ? culls.marker : culls.opaque;
        for (const face of layer.faces) {
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

    #isCulled(face, cullMask) {
        return face.cull !== void 0 && ((cullMask >> face.cull) & 1) === 1;
    }

    #isMarkerCube(verificationLevel) {
        return verificationLevel === BlockVerificationLevel.Missing && !this.#showsBlockPreview;
    }
}
