"""Turns a resolved Java model face into the size and orientation a Bedrock
"direction_z" billboard has to be given to draw it the way Java does."""

from decimal import Decimal

from geometry.rotation import signed_angle
from geometry.vectors import flatten_into_plane, is_vertical, negated, project

# A direction_z billboard takes a facing direction and nothing else, so the
# engine derives the quad's up vector itself: world-up for a face that has
# one - flattened into the face's own plane when the face is tilted - and a
# fixed south for a face pointing straight up or down, which has none.
_ENGINE_UP_TILTED_FACE = [0, 1, 0]
_ENGINE_UP_VERTICAL_FACE = [0, 0, 1]

# Which way a positive Molang rotation spins the quad, relative to the
# right-handed angle measured below. The two face classes genuinely differ: a
# vertical face is handed a reversed facing direction (see billboard_facing),
# and reversing a direction mirrors what is drawn rather than turning it, so
# a mirrored quad spins the other way on screen.
_ROLL_HANDEDNESS_VERTICAL_FACE = -1
_ROLL_HANDEDNESS_TILTED_FACE = 1


def face_size(extent, uv_u, uv_v):
    """The quad's width and height, measured along its own texture axes
    rather than along world axes, so they stay paired with the uv rect's own
    spans however the face has been rotated. Valid only once every rotation
    - per-face uv, element-level and blockstate x/y - has been applied."""
    return project(extent, uv_u), project(extent, uv_v)


def billboard_facing(normal):
    """The direction the renderer points the billboard at: the face's outward
    normal, reversed for a face pointing straight up or down because a
    direction_z quad otherwise comes out backwards."""
    return negated(normal) if is_vertical(normal) else [Decimal(c) for c in normal]


def billboard_roll(normal, uv_v):
    """Degrees to spin the billboard about its facing direction for the
    texture to read the way Java draws it: the gap between where the engine
    puts the quad's up vector and where the face's own texture axes say up is
    (v runs the way the texture reads downward, so texture-up is its
    opposite).

    Measured about the direction handed to the particle rather than about the
    outward normal, so the sign follows the axis the engine spins around."""
    facing = billboard_facing(normal)
    if is_vertical(normal):
        engine_up = _ENGINE_UP_VERTICAL_FACE
        handedness = _ROLL_HANDEDNESS_VERTICAL_FACE
    else:
        engine_up = flatten_into_plane(_ENGINE_UP_TILTED_FACE, facing)
        handedness = _ROLL_HANDEDNESS_TILTED_FACE
    return _fold_into_half_turns(
        handedness * signed_angle(engine_up, negated(uv_v), facing)
    )


def _fold_into_half_turns(degrees):
    """Folds a roll into (-180, 180] so the two ways of writing a half turn
    don't split otherwise identical faces across two face-table entries.

    Folded by subtraction rather than with "%": these are Decimals, and
    Decimal's remainder takes the sign of the dividend, so -180 % 360 stays
    -180 instead of becoming the 180 this is meant to produce."""
    degrees = Decimal(degrees)
    while degrees > 180:
        degrees -= 360
    while degrees <= -180:
        degrees += 360
    return degrees
