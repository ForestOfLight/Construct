"""Resolves a specific Java block+properties combination to model elements,
using misode/mcmeta blockstate JSON (variants or multipart)."""

import math

from model_resolver import resolve_model

BLOCKSTATE_PATH_TMPL = "assets/minecraft/blockstates/{name}.json"


def resolve_java_state(mcmeta, java_block_id, properties):
    """Returns a flat list of resolved elements (each with from/to/faces),
    or None if the block has no blockstate data at all."""
    name = java_block_id.split(":")[-1]
    path = BLOCKSTATE_PATH_TMPL.format(name=name)
    if not mcmeta.exists(path):
        return None
    blockstate = mcmeta.read_json(path)

    if "variants" in blockstate:
        return _resolve_variant(mcmeta, blockstate["variants"], properties)
    if "multipart" in blockstate:
        return _resolve_multipart(mcmeta, blockstate["multipart"], properties)
    return None


def _variant_key(properties):
    return ",".join(f"{k}={v}" for k, v in sorted(properties.items()))


def _resolve_variant(mcmeta, variants, properties):
    key = _variant_key(properties)
    entry = variants.get(key, variants.get(""))
    if entry is None:
        return []
    return _apply_model_entry(mcmeta, entry)


def _resolve_multipart(mcmeta, parts, properties):
    elements = []
    for part in parts:
        condition = part.get("when")
        if condition is None or _matches(condition, properties):
            elements.extend(_apply_model_entry(mcmeta, part["apply"]))
    return elements


def _matches(condition, properties):
    if "OR" in condition:
        return any(_matches(sub, properties) for sub in condition["OR"])
    if "AND" in condition:
        return all(_matches(sub, properties) for sub in condition["AND"])
    for key, expected in condition.items():
        actual = properties.get(key)
        if actual not in str(expected).split("|"):
            return False
    return True


def _apply_model_entry(mcmeta, entry):
    """entry can be a single {'model':..., 'x':0, 'y':0} or a list of those
    (Java picks one at random for visual variety; we always take the first,
    since they're geometrically equivalent for our purposes)."""
    if isinstance(entry, list):
        entry = entry[0]
    elements = resolve_model(mcmeta, entry["model"])
    x_rot = entry.get("x", 0)
    y_rot = entry.get("y", 0)
    if x_rot or y_rot:
        elements = [_rotate_element(el, x_rot, y_rot) for el in elements]
    return elements


def _rotate_element(element, x_rot, y_rot):
    """Rotates a cuboid element's from/to around the block center (8,8,8) by
    x_rot then y_rot degrees (Java model rotations are always multiples of 90)."""
    from_pt = _rotate_point(element["from"], x_rot, y_rot)
    to_pt = _rotate_point(element["to"], x_rot, y_rot)
    new_from = [min(a, b) for a, b in zip(from_pt, to_pt)]
    new_to = [max(a, b) for a, b in zip(from_pt, to_pt)]
    return {"from": new_from, "to": new_to, "faces": element["faces"]}


def _rotate_point(point, x_rot, y_rot):
    x, y, z = (p - 8 for p in point)
    x, y, z = _rotate_axis(x, y, z, "x", x_rot)
    x, y, z = _rotate_axis(x, y, z, "y", y_rot)
    return [x + 8, y + 8, z + 8]


def _rotate_axis(x, y, z, axis, degrees):
    rad = math.radians(degrees)
    cos_r, sin_r = round(math.cos(rad)), round(math.sin(rad))
    if axis == "x":
        return x, y * cos_r - z * sin_r, y * sin_r + z * cos_r
    if axis == "y":
        return x * cos_r + z * sin_r, y, -x * sin_r + z * cos_r
    return x, y, z
