"""Regolith filter: builds packs/RP/textures/particle/vanilla_block_atlas.png,
packs/BP/scripts/blockAtlas.js, and packs/BP/scripts/blockModels.js from Java
block model/texture data (misode/mcmeta) and Bedrock<->Java state mapping
(PrismarineJS/minecraft-data), for the textured block preview renderer.

Run it directly to regenerate these files in place (no regolith export):

    python filters/fetch_block_models/main.py
"""

import json
import os
import sys
from decimal import Decimal
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "lib"))
from js_data import render  # noqa: E402

from b2j_source import fetch_b2j, manifest_version, parse_java_state
from block_entity_models import resolve_block_entity
from blockstate_resolver import resolve_java_state
from mcmeta_source import McmetaSource
from rotation import signed_angle
from texture_atlas import compose_textures, TextureAtlas

WHITE_TEXTURE = "white"
_FULL_UV = [0, 0, 16, 16]
# Stair "shape" (straight/inner_*/outer_*) is a Java render-time value
# computed from neighboring blocks, not real placed state - Bedrock's own
# stair states carry no such property, so blocksB2J.json fills it in with an
# arbitrary placeholder ("outer_right") for every plain stair state. Left
# alone, that resolves to the corner model (a quarter-width top step) for
# every stair block. Force it back to "straight" - the correct model for an
# isolated preview block with no neighbor context.
_STAIR_SHAPES = {"inner_left", "inner_right", "outer_left", "outer_right", "straight"}

# Bedrock's "direction_z" billboard takes a facing direction and nothing
# else - there's no way to hand it a full orientation - so the engine
# derives the quad's up vector itself and every texture lands at whatever
# roll that produces. These three constants describe that engine behavior;
# everything else about a face's orientation is derived from Java's data.
#
# A face with a horizontal normal comes out reading world-up, which is
# already what an unrotated Java side face wants - hence those faces
# needing no roll and looking correct today. A face with a vertical normal
# has no world-up to lean on, and the engine settles on a fixed orientation
# reading south (+z) instead. That is exactly why every top and bottom
# texture currently faces south regardless of which block it belongs to:
# Java's up face reads north, so it is a full 180 degrees out.
_ENGINE_UP_HORIZONTAL_FACE = [0, 1, 0]
_ENGINE_UP_VERTICAL_FACE = [0, 0, 1]
# Which way a positive Molang rotation actually spins the quad: the opposite
# way to the right-handed angle _derive_roll measures about the direction the
# particle is given, hence the negation.
#
# Only faces needing a quarter turn can tell the two apart, because negating
# a roll changes what's drawn by twice the angle - and twice a half turn is
# a full turn, which is nothing. So every plain full cube looks identical
# either way and pins nothing down. Settled instead on blocks turned a
# quarter of the way round: a command block and a barrel facing east both
# want their top and bottom textures reading east, and with a positive sign
# both read west - out by exactly the 180 degrees that doubling a quarter
# turn gives.
_ROLL_HANDEDNESS = -1

# 'roll' matches what the real pipeline derives for an unrotated full cube
# (see _derive_roll): 180 on the up face, 0 everywhere else. The white
# swatch is a solid color, so no roll would look any different today - these
# are correct rather than convenient so that swapping in a non-uniform
# fallback texture later doesn't quietly render it sideways.
#
# 'missing' marks a face the pipeline could not resolve, as opposed to one it
# resolved to a genuinely white texture. The renderer draws these see-through
# blue instead of solid, so a block the data failed on is obvious on sight
# rather than looking like a legitimately blank block.
WHITE_CUBE_FACES = [
    {"center": [8, 16, 8], "width": 16, "height": 16, "normal": [0, 1, 0], "texture": WHITE_TEXTURE, "uv": _FULL_UV, "roll": 180, "tintindex": -1, "missing": True},
    {"center": [8, 0, 8], "width": 16, "height": 16, "normal": [0, -1, 0], "texture": WHITE_TEXTURE, "uv": _FULL_UV, "roll": 0, "tintindex": -1, "missing": True},
    {"center": [8, 8, 0], "width": 16, "height": 16, "normal": [0, 0, -1], "texture": WHITE_TEXTURE, "uv": _FULL_UV, "roll": 0, "tintindex": -1, "missing": True},
    {"center": [8, 8, 16], "width": 16, "height": 16, "normal": [0, 0, 1], "texture": WHITE_TEXTURE, "uv": _FULL_UV, "roll": 0, "tintindex": -1, "missing": True},
    {"center": [16, 8, 8], "width": 16, "height": 16, "normal": [1, 0, 0], "texture": WHITE_TEXTURE, "uv": _FULL_UV, "roll": 0, "tintindex": -1, "missing": True},
    {"center": [0, 8, 8], "width": 16, "height": 16, "normal": [-1, 0, 0], "texture": WHITE_TEXTURE, "uv": _FULL_UV, "roll": 0, "tintindex": -1, "missing": True},
]

