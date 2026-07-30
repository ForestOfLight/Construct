"""Resolves a specific Java block+properties combination to model elements,
using misode/mcmeta blockstate JSON (variants or multipart)."""

from model_resolver import resolve_model
from rotation import rotate_point, rotate_vector

BLOCKSTATE_PATH_TMPL = "assets/minecraft/blockstates/{name}.json"
_ORIGIN = [8, 8, 8]


def resolve_java_state(mcmeta, java_block_id, properties):
    """Returns a flat list of resolved elements (each a {'faces': {...}}
    dict), or None if the block has no blockstate data at all."""
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
    """Rotates every face's center/extent/normal around the block center
    (8,8,8) by x_rot then y_rot degrees (Java model rotations are always
    multiples of 90). A 90-degree rotation can move a face onto a different
    world axis (e.g. what was 'north' can end up facing 'east', or an X
    rotation can turn a vertical-normal face into a horizontal one), so both
    the normal (render direction) and extent (which axis is width vs height)
    must rotate too, not just position."""
    new_faces = {
        face_name: _rotate_face(face, x_rot, y_rot)
        for face_name, face in element["faces"].items()
    }
    return {"faces": new_faces}


def _rotate_face(face, x_rot, y_rot):
    center, extent, normal = face["center"], face["extent"], face["normal"]
    if x_rot:
        center = rotate_point(center, _ORIGIN, "x", x_rot)
        extent = rotate_vector(extent, "x", x_rot)
        normal = rotate_vector(normal, "x", x_rot)
    if y_rot:
        center = rotate_point(center, _ORIGIN, "y", y_rot)
        extent = rotate_vector(extent, "y", y_rot)
        normal = rotate_vector(normal, "y", y_rot)
    return {**face, "center": center, "extent": extent, "normal": normal}
