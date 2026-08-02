// How an instance draws itself. Four decisions - whether blocks get debug-box
// markers, whether they get the particle overlay, whether a missing block's
// overlay is its real textured model, and how the structure outline is drawn -
// but they are presented as one named mode so the settings menu stays a single
// choice and no illegal combination can be persisted.
//
// String values rather than the ints BlockVerificationLevel uses, because
// unlike that one this enum is written to a dynamic property as JSON: strings
// stay readable there and survive this list being reordered.
export const RenderMode = Object.freeze({
    Default: "default",
    Performance: "performance",
    PreviewOnly: "previewOnly",
    Classic: "classic"
});

// The order the modes appear in the settings dropdown. The form knows only an
// index, so this is what turns one into the other in both directions.
export const RENDER_MODE_ORDER = Object.freeze([
    RenderMode.Default,
    RenderMode.Performance,
    RenderMode.PreviewOnly,
    RenderMode.Classic
]);

// Kept beside the modes so adding one can't leave the dropdown showing a raw
// key, and so the order above and the names stay in one file.
export const RENDER_MODE_LABELS = Object.freeze({
    [RenderMode.Default]: "construct.instance.option.rendermode.default",
    [RenderMode.Performance]: "construct.instance.option.rendermode.performance",
    [RenderMode.PreviewOnly]: "construct.instance.option.rendermode.previewonly",
    [RenderMode.Classic]: "construct.instance.option.rendermode.classic"
});

// The two block-drawing axes are additive, not exclusive. debugMarkers puts a
// debug box on every missing and incorrect block; particleOverlays draws the
// particle layer over those same blocks. Default does both, so a block is
// boxed and shaded at once; Performance is the one mode that spawns no block
// particles at all, which is the whole of what it buys.
//
// blockPreview only refines the particle layer, and only for missing blocks -
// their real textured model instead of a plain marker. It says nothing about
// incorrect blocks, which are drawn over something that is already there.
//
// hybridOutline is its own axis because the outline's two halves want opposite
// treatments: the twelve edges are long runs that cost a lot as particles and
// nothing as debug lines, while the corner markers read better as particles.
// Only Classic asks for the all-particle outline.
const PROFILES = Object.freeze({
    [RenderMode.Default]:     Object.freeze({ debugMarkers: true,  particleOverlays: true,  blockPreview: true,  hybridOutline: true }),
    [RenderMode.Performance]: Object.freeze({ debugMarkers: true,  particleOverlays: false, blockPreview: false, hybridOutline: true }),
    [RenderMode.PreviewOnly]: Object.freeze({ debugMarkers: false, particleOverlays: true,  blockPreview: true,  hybridOutline: true }),
    [RenderMode.Classic]:     Object.freeze({ debugMarkers: false, particleOverlays: true,  blockPreview: false, hybridOutline: false })
});

// Modes are read back off disk, so an unrecognized one falls back to the
// default rather than rendering nothing at all.
function profileOf(mode) {
    return PROFILES[mode] ?? PROFILES[RenderMode.Default];
}

export function usesDebugMarkers(mode) {
    return profileOf(mode).debugMarkers;
}

export function usesParticleOverlays(mode) {
    return profileOf(mode).particleOverlays;
}

export function showsBlockPreview(mode) {
    return profileOf(mode).blockPreview;
}

export function usesHybridOutline(mode) {
    return profileOf(mode).hybridOutline;
}