def _derive_width_height(extent, uv_u, uv_v):
    """Derives the quad's size from its fully-rotated extent vector, measured
    along its own texture axes rather than along world axes: width is how far
    the face reaches in the direction the texture's u runs, height the same
    for v. Must happen only after ALL rotation is done (per-face uv rotation,
    element-level, and blockstate x/y).

    Measuring along the texture axes is what keeps the quad and its texture
    sample from ever disagreeing. Whatever reorients the face - a 90-degree
    blockstate rotation that turns a vertical-normal face horizontal, or a
    per-face uv rotation that swaps which world axis carries u - moves the
    texture axes with it, so width/height and the uv rect's width/height
    always come out paired the same way instead of transposed.

    Projection also handles diagonal faces for free (cross-plant quads
    rotated 45 degrees around Y, whose single horizontal length is split
    across X and Z): the extent's component along the equally-diagonal u
    axis is the full length, with no special case needed."""
    return _project(extent, uv_u), _project(extent, uv_v)


def _project(vec, axis):
    """Absolute length of `vec`'s component along the unit vector `axis`."""
    return abs(sum(Decimal(a) * Decimal(b) for a, b in zip(vec, axis)))


def _derive_roll(normal, uv_v):
    """Degrees the billboard has to be spun around its own facing direction
    for the texture to read the way Java draws it.

    A Bedrock "direction_z" billboard only takes a facing direction, never a
    full orientation, so the engine picks the quad's up vector itself and
    the texture lands wherever that puts it. The two constants above say
    where that is; this measures the gap between there and where the face's
    own texture axes say up should be (the direction v runs is the texture
    reading *downward*, so texture-up is its opposite).

    Measured about the facing direction actually handed to the particle -
    which is the outward normal with y negated, see _facing - rather than
    about the normal itself, so the sign follows the same axis the engine
    spins around."""
    facing = _facing(normal)
    engine_up = (_ENGINE_UP_VERTICAL_FACE if _is_vertical(normal)
                 else _ENGINE_UP_HORIZONTAL_FACE)
    texture_up = [-Decimal(c) for c in uv_v]
    return _normalize_roll(_ROLL_HANDEDNESS * signed_angle(engine_up, texture_up, facing))


def _normalize_roll(degrees):
    """Folds a roll into (-180, 180] so the two ways of writing a half turn
    don't both occur. They spin the quad identically, but face descriptors
    are deduplicated by value (see build_face_types_and_refs), so letting
    both through would split otherwise identical faces across two entries
    and churn the generated table on every unrelated change.

    Folded by subtraction rather than with "%", because these are Decimals
    and Decimal's remainder takes the sign of the dividend the way C's fmod
    does, not Python's - so -180 % 360 stays -180 instead of coming back as
    the 180 this is meant to produce."""
    degrees = Decimal(degrees)
    while degrees > 180:
        degrees -= 360
    while degrees <= -180:
        degrees += 360
    return degrees


def _facing(normal):
    """The direction the renderer actually hands the particle, which is the
    outward normal with its y component negated - see the note in
    BlockPreviewVerificationLevelParticleRender#renderFace on why up/down
    faces render backwards without it."""
    return [Decimal(normal[0]), -Decimal(normal[1]), Decimal(normal[2])]


def _is_vertical(normal):
    return abs(Decimal(normal[1])) >= Decimal("0.5")


def root_dir():
    root = os.environ.get("ROOT_DIR")
    return Path(root) if root else Path(__file__).resolve().parents[2]


