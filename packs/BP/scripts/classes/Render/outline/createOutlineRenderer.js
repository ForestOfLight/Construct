import { renderProfileOf } from "../../Enums/RenderMode";
import { HybridOutlineRenderer } from "./HybridOutlineRenderer.js";
import { ParticleOutlineRenderer } from "./ParticleOutlineRenderer.js";

export function createOutlineRenderer(renderMode, dimension, min, max, particleTiming) {
    const profile = renderProfileOf(renderMode);
    const Renderer = profile.hybridOutline ? HybridOutlineRenderer : ParticleOutlineRenderer;
    return new Renderer(dimension, min, max, particleTiming);
}
