"""Resolves a specific Java block+properties combination to model elements,
using misode/mcmeta blockstate JSON (variants or multipart)."""

from model_resolver import resolve_model, uv_axes_for_normal
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


def _resolve_variant(mcmeta, variants, properties):
    """Some vanilla blockstates (e.g. bell) omit properties that don't affect
    the model from their variant keys entirely (e.g. bell's keys only ever
    mention attachment/facing, never powered) - so an exact full-property-set
    match can miss a variant that Java would still pick. Match on whichever
    subset of properties each key names instead of requiring every given
    property to appear in the key."""
    for key, entry in variants.items():
        if not key:
            continue
        conditions = dict(pair.split("=", 1) for pair in key.split(","))
        if all(properties.get(k) == v for k, v in conditions.items()):
            return _apply_model_entry(mcmeta, entry)
    if "" in variants:
        return _apply_model_entry(mcmeta, variants[""])
    return []


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
        uvlock = entry.get("uvlock", False)
        elements = [_rotate_element(el, x_rot, y_rot, uvlock) for el in elements]
    return elements


def rotate_elements(elements, x_rot, y_rot):
    """Public entry point for rotating an already-resolved elements list
    (see model_resolver.resolve_elements) around the block center by x_rot/
    y_rot degrees. Used by block_entity_models.py to orient a hardcoded
    block-entity shape (e.g. a chest) by its 'facing' property, the same
    way a normal blockstate variant's 'x'/'y' would."""
    if not x_rot and not y_rot:
        return elements
    return [_rotate_element(el, x_rot, y_rot) for el in elements]


def _rotate_element(element, x_rot, y_rot, uvlock=False):
    """Rotates every face's center/extent/normal/texture axes around the
    block center (8,8,8) by x_rot then y_rot degrees (Java model rotations
    are always multiples of 90). A 90-degree rotation can move a face onto a
    different world axis (e.g. what was 'north' can end up facing 'east', or
    an X rotation can turn a vertical-normal face into a horizontal one), so
    the normal (render direction), extent (which axis is width vs height),
    and the texture axes (which way the texture reads, and which world axis
    carries u vs. v) must all rotate too, not just position - otherwise the
    texture ends up rolled or transposed relative to the quad.

    'uvlock: true' (e.g. every non-default-facing stairs variant) is Java's
    way of saying the texture must NOT turn with the block: it stays put
    relative to the world however the block is oriented. That's expressed by
    rebuilding the face's texture frame from the direction it ended up
    facing - the frame it would have been authored with had it started out
    there - rather than by carrying the old one round with it.

    Note the texture axes still have to be rotated first even when uvlock is
    set. They describe directions within the face's own plane, and the plane
    itself moves; left behind, they'd point out of it, and the face's width
    (measured along its u axis - see main.py's _derive_width_height) would
    collapse to zero and stop rendering entirely."""
    new_faces = {
        face_name: _rotate_face(face, x_rot, y_rot, uvlock)
        for face_name, face in element["faces"].items()
    }
    return {"faces": new_faces}


def _rotate_face(face, x_rot, y_rot, uvlock=False):
    center, extent, normal = face["center"], face["extent"], face["normal"]
    uv_u, uv_v = face["uv_u"], face["uv_v"]
    for axis, degrees in (("x", x_rot), ("y", y_rot)):
        if not degrees:
            continue
        center = rotate_point(center, _ORIGIN, axis, degrees)
        extent = rotate_vector(extent, axis, degrees)
        normal = rotate_vector(normal, axis, degrees)
        uv_u = rotate_vector(uv_u, axis, degrees)
        uv_v = rotate_vector(uv_v, axis, degrees)
    if uvlock:
        relocked = uv_axes_for_normal(normal, face["uv_rotation"])
        if relocked:
            uv_u, uv_v = relocked
    return {**face, "center": center, "extent": extent, "normal": normal, "uv_u": uv_u, "uv_v": uv_v}