def load_manifest(root):
    with open(root / "packs" / "BP" / "manifest.json", encoding="utf-8") as f:
        return json.load(f)


def build_block_models(mcmeta, b2j, atlas):
    """Returns {bedrock_state_str: [face, ...]}, faces still carrying a
    'texture' name (not yet projected into atlas-pixel UV)."""
    block_models = {}
    for bedrock_state, java_state in b2j.items():
        java_block_id, properties = parse_java_state(java_state)
        if properties.get("shape") in _STAIR_SHAPES:
            properties["shape"] = "straight"
        elements = resolve_java_state(mcmeta, java_block_id, properties)
        if not elements:
            elements = resolve_block_entity(java_block_id, properties)
        if not elements:
            block_models[bedrock_state] = [dict(face) for face in WHITE_CUBE_FACES]
            continue
        faces = []
        for element in elements:
            for face in element["faces"].values():
                # a hardcoded block-entity shape's face may ask for a
                # mirrored copy of its texture (see model_resolver.
                # resolve_elements's 'flip') - "|" can't appear in a real
                # mcmeta texture name, so this stays unambiguous
                texture = f"{face['texture']}|{face['flip']}" if face["flip"] else face["texture"]
                width, height = _derive_width_height(face["extent"], face["uv_u"], face["uv_v"])
                faces.append({
                    "center": face["center"],
                    "width": width,
                    "height": height,
                    "normal": face["normal"],
                    "texture": texture,
                    "uv": face["uv"],
                    "roll": _derive_roll(face["normal"], face["uv_v"]),
                    "tintindex": face["tintindex"],
                })
        faces = _merge_coincident_faces(faces)
        for face in faces:
            atlas.add(mcmeta, face["texture"])
        block_models[bedrock_state] = faces
    return block_models


def _merge_coincident_faces(faces):
    """Collapses faces that occupy exactly the same quad into one.

    Java draws a block's elements in order, so an element laid exactly over
    an earlier one is a deliberate overlay - a grass block is a full cube of
    dirt-and-grass sides with a second, identical cube carrying just the
    tinted grass fringe over them. Our renderer has no draw order to lean
    on: it spawns a particle per face, and two quads sharing a plane z-fight
    and flicker between the two textures instead of layering.

    Merging them into a single face carrying a composited texture (see
    TextureAtlas) reproduces the layering with one quad, so there is nothing
    left to fight. Where the two faces are the same texture drawn twice
    (several of the small plant models do this), the second simply
    disappears.

    Only faces agreeing on every other value are merged - same position,
    size, roll and uv rect - because compositing happens in the atlas, at
    texture level, and that is only equivalent to layering when both faces
    sample the same rect of it."""
    merged = []
    by_quad = {}
    for face in faces:
        key = (
            tuple(str(c) for c in face["center"]), tuple(str(c) for c in face["normal"]),
            str(face["width"]), str(face["height"]), str(face["roll"]),
            tuple(str(c) for c in face["uv"]),
        )
        first = by_quad.get(key)
        if first is None:
            by_quad[key] = face
            merged.append(face)
        elif first["texture"] != face["texture"]:
            first["texture"] = compose_textures(first["texture"], face["texture"])
    return merged


def project_uv(block_models, atlas_manifest):
    """Replaces each face's 'texture' name and Java-space (0-16) 'uv' rect
    with its final atlas-pixel 'uv' rect.

    A face's own uv is often smaller than the whole texture (e.g. a fence
    post's narrow faces only sample a thin strip) - using the whole
    texture's rect regardless would squish the entire texture into that
    smaller face.

    The rect's width and height come straight off the raw uv numbers, with
    no reordering: the quad's own width was measured along the texture's u
    axis and its height along v (see _derive_width_height), so the u span
    always belongs to the width and the v span to the height no matter how
    the face has been rotated. Rotation shows up as the face's roll
    instead."""
    white_rect = atlas_manifest.get(WHITE_TEXTURE)
    for faces in block_models.values():
        for face in faces:
            texture = face.pop("texture")
            u0, v0, u1, v1 = (Decimal(c) for c in face.pop("uv"))
            u_min, v_min = min(u0, u1), min(v0, v1)
            rect = atlas_manifest.get(texture)
            if rect is None:
                # a face whose texture never made it into the atlas has
                # nothing to draw; flag it so the renderer shows it as
                # unresolved rather than silently drawing a blank white quad
                rect = white_rect
                face["missing"] = True
            face["uv"] = {
                "x": rect["x"] + (u_min / 16) * rect["w"],
                "y": rect["y"] + (v_min / 16) * rect["h"],
                "w": (abs(u1 - u0) / 16) * rect["w"],
                "h": (abs(v1 - v0) / 16) * rect["h"],
            }
    return block_models


