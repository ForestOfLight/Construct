"""Builds packs/RP/textures/particle/vanilla_block_atlas.png,
packs/BP/scripts/blockAtlas.js, and packs/BP/scripts/blockModels.js from Java
block model/texture data (misode/mcmeta) and Bedrock<->Java state mapping
(PrismarineJS/minecraft-data), for the textured block preview renderer.

Run it directly, from anywhere, to regenerate those three files in place:

    python tools/bake_block_models/main.py

Needs Pillow (see requirements.txt) and pulls ~100MB over the network, so it
is a deliberate step to run when Minecraft updates rather than something a
build triggers. Regolith also runs it as the `fetch_block_models` filter on
the release profile; the only difference there is that ROOT_DIR points at the
project root, since a filter's working directory is regolith's temp export.
"""

import json
import os
import sys
from decimal import Decimal
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "lib"))
from js_data import render, render_rows  # noqa: E402

from b2j_source import fetch_b2j, manifest_version, parse_java_state
from block_entity_models import resolve_block_entity
from blockstate_resolver import resolve_java_state, resolve_particle_texture
from mcmeta_source import McmetaSource
from rotation import signed_angle
from texture_atlas import compose_textures, tinted, TextureAtlas

WHITE_TEXTURE = "white"
_FULL_UV = [0, 0, 16, 16]
# The white swatch is the one texture stretched across a whole block face at
# full size (the missing-block cube and the plain outline cube both sample
# nothing else), so the renderer magnifies it far harder than any real block
# texture. A single white texel could not survive that: filtering and
# mipmapping average a magnified quad against the texels around it, and a
# lone texel's neighbors are the transparent gaps of the atlas, so the cube's
# face edges faded away and its edges visibly stopped meeting (#18). Give the
# swatch the same 16x16 footprint as a block texture - a power of two, so
# halving it for each mip level keeps averaging white with white.
_WHITE_SWATCH_SIZE = 16
# Sampled half a texel in from each edge: the outermost points the renderer
# reads are then swatch texel centers rather than the boundary it shares with
# whatever the packer happened to put beside it.
_HALF_TEXEL = Decimal("0.5")
# Stair "shape" (straight/inner_*/outer_*) is a Java render-time value
# computed from neighboring blocks, not real placed state - Bedrock's own
# stair states carry no such property, so blocksB2J.json fills it in with an
# arbitrary placeholder ("outer_right") for every plain stair state. Left
# alone, that resolves to the corner model (a quarter-width top step) for
# every stair block. Force it back to "straight" - the correct model for an
# isolated preview block with no neighbor context.
_STAIR_SHAPES = {"inner_left", "inner_right", "outer_left", "outer_right", "straight"}

# Java state overrides applied per Bedrock block id, replacing whatever
# blocksB2J.json maps that block to.
#
# Java splits a potted plant into a separate block id per plant
# (potted_dandelion, potted_cactus, ...) while Bedrock keeps every pot as one
# flower_pot block with the plant in the block entity. There is exactly one
# Bedrock flower_pot state to map, so blocksB2J has to pick one of Java's ~40
# potted ids for it and picks an arbitrary one - currently
# potted_closed_eyeblossom - which draws that flower into every pot in a
# preview. Bedrock's permutation carries no plant for us to read back, so an
# empty pot is the only honest shape: it is right for an empty pot and, for a
# planted one, understates rather than showing the wrong flower.
_JAVA_STATE_OVERRIDES = {
    "minecraft:flower_pot": ("minecraft:flower_pot", {}),
}

# Redstone dust's color per power level, 0-255. Java multiplies the wire's
# greyscale texture by this, so without it every dust reads as fully
# powered - signal 0 and signal 15 come out identical.
#
# Unlike every other tint here, these are per block state, not per texture,
# so they can't live in texture_atlas's DEFAULT_TINTS; each level gets its
# own atlas entry via texture_atlas.tinted(). Bedrock's redstone_signal maps
# straight onto Java's power, so the level is always known.
#
# Hardcoded because the ramp is computed in RedStoneWireBlock's source and
# appears in no asset we fetch - mcmeta's assets branch carries only the
# grass/foliage/dry_foliage colormaps. Java's formula, for f = power / 15:
#   r = f * 0.6 + (0.4 if f > 0 else 0.3)
#   g = clamp(f * f * 0.7 - 0.5, 0, 1)
#   b = clamp(f * f * 0.6 - 0.7, 0, 1)
REDSTONE_POWER_TINTS = [
    (77, 0, 0),     # power 0
    (112, 0, 0),    # power 1
    (122, 0, 0),    # power 2
    (133, 0, 0),    # power 3
    (143, 0, 0),    # power 4
    (153, 0, 0),    # power 5
    (163, 0, 0),    # power 6
    (173, 0, 0),    # power 7
    (184, 0, 0),    # power 8
    (194, 0, 0),    # power 9
    (204, 0, 0),    # power 10
    (214, 0, 0),    # power 11
    (224, 0, 0),    # power 12
    (235, 7, 0),    # power 13
    (245, 28, 0),   # power 14
    (255, 51, 0),   # power 15
]

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
#
# A tilted face falls under the first of those, not the second: it still has
# a world-up to lean on, just not one lying in its own plane, so the engine's
# choice is world-up flattened into that plane (see _derive_roll). Reading it
# as the second case instead - which a "more vertical than not" test does -
# measures the roll against a direction the face doesn't contain, and is what
# collapsed every 45-degree face's roll to a meaningless 0 or 180.
_ENGINE_UP_HORIZONTAL_FACE = [0, 1, 0]
_ENGINE_UP_VERTICAL_FACE = [0, 0, 1]
# Which way a positive Molang rotation actually spins the quad, relative to
# the right-handed angle _derive_roll measures about the direction the
# particle is given.
#
# The two face classes need OPPOSITE signs, which looks wrong until you
# follow what the renderer does to a vertical face. Its billboard is handed
# the normal with y negated (see _facing) because a direction_z quad
# otherwise comes out backwards. Negating a direction vector doesn't turn
# the quad, it mirrors what's drawn on it - and a mirrored quad spins the
# other way on screen. Measuring the angle about that same negated vector
# doesn't undo a mirroring, so the handedness genuinely differs and one
# constant can't serve both.
#
# Only faces needing a quarter turn can tell a sign apart, because negating
# a roll changes what's drawn by twice the angle - and twice a half turn is
# a full turn, which is nothing. So every plain full cube looks identical
# either way and pins nothing down; that is why the horizontal case went
# unnoticed while every value it produced was 0 or 180.
#
# Vertical settled on blocks turned a quarter of the way round: a command
# block and a barrel facing east both want their top and bottom textures
# reading east, and with the opposite sign both read west.
#
# Horizontal settled on a sideways piston, the first quarter-turned
# horizontal face with a texture asymmetric enough to read. piston_side is
# drawn head-end at the image top, so a piston facing north wants that end
# pointing north on the block's left and right faces; with the opposite sign
# it points south, at the piston's back. The same faces on a sideways barrel
# or log are a quarter turn out too, but barrel_side's hoops and a log's
# bark grain are near enough symmetric top-to-bottom to hide it.
_ROLL_HANDEDNESS_VERTICAL_FACE = -1
_ROLL_HANDEDNESS_HORIZONTAL_FACE = 1

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
_CUBE_FACES = [
    {"center": [8, 16, 8], "width": 16, "height": 16, "normal": [0, 1, 0], "uv": _FULL_UV, "roll": 180, "tintindex": -1},
    {"center": [8, 0, 8], "width": 16, "height": 16, "normal": [0, -1, 0], "uv": _FULL_UV, "roll": 0, "tintindex": -1},
    {"center": [8, 8, 0], "width": 16, "height": 16, "normal": [0, 0, -1], "uv": _FULL_UV, "roll": 0, "tintindex": -1},
    {"center": [8, 8, 16], "width": 16, "height": 16, "normal": [0, 0, 1], "uv": _FULL_UV, "roll": 0, "tintindex": -1},
    {"center": [16, 8, 8], "width": 16, "height": 16, "normal": [1, 0, 0], "uv": _FULL_UV, "roll": 0, "tintindex": -1},
    {"center": [0, 8, 8], "width": 16, "height": 16, "normal": [-1, 0, 0], "uv": _FULL_UV, "roll": 0, "tintindex": -1},
]

