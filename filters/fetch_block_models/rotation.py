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


def rotate_vector(vec, axis, degrees):
    """Rotates a direction vector (no translation) by `degrees` about the
    given cardinal axis. Direction verified against real minecraft:furnace
    blockstate data: its facing=east variant (y:90) must move its front
    face's normal to point east (+x), not west."""
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