def build_face_types_and_refs(block_models):
    """Deduplicates each face's full descriptor (shape + uv together) into a
    shared face-type table, replacing each block's face list with a flat list
    of integer indices into that table. Mutates and returns block_models;
    also returns the shared face_types list. Call this AFTER project_uv
    (faces must already have 'uv' set, not 'texture')."""
    face_type_index = {}
    face_types = []
    for bedrock_state, faces in block_models.items():
        refs = []
        for face in faces:
            uv = face["uv"]
            missing = face.get("missing", False)
            key = (
                tuple(face["center"]), face["width"], face["height"], tuple(face["normal"]),
                face["roll"], face["tintindex"],
                uv["x"], uv["y"], uv["w"], uv["h"], missing,
            )
            if key not in face_type_index:
                face_type_index[key] = len(face_types)
                descriptor = {
                    "center": face["center"],
                    "width": face["width"],
                    "height": face["height"],
                    "normal": face["normal"],
                    "roll": face["roll"],
                    "tintindex": face["tintindex"],
                    "uv": uv,
                }
                # only carried when true - it's rare, and every face-type
                # descriptor is written out literally
                if missing:
                    descriptor["missing"] = True
                face_types.append(descriptor)
            refs.append(face_type_index[key])
        block_models[bedrock_state] = refs
    return face_types, block_models


def build(root):
    manifest = load_manifest(root)
    version = manifest_version(manifest)
    b2j = fetch_b2j(version)
    mcmeta = McmetaSource.download()

    atlas = TextureAtlas()
    white_path = root / "packs" / "RP" / "textures" / "particle" / "white.png"
    atlas.add_image(WHITE_TEXTURE, Image.open(white_path))

    block_models = build_block_models(mcmeta, b2j, atlas)
    atlas_image, atlas_manifest = atlas.pack()
    white_rect = atlas_manifest[WHITE_TEXTURE]
    block_models = project_uv(block_models, atlas_manifest)
    face_types, block_models = build_face_types_and_refs(block_models)
    return atlas_image, white_rect, face_types, block_models


def write_outputs(root, atlas_image, white_rect, face_types, block_models):
    atlas_path = root / "packs" / "RP" / "textures" / "particle" / "vanilla_block_atlas.png"
    atlas_image.save(atlas_path)

    atlas_js_path = root / "packs" / "BP" / "scripts" / "blockAtlas.js"
    atlas_js_contents = (
        f"export const atlasWidth = {atlas_image.width};\n"
        f"export const atlasHeight = {atlas_image.height};\n\n"
        # so runtime fallback geometry (e.g. BlockModelLookup's WHITE_CUBE_FACES)
        # can point at the real white swatch instead of a hardcoded pixel guess
        "export const whiteUvRect = " + render({
            "x": white_rect["x"], "y": white_rect["y"], "w": white_rect["w"], "h": white_rect["h"],
        }) + ";"
    )
    atlas_js_path.write_text(atlas_js_contents, encoding="utf-8")

    models_js_path = root / "packs" / "BP" / "scripts" / "blockModels.js"
    models_js_contents = (
        "export const blockFaceTypes = " + render(face_types) + ";\n\n"
        "export const blockModels = " + render(block_models) + ";"
    )
    models_js_path.write_text(models_js_contents, encoding="utf-8")

    print(f"[fetch_block_models] wrote {atlas_path}, {atlas_js_path}, {models_js_path}")


def main():
    root = root_dir()
    atlas_image, white_rect, face_types, block_models = build(root)
    write_outputs(root, atlas_image, white_rect, face_types, block_models)


if __name__ == "__main__":
    main()
