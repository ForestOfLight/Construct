"""What to draw for a block whose Java model resolves to no geometry at all.

Some of those are honest gaps in the data and get the see-through missing
cube. The rest are blocks Java draws some other way than from a model - the
fluid renderer, or not at all for the invisible ones - and where the block's
own particle texture honestly represents it, a cube of that beats a cube of
"no idea".
"""

from decimal import Decimal

from atlas_uv import WHITE_TEXTURE
from blockstate_resolver import resolve_particle_texture

_FULL_UV = [0, 0, 16, 16]

# 'roll' matches what face_geometry derives for an unrotated full cube: 180
# on the up face, 0 everywhere else. A solid color would look the same at any
# roll, so these are correct rather than convenient - swapping in a
# non-uniform fallback texture later must not quietly render it sideways.
CUBE_FACES = [
    {"center": [8, 16, 8], "width": 16, "height": 16, "normal": [0, 1, 0], "uv": _FULL_UV, "roll": 180, "tintindex": -1},
    {"center": [8, 0, 8], "width": 16, "height": 16, "normal": [0, -1, 0], "uv": _FULL_UV, "roll": 0, "tintindex": -1},
    {"center": [8, 8, 0], "width": 16, "height": 16, "normal": [0, 0, -1], "uv": _FULL_UV, "roll": 0, "tintindex": -1},
    {"center": [8, 8, 16], "width": 16, "height": 16, "normal": [0, 0, 1], "uv": _FULL_UV, "roll": 0, "tintindex": -1},
    {"center": [16, 8, 8], "width": 16, "height": 16, "normal": [1, 0, 0], "uv": _FULL_UV, "roll": 0, "tintindex": -1},
    {"center": [0, 8, 8], "width": 16, "height": 16, "normal": [-1, 0, 0], "uv": _FULL_UV, "roll": 0, "tintindex": -1},
]

# 'missing' marks a face the pipeline could not resolve, as opposed to one it
# resolved to a genuinely white texture. The renderer draws these see-through
# blue, so a block the data failed on is obvious on sight rather than looking
# like a legitimately blank block.
WHITE_CUBE_FACES = [
    {**face, "texture": WHITE_TEXTURE, "missing": True} for face in CUBE_FACES
]

# The two kinds of block that qualify for a particle-texture stand-in. An
# "item/" particle means the model points at the block's own item icon, which
# is precisely what Java itself shows for it - barrier, structure_void and
# the light blocks. And a fluid's still texture is simply what the block
# looks like.
#
# Everything else resolving to nothing is a block entity - skulls, banners,
# golem statues - drawn by entity code we have no data for, and its particle
# is an unrelated block texture (a skull's is soul sand). Standing in with
# that would draw a confidently wrong block and hide that the shape is
# unimplemented, so those stay missing; a hardcoded shape in
# block_entity_models.py is the way to fix one.
_FLUID_BLOCKS = {"minecraft:water", "minecraft:lava", "minecraft:bubble_column"}
_ITEM_TEXTURE_PREFIX = "item/"

# A stand-in texture beating the one the block's model names. Only the bubble
# column needs one: its model is block/water, so it would stand in as a plain
# water cube. The bubbles are particles rather than model geometry, and both
# particles a bubble column emits name particle/bubble.
_STAND_IN_TEXTURES = {"minecraft:bubble_column": "particle/bubble"}

# How tall a fluid block's box is, in pixels, per Java "level" - the property
# Bedrock's liquid_depth maps one-to-one onto. Java has no model to read this
# from: the fluid renderer builds the box in code, which is why fluids reach
# here at all. Level 0 is a source and each step up to 7 is a shallower flow,
# the box shrinking downward with its bottom on the block floor.
#
# Levels 8-15 are Java's "falling" fluids, whose height comes from the block
# above rather than their own level. A preview block has no neighbors to
# read, so treating them as a continuation of the ramp would draw a falling
# column of water as a puddle; they stay full cubes.
_FLUID_SOURCE_HEIGHT = Decimal(12)
_FLUID_SHALLOWEST_HEIGHT = Decimal(1)
_FLUID_SHALLOWEST_LEVEL = 7
_FLUID_FALLING_LEVEL = 8
_FLUID_FULL_HEIGHT = Decimal(16)
# Eight levels don't divide the 11-pixel span evenly, so the steps land on
# repeating fractions. The renderer scales these into a block a few
# centimeters tall on screen, so four places is already far below anything
# visible - and beats writing 28 significant digits into every fluid face of
# the generated table.
_FLUID_HEIGHT_PRECISION = Decimal("0.0001")


def stand_in_cube(mcmeta, java_block_id, properties):
    """A box of the block's particle texture, or None if there is nothing fit
    to stand in with - leaving the block to render as missing."""
    texture = resolve_particle_texture(mcmeta, java_block_id, properties)
    if texture is None:
        return None
    if not texture.startswith(_ITEM_TEXTURE_PREFIX) and java_block_id not in _FLUID_BLOCKS:
        return None
    texture = _STAND_IN_TEXTURES.get(java_block_id, texture)
    return [{**face, "texture": texture}
            for face in _stand_in_shape(java_block_id, properties)]


def _stand_in_shape(java_block_id, properties):
    """The box to draw the stand-in texture on: a full cube, unless this is a
    fluid whose level says how high it stands.

    Checked against the fluid list rather than on a "level" property alone,
    because light - one of the item-icon blocks - has a "level" property
    meaning brightness, and reading it as a depth would leave a light block
    lying in a puddle on the floor. A bubble column is a fluid with no level
    at all: its state says which way the bubbles drag, not how deep it is."""
    level = properties.get("level")
    if java_block_id not in _FLUID_BLOCKS or level is None:
        return CUBE_FACES
    return _fluid_box_faces(_fluid_height(int(level)))


def _fluid_height(level):
    if level >= _FLUID_FALLING_LEVEL:
        return _FLUID_FULL_HEIGHT
    span = _FLUID_SOURCE_HEIGHT - _FLUID_SHALLOWEST_HEIGHT
    height = _FLUID_SOURCE_HEIGHT - span * Decimal(level) / _FLUID_SHALLOWEST_LEVEL
    return height.quantize(_FLUID_HEIGHT_PRECISION)


def _fluid_box_faces(height):
    """The six faces of a fluid box `height` pixels tall, sitting on the
    block floor.

    The sides sample the bottom of their texture rather than the whole thing:
    a fluid's surface drops without its texture stretching or sliding, so the
    strip a short side shows is the strip that was already against the block
    floor. v runs downward from the top of the texture, so that strip starts
    at 16 - height."""
    if height >= _FLUID_FULL_HEIGHT:
        return [dict(face) for face in CUBE_FACES]
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
