"""Shared 3D rotation math for Java block model transforms: both the
per-element arbitrary-angle "rotation" object (e.g. cross-plant models
rotated 45 degrees) and the blockstate-level 90-degree-multiple "x"/"y"
variant rotation reuse this same math."""

import math
from decimal import Decimal

# Values are rounded to this many decimal places and converted to Decimal so
# results stay compatible with js_data.render(), which only accepts
# Decimal/int (never a native float).
_PRECISION = 6


def _to_decimal(value):
    return Decimal(str(round(value, _PRECISION)))


def rotate_point(point, origin, axis, degrees):
    """Rotates `point` around `origin` by `degrees` about the given cardinal
    axis ('x', 'y', or 'z'). Returns Decimals."""
    offset = [p - o for p, o in zip(point, origin)]
    rotated = rotate_vector(offset, axis, degrees)
    return [_to_decimal(r + o) for r, o in zip(rotated, origin)]


def rotate_about_normal(vec, normal, degrees):
    """Rotates `vec` by `degrees` right-handed about `normal`, which must be a
    signed cardinal unit vector (e.g. [0, -1, 0]). Rotating about -y by d is
    the same as rotating about +y by -d, so this just picks the axis the
    normal lies on and flips the sign when it points the negative way."""
    for axis, index in (("x", 0), ("y", 1), ("z", 2)):
        component = normal[index]
        if component:
            return rotate_vector(vec, axis, degrees if component > 0 else -degrees)
    raise ValueError(f"normal {normal!r} is not a cardinal direction")


def signed_angle(from_vec, to_vec, axis_vec):
    """Returns the angle in degrees from `from_vec` to `to_vec`, measured
    right-handed about `axis_vec` (so the result is signed, unlike a plain
    dot-product angle). All three are treated as directions; magnitudes are
    normalized away. Used to work out how far a face's texture has to be
    rolled around its own normal to land where Java puts it."""
    a = _normalize(from_vec)
    b = _normalize(to_vec)
    n = _normalize(axis_vec)
    cos_r = sum(x * y for x, y in zip(a, b))
    cross = (
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    )
    sin_r = sum(x * y for x, y in zip(cross, n))
    return _to_decimal(math.degrees(math.atan2(sin_r, cos_r)))


def _normalize(vec):
    values = [float(c) for c in vec]
    length = math.sqrt(sum(c * c for c in values))
    if not length:
        raise ValueError("cannot normalize a zero-length vector")
    return [c / length for c in values]


def element_angle(axis, degrees):
    """Converts a Java model element's "rotation" angle into the convention
    rotate_vector turns in. An element's rotation is right-handed about its
    axis, but rotate_vector's Y turns the other way round, because it encodes
    the blockstate-level "y" instead (see its note), so a Y angle has to be
    flipped on the way in. X and Z already agree.

    Both directions are pinned by the hanging sign templates.
    block/template_hanging_sign_rot_0 turns its chain quads +-45 degrees about
    Y to bring them to the two ends of the board, into the board's own plane;
    turned the other way they land on the block's centre line instead. And
    Java draws rotation=2 - 45 degrees clockwise from south - with
    block/template_attached_hanging_sign_rot_2, which turns a south-facing
    board -45 degrees to face southwest."""
    return -degrees if axis == "y" else degrees


def rotate_vector(vec, axis, degrees):
    """Rotates a direction vector (no translation) by `degrees` about the
    given cardinal axis. Direction verified against real minecraft:furnace
    blockstate data: its facing=east variant (y:90) must move its front
    face's normal to point east (+x), not west.

    Careful: Y is the odd one out here. X and Z turn the standard
    right-hand way, but Y turns the opposite way, because that is the way
    Java's blockstate "y" turns and that is this function's busiest caller.
    A blockstate "x" therefore does NOT match its axis here and has to be
    negated by the caller - see java.blockstates._rotate_face."""
    rad = math.radians(float(degrees))
    cos_r, sin_r = math.cos(rad), math.sin(rad)
    x, y, z = (float(c) for c in vec)
    if axis == "x":
        result = (x, y * cos_r - z * sin_r, y * sin_r + z * cos_r)
    elif axis == "y":
        result = (x * cos_r - z * sin_r, y, x * sin_r + z * cos_r)
    elif axis == "z":
        result = (x * cos_r - y * sin_r, x * sin_r + y * cos_r, z)
    else:
        raise ValueError(f"unknown rotation axis {axis!r}")
    return [_to_decimal(c) for c in result]
