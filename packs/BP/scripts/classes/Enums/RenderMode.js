export const RenderMode = Object.freeze({
    Default: "default",
    Performance: "performance",
    PreviewOnly: "previewOnly",
    Classic: "classic"
});

export const RENDER_MODE_ORDER = Object.freeze([
    RenderMode.Default,
    RenderMode.Performance,
    RenderMode.PreviewOnly,
    RenderMode.Classic
]);

export const RENDER_MODE_LABELS = Object.freeze({
    [RenderMode.Default]: "construct.instance.option.rendermode.default",
    [RenderMode.Performance]: "construct.instance.option.rendermode.performance",
    [RenderMode.PreviewOnly]: "construct.instance.option.rendermode.previewonly",
    [RenderMode.Classic]: "construct.instance.option.rendermode.classic"
});

const PROFILES = Object.freeze({
    [RenderMode.Default]:     Object.freeze({ debugMarkers: true,  particleOverlays: true,  blockPreview: true,  hybridOutline: true }),
    [RenderMode.Performance]: Object.freeze({ debugMarkers: true,  particleOverlays: false, blockPreview: false, hybridOutline: true }),
    [RenderMode.PreviewOnly]: Object.freeze({ debugMarkers: false, particleOverlays: true,  blockPreview: true,  hybridOutline: true }),
    [RenderMode.Classic]:     Object.freeze({ debugMarkers: false, particleOverlays: true,  blockPreview: false, hybridOutline: false })
});

export function renderProfileOf(mode) {
    return PROFILES[mode] ?? PROFILES[RenderMode.Default];
}
