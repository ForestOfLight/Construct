import { BlockVerificationLevel } from "../Enums/BlockVerificationLevel";

export const MaterialType = Object.freeze({
    OPAQUE: "opaque",
    BLEND: "blend"
});

// An incorrect block is drawn slightly outside its cell so it wraps the real
// block instead of z-fighting with it.
const OVERLAY_SCALE = 1.01;

// A missing block is drawn slightly inside its cell so a run of them reads as one mass,
// but when a block is placed there is no z-fighting. This inset is also the one thing
// keeping neighbor culling from being exactly invisible: two missing blocks
// side by side stop short of their shared boundary, so culling the faces they
// present to each other opens a seam visible at a grazing angle. Setting this
// to 1.00 makes every cull exact, but causes z-fighting for placed blocks.
const MISSING_SCALE = 0.995;

// A missing block in a mode that draws no preview (the Classic look): a small see-through cube
// floating in the middle of its cell.
const MARKER_SCALE = 0.90;

const PARTICLE_STYLES = Object.freeze({
    [BlockVerificationLevel.NoMatch]: Object.freeze({
        color: { red: 1, green: 0, blue: 0, alpha: 0.2 }, scale: OVERLAY_SCALE, material: MaterialType.BLEND
    }),
    [BlockVerificationLevel.TypeMatch]: Object.freeze({
        color: { red: 1, green: 1, blue: 0, alpha: 0.2 }, scale: OVERLAY_SCALE, material: MaterialType.BLEND
    }),
    [BlockVerificationLevel.Missing]: Object.freeze({
        color: { red: 0.55, green: 0.8, blue: 1, alpha: 1 }, scale: MISSING_SCALE, material: MaterialType.OPAQUE
    })
});

const MARKER_STYLE = Object.freeze({
    color: { red: 0, green: 0, blue: 1, alpha: 0.2 }, scale: MARKER_SCALE, material: MaterialType.BLEND
});

const BOX_STYLES = Object.freeze({
    [BlockVerificationLevel.NoMatch]: Object.freeze({
        color: { red: 1, green: 0, blue: 0, alpha: 1 }, scale: OVERLAY_SCALE
    }),
    [BlockVerificationLevel.TypeMatch]: Object.freeze({
        color: { red: 1, green: 1, blue: 0, alpha: 1 }, scale: OVERLAY_SCALE
    }),
    [BlockVerificationLevel.Missing]: Object.freeze({
        color: { red: 0.3, green: 0.57, blue: 0.87, alpha: 1 }, scale: 1.00
    })
});

// A face the pipeline couldn't resolve.
export const UNRESOLVED_FACE_STYLE = Object.freeze({
    color: { red: 0.3, green: 0.57, blue: 0.87, alpha: 0.2 }, material: MaterialType.BLEND
});

// Water is the one block whose texture is authored see-through - Java draws it
// translucent and block/water_still carries an alpha of 180/255, which the
// atlas keeps. The preview's usual material alpha-tests rather than blending,
// which forced every partly-transparent texel solid.
export const WATER_MATERIAL = MaterialType.BLEND;

// Undefined for levels that draw no particle at all.
export function particleStyleOf(verificationLevel, showsBlockPreview) {
    if (verificationLevel === BlockVerificationLevel.Missing && !showsBlockPreview)
        return MARKER_STYLE;
    return PARTICLE_STYLES[verificationLevel];
}

// Undefined for levels that get no box. That is what makes a cell going to
// Match or Air a removal rather than a recolour.
export function boxStyleOf(verificationLevel) {
    return BOX_STYLES[verificationLevel];
}