WHITE_CUBE_FACES = [
    {**face, "texture": WHITE_TEXTURE, "missing": True} for face in _CUBE_FACES
]

# Blocks Java draws with no model elements at all, but which are not broken
# data - it renders them some other way (the fluid renderer) or not at all
# (barrier and light are invisible in survival). Their model still names a
# particle texture, and where that texture honestly represents the block, a
# cube of it beats the see-through blue "no idea" cube.
#
# Two things qualify, and nothing else does. An "item/" particle means the
# model is pointing at the block's own item icon, which is precisely the
# stand-in Java itself shows for it - barrier, structure_void and the light
# blocks (one icon per level). And the fluids below, whose still texture is
# simply what the block looks like.
#
# Everything else that resolves to nothing is a block entity - skulls,
# banners, chests, golem statues, decorated pots - drawn by entity code we
# have no data for. Their particle is an unrelated block texture (a skull's
# is soul sand), so standing in with it would draw a confidently wrong block
# and hide that the shape is unimplemented. Those stay missing; a hardcoded
# shape in block_entity_models.py is the way to fix one.
_FLUID_BLOCKS = {"minecraft:water", "minecraft:lava", "minecraft:bubble_column"}
_ITEM_TEXTURE_PREFIX = "item/"

# A stand-in texture that beats the one the block's model names. Only the
# bubble column needs one: its model is block/water, so the particle it names
# is block/water_still and it stands in as a plain water cube, which is
# exactly what a water block already looks like. The bubbles are particles
# rather than model geometry, and the particle definitions say which sprite:
# bubble_column_up and current_down - the two a bubble column emits, one per
# drag_down value - both name particle/bubble.
_STAND_IN_TEXTURES = {"minecraft:bubble_column": "particle/bubble"}

# How tall a fluid block's box is, in pixels, per Java "level" - the property
# Bedrock's liquid_depth maps one-to-one onto (see blocksB2J).
#
# Java has no model to read this from: the fluid renderer builds the box in
# code from the fluid's own level and its neighbors', which is why fluids
# reach _stand_in_cube at all. Level 0 is a source and each step of 1 up to 7
# is a shallower flow; the box shrinks downward, its bottom staying on the
# block floor.
#
# Levels 8-15 are Java's "falling" fluids - a column with more fluid directly
# above it. Their height comes from the block above rather than their own
# level (the renderer fills the block outright when the neighbor is the same
# fluid), so the flow-height ramp doesn't apply to them and they stay the full
# cube they render as today. A preview block has no neighbors to read, so
# level alone decides; treating 8-15 as a continuation of the ramp would make
# a falling column of water render as a puddle.
_FLUID_SOURCE_HEIGHT = Decimal(12)
_FLUID_SHALLOWEST_HEIGHT = Decimal(1)
_FLUID_SHALLOWEST_LEVEL = 7
_FLUID_FALLING_LEVEL = 8
_FLUID_FULL_HEIGHT = Decimal(16)
# Eight levels don't divide the 11-pixel span evenly, so the steps land on
# repeating fractions. Round them off rather than writing 28 significant
# digits of 11/7 into every fluid face of the generated table - the renderer
# scales these by 1/16 into a block a few centimeters tall on screen, so four
# places is already far below anything visible.
_FLUID_HEIGHT_PRECISION = Decimal("0.0001")


def _fluid_height(level):
    """Pixel height of the fluid box at Java fluid `level` (see above)."""
    if level >= _FLUID_FALLING_LEVEL:
        return _FLUID_FULL_HEIGHT
    span = _FLUID_SOURCE_HEIGHT - _FLUID_SHALLOWEST_HEIGHT
    height = _FLUID_SOURCE_HEIGHT - span * Decimal(level) / _FLUID_SHALLOWEST_LEVEL
    return height.quantize(_FLUID_HEIGHT_PRECISION)


def _fluid_box_faces(height):
    """The six faces of a fluid box `height` pixels tall, sitting on the
    block floor.

    The sides sample the bottom of their texture rather than being handed the
    whole thing: a fluid's surface drops without its texture stretching or
    sliding, so the strip of texture a short side shows is the strip that was
    already against the block floor. v runs downward from the top of the
    texture, so that strip starts at 16 - height."""
    if height >= _FLUID_FULL_HEIGHT:
        return [dict(face) for face in _CUBE_FACES]
    side_uv = [0, _FULL_UV[3] - height, _FULL_UV[2], _FULL_UV[3]]
    middle = height / 2
    return [
        {"center": [8, height, 8], "width": 16, "height": 16, "normal": [0, 1, 0], "uv": _FULL_UV, "roll": 180, "tintindex": -1},
        {"center": [8, 0, 8], "width": 16, "height": 16, "normal": [0, -1, 0], "uv": _FULL_UV, "roll": 0, "tintindex": -1},
        {"center": [8, middle, 0], "width": 16, "height": height, "normal": [0, 0, -1], "uv": side_uv, "roll": 0, "tintindex": -1},
        {"center": [8, middle, 16], "width": 16, "height": height, "normal": [0, 0, 1], "uv": side_uv, "roll": 0, "tintindex": -1},
        {"center": [16, middle, 8], "width": 16, "height": height, "normal": [1, 0, 0], "uv": side_uv, "roll": 0, "tintindex": -1},
        {"center": [0, middle, 8], "width": 16, "height": height, "normal": [-1, 0, 0], "uv": side_uv, "roll": 0, "tintindex": -1},
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
    if _is_vertical(normal):
        engine_up = _ENGINE_UP_VERTICAL_FACE
        handedness = _ROLL_HANDEDNESS_VERTICAL_FACE
    else:
        # World-up flattened into the quad's own plane. For an upright face
        # that is world-up itself, which is why this was written as the bare
        # constant and went unnoticed; for a tilted face it leans with the
        # face, and using the unflattened constant measured the angle in a
        # plane the face doesn't lie in.
        engine_up = _flatten_into_plane(_ENGINE_UP_HORIZONTAL_FACE, facing)
        handedness = _ROLL_HANDEDNESS_HORIZONTAL_FACE
    texture_up = [-Decimal(c) for c in uv_v]
    return _normalize_roll(handedness * signed_angle(engine_up, texture_up, facing))


def _flatten_into_plane(vec, normal):
    """`vec` with its component along `normal` (a unit vector) removed, so
    it lies in the plane `normal` is perpendicular to."""
    along = sum(Decimal(a) * Decimal(b) for a, b in zip(vec, normal))
    return [Decimal(a) - along * Decimal(b) for a, b in zip(vec, normal)]


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
    """The direction the renderer hands the particle: the face's own outward
    normal, reversed for a face pointing straight up or down.

    This used to be "the normal with its y component negated", which is the
    same thing for every face that ever exercised it - a horizontal normal
    has no y to negate, and a vertical one is exactly reversed by it - but
    only for those. Negating y is a reflection, not a rotation, and for any
    other normal it lands on a direction the face never pointed: a 45-degree
    face's negated normal is perpendicular to the real one, so the quad was
    drawn a quarter turn out of its own plane. That is what left every
    diagonal face - levers, lecterns, tripwire hooks, horizontal chains,
    fire - visibly mismodelled while cross-shaped plants, whose planes are
    turned about y and so keep a horizontal normal, came out fine."""
    if _is_vertical(normal):
        return [-Decimal(c) for c in normal]
    return [Decimal(c) for c in normal]


# A direction billboard has no world-up to orient against only when it points
# exactly along it. Anything else, however steeply tilted, still has one.
_VERTICAL_TOLERANCE = Decimal("0.999999")


def _is_vertical(normal):
    return abs(Decimal(normal[1])) >= _VERTICAL_TOLERANCE


# The six directions a face can be culled against, as offsets to the
# neighboring block. A face's 'cull' is an index into this table, and the
# renderer keeps the same table (CULL_OFFSETS in VerificationLevels.js) to
# turn that index back into the neighbor to ask about. The order is
# arbitrary but shared, so changing it here means changing it there.
_CULL_DIRECTIONS = [
    [0, -1, 0],  # 0 down
    [0, 1, 0],   # 1 up
    [0, 0, -1],  # 2 north
    [0, 0, 1],   # 3 south
    [-1, 0, 0],  # 4 west
    [1, 0, 0],   # 5 east
]

# Which coordinate of a face's center has to sit on the block hull for the
# face to lie flush against the neighbor in that direction: the low face of
# the block sits at 0, the high face at 16.
_HULL_LOW, _HULL_HIGH = Decimal(0), Decimal(16)


def _cull_direction(center, normal):
    """The index into _CULL_DIRECTIONS of the neighbor that hides this face,
    or None if no neighbor can.

    A face is hidden by its neighbor exactly when it lies flat on the block's
    own hull looking outward: it is then coplanar with the neighbor's facing
    surface, and inside the 16x16 footprint that surface covers, so a
    neighbor that fills its cube opaquely leaves nothing of it visible. Both
    halves matter - a face on the hull plane but looking inward (the inside
    of a hollow shape) is seen from within the block, and an outward face
    held off the hull (a cactus side, inset a pixel) has a sliver of block
    beside it that stays visible.

    This is derived from the geometry rather than read from Java's own
    "cullface" (which model_resolver parses and nothing consumes). Java's
    flag is the more aggressive of the two - it culls faces that are merely
    near the hull, cactus sides among them - and that extra reach is exactly
    what our renderer cannot afford, since a preview block is drawn slightly
    inset or slightly oversized rather than filling its cube. Everything
    Java's flag covers that is genuinely flush, this covers too."""
    if not _is_cardinal(normal):
        return None
    axis = next(i for i, c in enumerate(normal) if c)
    plane = _HULL_HIGH if Decimal(normal[axis]) > 0 else _HULL_LOW
    if Decimal(center[axis]) != plane:
        return None
    return _CULL_DIRECTIONS.index([1 if i == axis and plane == _HULL_HIGH
                                   else -1 if i == axis else 0 for i in range(3)])


def _is_cardinal(normal):
    """Whether `normal` points exactly along one world axis. A diagonal face
    (a cross-shaped plant, a lever's stem) never lies flush against a
    neighbor, so it has no cull direction at all."""
    return sorted(abs(Decimal(c)) for c in normal) == [Decimal(0), Decimal(0), Decimal(1)]


def root_dir():
    root = os.environ.get("ROOT_DIR")
    return Path(root) if root else Path(__file__).resolve().parents[2]


def load_manifest(root):
    with open(root / "packs" / "BP" / "manifest.json", encoding="utf-8") as f:
        return json.load(f)


_HANGING_SIGN_SUFFIX = "_hanging_sign"


def rekey_hanging_signs(b2j):
    """Rewrites the hanging-sign entries of `b2j` to name only the Bedrock
    states a live sign actually reads, leaving every other entry alone.

    Bedrock keeps a hanging sign's direction in two different states and reads
    whichever the sign's mounting calls for: ground_sign_direction when it
    hangs from a ceiling by chains (attached_bit=1), facing_direction
    otherwise - both when it hangs free (hanging=1) and when it's fixed to the
    side of a block (hanging=0). The state it isn't reading stays 0.

    blocksB2J is keyed by Java coverage - one Bedrock permutation per Java
    state - so it names all four states on every entry and fills the unread
    ones with whatever the Java->Bedrock direction produces: a
    facing_direction on ceiling signs, and attached_bit=1 plus a
    ground_sign_direction on wall signs. None of that is what a live sign
    carries, and BlockModelLookup requires every state the data discriminates
    on to match, so all 384 permutations of all 12 sign types fell through to
    the missing-block cube. Dropping the unread states from the key lets the
    lookup's partial match find them whatever those states hold."""
    passed_through, signs = {}, {}
    for bedrock_state, java_state in b2j.items():
        bedrock_id = bedrock_state.split("[", 1)[0]
        if bedrock_id.endswith(_HANGING_SIGN_SUFFIX):
            signs.setdefault(bedrock_id, {})[bedrock_state] = java_state
        else:
            passed_through[bedrock_state] = java_state
    for bedrock_id, entries in signs.items():
        passed_through.update(_rekey_one_hanging_sign(bedrock_id, entries))
    return passed_through


def _rekey_one_hanging_sign(bedrock_id, entries):
    wall = {}      # facing_direction -> java state
    rotation = {}  # facing_direction -> the ground_sign_direction facing that way
    attached = {}  # ground_sign_direction -> java state
    free = {}      # ground_sign_direction -> java state
    for bedrock_state, java_state in entries.items():
        _, properties = parse_java_state(bedrock_state)
        facing = properties["facing_direction"]
        ground = properties["ground_sign_direction"]
        if properties["hanging"] == "0":
            wall[facing] = java_state
            # a wall sign faces a compass direction and hangs at a rotation
            # meaning the same thing, which is the only place the data says
            # which rotation a facing_direction stands for
            rotation[facing] = ground
        elif properties["attached_bit"] == "1":
            attached[ground] = java_state
        else:
            free[ground] = java_state

    if not rotation:
        raise ValueError(f"{bedrock_id}: no wall-mounted states to read facings from")

    rekeyed = {}
    for facing, java_state in wall.items():
        rekeyed[f"{bedrock_id}[facing_direction={facing},hanging=0]"] = java_state
    for ground, java_state in attached.items():
        rekeyed[f"{bedrock_id}[attached_bit=1,ground_sign_direction={ground},hanging=1]"] = java_state
    for facing, ground in rotation.items():
        if ground not in free:
            raise ValueError(
                f"{bedrock_id}: no unattached hanging state at rotation {ground}, "
                f"so facing_direction={facing} has no model to point at"
            )
        rekeyed[f"{bedrock_id}[attached_bit=0,facing_direction={facing},hanging=1]"] = free[ground]
    return rekeyed


def build_block_models(mcmeta, b2j, atlas, stats=None):
    """Returns {bedrock_state_str: [face, ...]}, faces still carrying a
    'texture' name (not yet projected into atlas-pixel UV).

    `stats`, if given a dict, accumulates the face counts the two reduction
    passes below moved, for the bake to report."""
    block_models = {}
    for bedrock_state, java_state in b2j.items():
        java_block_id, properties = parse_java_state(java_state)
        override = _JAVA_STATE_OVERRIDES.get(bedrock_state.split("[", 1)[0])
        if override:
            java_block_id, properties = override[0], dict(override[1])
        if properties.get("shape") in _STAIR_SHAPES:
            properties["shape"] = "straight"
        elements = resolve_java_state(mcmeta, java_block_id, properties)
        if not elements:
            elements = resolve_block_entity(java_block_id, properties)
        if not elements:
            stand_in = _stand_in_cube(mcmeta, java_block_id, properties)
            if stand_in:
                for face in stand_in:
                    atlas.add(mcmeta, face["texture"])
            block_models[bedrock_state] = stand_in or [dict(face) for face in WHITE_CUBE_FACES]
            continue
        state_tint = _state_tint(java_block_id, properties)
        faces = []
        for element_index, element in enumerate(elements):
            for face in element["faces"].values():
                width, height = _derive_width_height(face["extent"], face["uv_u"], face["uv_v"])
                # a quad with no area covers no pixels whatever it is textured
                # with, and Java models are full of them - the four "sides" of
                # a flat plane, every face of an element flattened to nothing
                # by its blockstate rotation. Dropping them here keeps them out
                # of the atlas, the face-type table and the reference lists
                # entirely, rather than baking a face the renderer would have
                # to look up and skip on every block it draws.
                if width == 0 or height == 0:
                    continue
                # a hardcoded block-entity shape's face may ask for a
                # mirrored copy of its texture (see model_resolver.
                # resolve_elements's 'flip') - "|" can't appear in a real
                # mcmeta texture name, so this stays unambiguous
                texture = f"{face['texture']}|{face['flip']}" if face["flip"] else face["texture"]
                # a tintindex is Java's "this face takes the block's color";
                # a face without one is drawn as authored, which is how the
                # dot model's overlay stays out of the power ramp
                if state_tint and face["tintindex"] >= 0:
                    texture = tinted(texture, state_tint)
                faces.append({
                    "center": face["center"],
                    "width": width,
                    "height": height,
                    "normal": face["normal"],
                    "texture": texture,
                    "uv": face["uv"],
                    "roll": _derive_roll(face["normal"], face["uv_v"]),
                    "tintindex": face["tintindex"],
                    # the face's texture axes as world directions, carried
                    # only so the two passes below can measure a quad's own
                    # extent within its plane; _drop_uv_axes takes them off
                    # again before anything downstream sees a face
                    "uv_u": face["uv_u"],
                    "uv_v": face["uv_v"],
                    # which element this came off, so _is_buried can ask
                    # whether that element is a box with a far wall or a
                    # zero-thickness plane
                    "element": element_index,
                })
        faces = _merge_coincident_faces(faces)
        # opacity is what says whether one face can hide another, and only
        # the atlas knows it - so the textures go in before the culling pass
        # rather than after it. A face culled below may leave its texture in
        # the atlas unused, which costs a little packed area and nothing else.
        for face in faces:
            atlas.add(mcmeta, face["texture"])
        before = len(faces)
        faces, culled = _cull_interior_faces(faces, atlas)
        faces, joined = _join_coplanar_faces(faces)
        _drop_uv_axes(faces)
        if stats is not None:
            stats["faces_before"] = stats.get("faces_before", 0) + before
            stats["faces_after"] = stats.get("faces_after", 0) + len(faces)
            stats["culled"] = stats.get("culled", 0) + culled
            stats["joined"] = stats.get("joined", 0) + joined
        block_models[bedrock_state] = faces
    return block_models


def _stand_in_cube(mcmeta, java_block_id, properties):
    """A full cube of the block's particle texture, for a block whose model
    draws nothing but that we can still represent honestly (see
    _FLUID_BLOCKS). None if there's nothing fit to stand in with, leaving the
    block to render as missing."""
    texture = resolve_particle_texture(mcmeta, java_block_id, properties)
    if texture is None:
        return None
    if not texture.startswith(_ITEM_TEXTURE_PREFIX) and java_block_id not in _FLUID_BLOCKS:
        return None
    texture = _STAND_IN_TEXTURES.get(java_block_id, texture)
    return [{**face, "texture": texture} for face in _stand_in_shape(java_block_id, properties)]


def _stand_in_shape(java_block_id, properties):
    """The box to draw the stand-in texture on: a full cube, unless this is a
    fluid whose level says how high it stands.

    Checked against the fluid list rather than on a "level" property alone,
    because the other blocks that stand in are the item-icon ones (see
    _ITEM_TEXTURE_PREFIX) and one of them, light, has a "level" property that
    means brightness - reading it as a depth would leave a light block lying
    in a puddle on the floor.

    A bubble column is a fluid block with no level: it is always a full block
    of water, its state saying which way the bubbles drag rather than how deep
    it is, so it keeps the cube."""
    level = properties.get("level")
    if java_block_id not in _FLUID_BLOCKS or level is None:
        return _CUBE_FACES
    return _fluid_box_faces(_fluid_height(int(level)))


def _state_tint(java_block_id, properties):
    """The color this particular block state's tinted faces take, or None if
    the block's color doesn't vary by state (the usual case - those tints are
    baked per texture in texture_atlas.DEFAULT_TINTS)."""
    if java_block_id == "minecraft:redstone_wire":
        return REDSTONE_POWER_TINTS[int(properties.get("power", 0))]
    return None


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


def _dot(a, b):
    return sum(Decimal(x) * Decimal(y) for x, y in zip(a, b))


def _drop_uv_axes(faces):
    """Takes the texture axes back off, once the passes that need them are
    done. Nothing downstream reads them, and a face dict is compared field by
    field in build_face_types_and_refs - so leaving them on would be dead
    weight carried through the whole pipeline."""
    for face in faces:
        face.pop("uv_u", None)
        face.pop("uv_v", None)
        face.pop("element", None)


def _is_axis_aligned_with(face, other):
    """Whether `other`'s texture axes lie along `face`'s - parallel or
    perpendicular, either way round, in any direction.

    This is the precondition for measuring one quad's extent in the other's
    frame as a plain interval (see _covers). Two coplanar quads whose frames
    sit at some other angle - a cross-plant's 45-degree elements - would need
    their overlap computed as real polygon intersection, and taking the
    bounding box instead would claim coverage that isn't there. So they are
    simply left alone."""
    for axis in (other["uv_u"], other["uv_v"]):
        for own in (face["uv_u"], face["uv_v"]):
            if abs(_dot(axis, own)) not in (0, 1):
                return False
    return True


def _extent_in_frame(face, u_axis, v_axis):
    """(u position, u half-width, v position, v half-height) of `face`'s quad
    measured along the given in-plane axes. Only meaningful when those axes
    are aligned with the face's own (see _is_axis_aligned_with), which makes
    exactly one term of each sum non-zero."""
    half_w, half_h = Decimal(face["width"]) / 2, Decimal(face["height"]) / 2
    return (
        _dot(face["center"], u_axis),
        abs(half_w * _dot(face["uv_u"], u_axis)) + abs(half_h * _dot(face["uv_v"], u_axis)),
        _dot(face["center"], v_axis),
        abs(half_w * _dot(face["uv_u"], v_axis)) + abs(half_h * _dot(face["uv_v"], v_axis)),
    )


def _covers(other, face):
    """Whether `other` lies flat against the back of `face`, spanning at
    least every point `face` does: same plane, facing the opposite way, and
    at least as big.

    This alone does NOT mean `face` is hidden - see _is_buried, which is what
    decides that. A coplanar opposite-facing quad can just as easily be the
    other side of a zero-thickness plane, where dropping either side makes
    the block disappear when looked at from that side."""
    if tuple(other["normal"]) != tuple(-Decimal(c) for c in face["normal"]):
        return False
    if _dot(other["center"], face["normal"]) != _dot(face["center"], face["normal"]):
        return False
    if not _is_axis_aligned_with(face, other):
        return False
    u_axis, v_axis = face["uv_u"], face["uv_v"]
    fu, fhw, fv, fhh = _extent_in_frame(face, u_axis, v_axis)
    ou, ohw, ov, ohh = _extent_in_frame(other, u_axis, v_axis)
    return (ou - ohw <= fu - fhw and ou + ohw >= fu + fhw
            and ov - ohh <= fv - fhh and ov + ohh >= fv + fhh)


def _is_buried(face, coverer, faces, atlas):
    """Whether `face` looks out into the solid inside of `coverer`'s element
    rather than into open space.

    `face` points some direction n, and is only ever seen from the n side.
    `coverer` is flat against its back, so `coverer`'s element is the thing
    between `face` and any viewer on that side - but only if that element has
    real thickness along n. What proves it does is the element having another
    face pointing the same way as `face` and further along n: that is the far
    wall of a box `face` is sealed inside, and if it is opaque then a viewer
    on the n side meets it and never sees through to `face`.

    Without this test, "covered by an opposite-facing opaque quad" also
    describes the two sides of a zero-thickness plane - an azalea's top leaf
    layer is one quad up and one quad down at the same height - and dropping
    the down side of that makes the block vanish when looked at from below.
    A plane has no second face pointing the way `face` does, so it fails
    here, while a box (a beacon's obsidian base, a dried ghast's body) passes."""
    normal = face["normal"]
    depth = _dot(face["center"], normal)
    for other in faces:
        if other is face or other.get("element") != coverer.get("element"):
            continue
        if tuple(other["normal"]) != tuple(normal):
            continue
        if _dot(other["center"], normal) <= depth:
            continue
        if atlas.is_opaque(other["texture"]):
            return True
    return False


def _cull_interior_faces(faces, atlas):
    """Drops faces sealed inside opaque geometry of the same block - the
    surfaces where one of a model's elements is buried in another. Returns
    (kept, dropped_count).

    Java gets these for free by drawing solid elements into a depth buffer;
    we spawn a particle per face, so a buried surface costs exactly as much
    as a visible one and additionally z-fights with the face it is pressed
    against. A beacon's core sits in its obsidian base and a dried ghast's
    tentacles hang off its body, and every one of those seams is drawn twice.

    Two conditions together, and both are load-bearing: something opaque lies
    flat against the face's back (_covers) and that something is a box the
    face is sealed inside rather than a bare plane (_is_buried).

    Only a *surviving* face can bury another, so a pair of quads that cover
    each other loses at most one. Removing both would need the shell around
    them to be opaque everywhere the pair can be seen through, which is a
    question about the whole model rather than about two faces.

    Opacity is judged over the whole texture rather than the rect a face
    samples, which is the conservative direction: a fully opaque texture is
    opaque in every rect of it, so this can miss a cull but never make a
    wrong one."""
    kept = list(faces)
    dropped = 0
    for face in faces:
        for other in kept:
            if other is face or not _covers(other, face):
                continue
            if not atlas.is_opaque(other["texture"]):
                continue
            if not _is_buried(face, other, kept, atlas):
                continue
            kept.remove(face)
            dropped += 1
            break
    return kept, dropped


def _join_coplanar_faces(faces):
    """Merges neighboring coplanar quads that sample neighboring parts of the
    same texture into single larger quads. Returns (kept, joined_count).

    Models are authored as boxes, so one flat surface routinely arrives as
    several abutting quads - and each costs a particle. Where two of them
    are edge to edge in the world AND edge to edge in the texture, one quad
    covering both samples exactly the union of what the two sampled, at the
    same texels-per-pixel. The merge is then invisible by construction: the
    same texels land on the same points on screen.

    Every condition in _join_pair is load-bearing for that. In particular two
    quads sampling the *identical* uv rect are the case this must not touch,
    however neatly they abut: they are the texture drawn twice, and one quad
    over both would stretch a single copy across the pair at half the texel
    density. That is why contiguity is checked rather than equality, and why
    the densities are compared explicitly - matching density is also what
    keeps the merged quad selecting the same mip level as the two it
    replaces, so nothing gets blurrier at range."""
    kept = list(faces)
    joined = 0
    merging = True
    while merging:
        merging = False
        for i in range(len(kept)):
            for j in range(i + 1, len(kept)):
                merged = _join_pair(kept[i], kept[j])
                if merged is None:
                    continue
                kept[i] = merged
                del kept[j]
                joined += 1
                merging = True
                break
            if merging:
                break
    return kept, joined


def _join_pair(a, b):
    """The single quad covering both `a` and `b`, or None if they can't be
    joined without changing what gets drawn."""
    # A joined quad carries one texture, one tint and one orientation, so
    # anything the pair disagrees on here rules the join out outright.
    if a["texture"] != b["texture"] or a["tintindex"] != b["tintindex"]:
        return None
    if a["roll"] != b["roll"] or tuple(a["normal"]) != tuple(b["normal"]):
        return None
    # Same texture frame, not merely aligned: the merged uv rect is written
    # in these axes, so a pair reading u along opposite world directions
    # could not share one rect even though their quads line up.
    if tuple(a["uv_u"]) != tuple(b["uv_u"]) or tuple(a["uv_v"]) != tuple(b["uv_v"]):
        return None
    normal = a["normal"]
    if _dot(a["center"], normal) != _dot(b["center"], normal):
        return None
    return _join_along_u(a, b) or _join_along_v(a, b)


def _join_along_u(a, b):
    """The pair joined side by side along the texture's u axis, or None."""
    if a["height"] != b["height"] or a["uv"][1] != b["uv"][1] or a["uv"][3] != b["uv"][3]:
        return None
    if _dot(a["center"], a["uv_v"]) != _dot(b["center"], b["uv_v"]):
        return None
    lo, hi = sorted((a, b), key=lambda face: _dot(face["center"], face["uv_u"]))
    gap = _dot(hi["center"], hi["uv_u"]) - _dot(lo["center"], lo["uv_u"])
    if gap != (Decimal(lo["width"]) + Decimal(hi["width"])) / 2:
        return None
    if lo["uv"][2] != hi["uv"][0]:  # contiguous in the texture, not just in the world
        return None
    lo_span = Decimal(lo["uv"][2]) - Decimal(lo["uv"][0])
    hi_span = Decimal(hi["uv"][2]) - Decimal(hi["uv"][0])
    if Decimal(lo["width"]) * hi_span != Decimal(hi["width"]) * lo_span:
        return None
    width = Decimal(lo["width"]) + Decimal(hi["width"])
    return {
        **lo,
        "center": _offset(lo["center"], lo["uv_u"], Decimal(hi["width"]) / 2),
        "width": width,
        "uv": [lo["uv"][0], lo["uv"][1], hi["uv"][2], lo["uv"][3]],
    }


def _join_along_v(a, b):
    """The pair joined one above the other along the texture's v axis, or
    None. v runs the way the texture reads downward, so the quad further
    along it is the one sampling further down the texture."""
    if a["width"] != b["width"] or a["uv"][0] != b["uv"][0] or a["uv"][2] != b["uv"][2]:
        return None
    if _dot(a["center"], a["uv_u"]) != _dot(b["center"], b["uv_u"]):
        return None
    lo, hi = sorted((a, b), key=lambda face: _dot(face["center"], face["uv_v"]))
    gap = _dot(hi["center"], hi["uv_v"]) - _dot(lo["center"], lo["uv_v"])
    if gap != (Decimal(lo["height"]) + Decimal(hi["height"])) / 2:
        return None
    if lo["uv"][3] != hi["uv"][1]:
        return None
    lo_span = Decimal(lo["uv"][3]) - Decimal(lo["uv"][1])
    hi_span = Decimal(hi["uv"][3]) - Decimal(hi["uv"][1])
    if Decimal(lo["height"]) * hi_span != Decimal(hi["height"]) * lo_span:
        return None
    height = Decimal(lo["height"]) + Decimal(hi["height"])
    return {
        **lo,
        "center": _offset(lo["center"], lo["uv_v"], Decimal(hi["height"]) / 2),
        "height": height,
        "uv": [lo["uv"][0], lo["uv"][1], lo["uv"][2], hi["uv"][3]],
    }


def _offset(point, axis, distance):
    return [Decimal(c) + distance * Decimal(a) for c, a in zip(point, axis)]


def white_swatch(image):
    """Blows the plain white source texture up to the swatch footprint the
    atlas needs (see _WHITE_SWATCH_SIZE). NEAREST so the color stays exactly
    what the asset says."""
    return image.convert("RGBA").resize(
        (_WHITE_SWATCH_SIZE, _WHITE_SWATCH_SIZE), Image.NEAREST
    )


def inset_by_half_texel(rect):
    """Shrinks an atlas rect half a texel in on every side (see _HALF_TEXEL)."""
    return {
        "x": rect["x"] + _HALF_TEXEL,
        "y": rect["y"] + _HALF_TEXEL,
        "w": rect["w"] - 2 * _HALF_TEXEL,
        "h": rect["h"] - 2 * _HALF_TEXEL,
    }


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
            # The renderer is handed a direction to point the billboard, not
            # the face's outward normal - they differ for a face pointing
            # straight up or down (see _facing). Resolving it here keeps the
            # rule in one place, next to the roll that is measured about it.
            facing = _facing(face["normal"])
            # Derived from the outward normal, which is why it happens here
            # and not from the published 'facing' - a face pointing straight
            # up is published pointing down, and reading the cull direction
            # off that would have every top face culled by the block below.
            cull = _cull_direction(face["center"], face["normal"])
            # what this face offers the neighbor on the other side of it. The
            # geometry half is settled here; the opacity half was settled by
            # mark_side_cover, back when the face still named its texture.
            covers = _covers_side(face)
            opaque = covers and face.get("opaque", False)
            key = (
                tuple(face["center"]), face["width"], face["height"], tuple(facing),
                face["roll"], face["tintindex"],
                uv["x"], uv["y"], uv["w"], uv["h"], missing, cull,
                covers, opaque,
            )
            if key not in face_type_index:
                face_type_index[key] = len(face_types)
                descriptor = {
                    "center": face["center"],
                    "width": face["width"],
                    "height": face["height"],
                    "facing": facing,
                    "roll": face["roll"],
                    "tintindex": face["tintindex"],
                    "uv": uv,
                }
                # only carried when true - it's rare, and every face-type
                # descriptor is written out literally
                if missing:
                    descriptor["missing"] = True
                # likewise absent rather than null on the ~64% of faces that
                # no neighbor can hide; the renderer reads "no cull" off the
                # field being undefined
                if cull is not None:
                    descriptor["cull"] = cull
                # only ever set on a face that has a cull direction, since
                # covering a side means lying flat on it, which is the same
                # condition
                if covers:
                    descriptor["covers"] = True
                if opaque:
                    descriptor["opaque"] = True
                face_types.append(descriptor)
            refs.append(face_type_index[key])
        block_models[bedrock_state] = refs
    return face_types, block_models


# A face-type descriptor's fields, in the order flatten_face_types writes
# them into a row. The renderer's FaceTable reads them back by the same
# offsets, so the two orders are one definition in two languages - change
# this and FACE_* in packs/BP/scripts/classes/Render/FaceTable.js together.
FACE_ROW_FIELDS = (
    "cull", "facing", "center", "width", "height", "roll", "tintindex", "uv",
)
FACE_ROW_WIDTH = 15
# Stands in for a face no neighbor can hide, on the ~64% of faces that carry
# no cull direction at all. Not a valid cull index (they are 0-5), so the
# renderer can test for it rather than needing a column of its own.
NO_CULL = -1
# What a face offers the neighbor on the other side of it, packed into the
# spare bits of the cull column rather than given columns of their own: both
# are only ever set on a face that HAS a cull direction, so they have nowhere
# else to be, and two more columns would have cost ~67,000 numbers in the
# generated module to carry two bits apiece. FaceTable reads them back with
# the same masks - see FACE_CULL_MASK there.
CULL_MASK = 0b111
COVERS_SIDE = 0b1000   # the face spans its whole side of the block
OPAQUE_SIDE = 0b10000  # ...and nothing shows through it


def flatten_face_types(face_types):
    """Flattens the face-type descriptors into one array of numbers,
    FACE_ROW_WIDTH per face, laid out as FACE_ROW_FIELDS describes. Returns
    (rows, missing_indices).

    Written out, a descriptor costs ~300 bytes: nine field names repeated on
    every one of ~34,000 faces (the names alone were 2MB of the generated
    module), and an object plus a nested uv object plus two arrays for the
    engine to allocate at load and hold for the session. A row of bare
    numbers costs neither, and the renderer builds a descriptor back out of
    one only for the faces a build actually draws.

    `missing` stays out of the rows: it is true on a handful of faces, so a
    column for it would be ~34,000 zeroes. The indices of those few come back
    as their own list instead.
    """
    rows = []
    missing_indices = []
    for index, descriptor in enumerate(face_types):
        uv = descriptor["uv"]
        rows.extend([
            _cull_column(descriptor),
            *descriptor["facing"],
            *descriptor["center"],
            descriptor["width"],
            descriptor["height"],
            descriptor["roll"],
            descriptor["tintindex"],
            uv["x"], uv["y"], uv["w"], uv["h"],
        ])
        if descriptor.get("missing"):
            missing_indices.append(index)
    return rows, missing_indices


def _cull_column(descriptor):
    """The cull column of a face's row: which neighbor hides it, plus what it
    offers that neighbor in return (see COVERS_SIDE / OPAQUE_SIDE)."""
    cull = descriptor.get("cull")
    if cull is None:
        return NO_CULL
    return (cull
            | (COVERS_SIDE if descriptor.get("covers") else 0)
            | (OPAQUE_SIDE if descriptor.get("opaque") else 0))


# A face covers the side of the block it lies on only if it spans the whole
# of it. Anything narrower leaves a margin of the neighbor's face showing
# around it, so it hides nothing.
_FULL_SIDE = 16


def _covers_side(face):
    """Whether the face fills its whole side of the block, so a neighbor
    pressed against it has nothing showing around the edges. Lying flat on
    the hull is what having a cull direction means, so that is half the test
    and the size is the other half."""
    return (
        face["width"] == _FULL_SIDE and face["height"] == _FULL_SIDE
        and _cull_direction(face["center"], face["normal"]) is not None
    )


def mark_side_cover(block_models, atlas):
    """Records on every face that covers its whole side of the block whether
    it does so opaquely. Mutates `block_models`; returns how many faces came
    out opaque, for the bake to report.

    Call this BEFORE project_uv, while faces still carry a 'texture' name -
    the atlas is what knows whether that texture has any transparency in it.

    This is judged per face, which is what makes neighbor culling work for
    the blocks people actually build with. It used to be judged per block id:
    an id could hide a neighbor's faces only if EVERY one of its states was a
    full opaque cube in all six directions, because a live neighbor arrives
    as a permutation and rebuilding it into a lookup key six times per block
    drawn was too much to pay. That rule threw away every block whose shape
    varies by state - a bottom slab still seals the block below it completely,
    but its id also covers the top slab, and the two intersect to nothing.
    170 block ids were losing the ability entirely, 68 slabs and 64 stairs
    among them.

    What changed is that the renderer no longer asks per neighbor per
    direction. It resolves a block's shape once per distinct state and
    remembers it (BlockModelLookup.#resolve), and the verifier records the
    resulting masks into the grid as it walks it, so a per-state answer costs
    the same lookup the per-id one did. All this pass has to do is put the
    two facts where the face table can carry them.

    Only opacity is settled here, because only the atlas knows it. Whether a
    face covers its side at all is plain geometry, so build_face_types_and_refs
    works that out for itself from the size and cull direction it already has.

    `missing` disqualifies a face from the opaque half but not the cover
    half, which is the same split the two masks have always had: a cube
    standing in for something the pipeline could not resolve is drawn
    see-through, so it hides another see-through placeholder pressed against
    it but nothing real.

    Skipping this pass costs culls rather than causing them - every face
    would read as see-through and hide only placeholders - which is the safe
    direction, so the count it returns is printed rather than asserted on."""
    opaque = 0
    for faces in block_models.values():
        for face in faces:
            face["opaque"] = (
                _covers_side(face) and not face.get("missing")
                and atlas.is_opaque(face["texture"])
            )
            opaque += face["opaque"]
    return opaque


def _parse_state_key(bedrock_state):
    """Splits "minecraft:x[a=1,b=2]" into ("minecraft:x", {"a": "1", "b": "2"}).
    Values stay strings - they are compared against, never arithmetic on, and
    the renderer builds the same strings back out of a live permutation."""
    bracket = bedrock_state.index("[")
    properties = {}
    inner = bedrock_state[bracket + 1:-1]
    if inner:
        for pair in inner.split(","):
            name, value = pair.split("=", 1)
            properties[name] = value
    return bedrock_state[:bracket], properties


def _format_state_key(block_id, properties, names, shape_index):
    """The reduced key a rekeyed entry is stored under: the block id, which
    of the block's property shapes this is, and that shape's values in its
    own order - "minecraft:acacia_door[0|0,east,0,0]".

    The names are left out because blockKeySpecs already carries them, in
    this order, and repeating them on every key cost ~840KB of the generated
    module and a string concatenation per property on every lookup.

    The shape index is what keeps the names droppable. Two of a hanging
    sign's shapes are [attached_bit, facing_direction, hanging] and
    [attached_bit, ground_sign_direction, hanging]: same length, different
    meaning, and with the names gone both write "[0,3,1]". The index tells
    them apart, and the renderer has it to hand - it is the shape it is
    already looping over. build_key_specs still checks for collisions, so a
    future Bedrock version that breaks this argument fails the bake.
    """
    values = ",".join(properties[name] for name in names)
    return f"{block_id}[{shape_index}|{values}]"


def build_key_specs(block_models):
    """Rekeys `block_models` on only the properties that actually choose
    between its entries, and emits the recipe the renderer needs to rebuild
    those keys from a live Bedrock permutation.

    This replaces what BlockModelLookup used to work out at runtime. It built
    an index over every key here on first use - reparsing all of them into
    Maps and Sets mid-gameplay - and then scanned a block's entries looking
    for the most specific one whose properties were a subset of the live
    states, ignoring any property the entries don't disagree on. Every input
    to that decision is known here, so none of it needs to happen in the game.

    A property all of a block's entries give the same value for can't choose
    between them, so it was already ignored when matching; dropping it from
    the key can't merge two entries either, since two entries that differ in
    a property make that property disagree and so keep it. That leaves the
    reduced key carrying exactly what the old match tested, and a lookup that
    was a scan becomes a single hash hit. The collision check below is what
    holds that argument up if a future Bedrock version reshapes the data.

    Returns ({block_id: spec}, {reduced_key: refs}), where a spec carries one
    field, `props`: the property-name shapes to try, most specific first. That
    ordering is the old "most properties wins, ties broken alphabetically"
    rule. Nearly every block has exactly one shape; hanging signs are the
    exception, reading a different pair of states depending on whether they
    are attached, so a spec holds a list of shapes rather than one.

    Note this deliberately carries nothing about the value GAPS blocksB2J
    leaves where Bedrock counts in finer steps than Java does (a pressure
    plate's 0 and 15, a beetroot's 0,3,4,7). Snapping a live value onto the
    nearest mapped one was reverted in 0fac4f9, so a value in between matches
    no key and renders as the missing cube, exactly as it does today. If that
    fix comes back, it belongs here as a per-property table of mapped values
    rather than as a runtime scan.
    """
    entries_by_id = {}
    for bedrock_state, refs in block_models.items():
        block_id, properties = _parse_state_key(bedrock_state)
        entries_by_id.setdefault(block_id, []).append((bedrock_state, properties, refs))

    specs = {}
    rekeyed = {}
    for block_id, entries in entries_by_id.items():
        values_seen = {}
        for _bedrock_state, properties, _refs in entries:
            for name, value in properties.items():
                values_seen.setdefault(name, set()).add(value)
        discriminating = {name for name, values in values_seen.items() if len(values) > 1}

        # The shapes have to be settled before any key is written: a key
        # names its shape by position, so the sort below has to have already
        # happened for that position to be the one the renderer will look up.
        shaped_entries = [
            (bedrock_state, properties, refs,
             sorted(name for name in properties if name in discriminating))
            for bedrock_state, properties, refs in entries
        ]
        shapes = []
        for _bedrock_state, _properties, _refs, shape in shaped_entries:
            if shape not in shapes:
                shapes.append(shape)
        shapes.sort(key=lambda shape: (-len(shape), shape))
        shape_indices = {tuple(shape): index for index, shape in enumerate(shapes)}

        for bedrock_state, properties, refs, shape in shaped_entries:
            reduced = _format_state_key(
                block_id, properties, shape, shape_indices[tuple(shape)]
            )
            if rekeyed.get(reduced, refs) != refs:
                raise ValueError(
                    f"{bedrock_state} and another entry both reduce to {reduced} "
                    f"but resolve to different models - dropping the properties "
                    f"they agree on is only safe while it keeps keys unique"
                )
            rekeyed[reduced] = refs
        specs[block_id] = {"props": shapes}
    return specs, rekeyed


def _report_face_reduction(stats):
    """Prints what the two reduction passes took off. Every face here is a
    particle the renderer would otherwise spawn per block placed, so this is
    the number worth watching when a Minecraft update reshapes the models."""
    before, after = stats.get("faces_before", 0), stats.get("faces_after", 0)
    if not before:
        return
    print(
        f"[fetch_block_models] faces {before} -> {after} "
        f"({100 * (before - after) / before:.1f}% fewer): "
        f"{stats.get('culled', 0)} interior culled, {stats.get('joined', 0)} joined"
    )


def build(root):
    manifest = load_manifest(root)
    version = manifest_version(manifest)
    b2j = rekey_hanging_signs(fetch_b2j(version))
    mcmeta = McmetaSource.download()

    atlas = TextureAtlas()
    white_path = root / "packs" / "RP" / "textures" / "particle" / "white.png"
    atlas.add_image(WHITE_TEXTURE, white_swatch(Image.open(white_path)))

    stats = {}
    block_models = build_block_models(mcmeta, b2j, atlas, stats)
    _report_face_reduction(stats)
    # while the faces still name their textures, which is what says whether a
    # block is see-through - project_uv drops the names a few lines down
    opaque_faces = mark_side_cover(block_models, atlas)
    print(f"[fetch_block_models] {opaque_faces} faces seal their side of the "
          f"block opaquely, and may hide a neighbor's")
    atlas_image, atlas_manifest = atlas.pack()
    # Everything that samples the swatch - the exported whiteUvRect and
    # project_uv's fallback for a texture that never made it into the atlas -
    # must stay inside it, so inset the rect once, here, where it's packed.
    white_rect = atlas_manifest[WHITE_TEXTURE] = inset_by_half_texel(
        atlas_manifest[WHITE_TEXTURE]
    )
    block_models = project_uv(block_models, atlas_manifest)
    face_types, block_models = build_face_types_and_refs(block_models)
    key_specs, block_models = build_key_specs(block_models)
    return atlas_image, white_rect, face_types, block_models, key_specs


def write_outputs(root, atlas_image, white_rect, face_types, block_models, key_specs):
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
    face_rows, missing_faces = flatten_face_types(face_types)
    models_js_contents = (
        # one face per line, FACE_ROW_WIDTH bare numbers laid out as
        # FACE_ROW_FIELDS says; FaceTable builds a descriptor out of a row
        # only for the faces a build actually draws
        "export const blockFaceData = " + render_rows(face_rows, FACE_ROW_WIDTH) + ";\n\n"
        # the faces that stand for something the pipeline could not resolve,
        # drawn in the unresolved color - too few to be worth a column
        "export const blockMissingFaces = " + render(missing_faces) + ";\n\n"
        # keyed on only the properties that choose between a block's models,
        # so the renderer needs blockKeySpecs to build a key that hits
        "export const blockModels = " + render(block_models) + ";\n\n"
        "export const blockKeySpecs = " + render(key_specs) + ";"
    )
    models_js_path.write_text(models_js_contents, encoding="utf-8")

    print(f"[fetch_block_models] wrote {atlas_path}, {atlas_js_path}, {models_js_path}")


def main():
    root = root_dir()
    write_outputs(root, *build(root))


if __name__ == "__main__":
    main()
