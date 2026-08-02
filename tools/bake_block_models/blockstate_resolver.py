"""Resolves a specific Java block-plus-properties combination to model
elements, using misode/mcmeta blockstate JSON (variants or multipart)."""

from model_resolver import (
    resolve_model,
    resolve_model_particle,
    rotate_uv_rect,
    uv_axes_for_normal,
)
from rotation import rotate_point, rotate_vector, signed_angle

BLOCKSTATE_PATH_TMPL = "assets/minecraft/blockstates/{name}.json"
_BLOCK_CENTER = [8, 8, 8]


def resolve_java_state(mcmeta, java_block_id, properties):
    """A flat list of resolved elements, or None if the block has no
    blockstate data at all."""
    entries = _entries_for(mcmeta, java_block_id, properties)
    if entries is None:
        return None
    elements = []
    for entry in entries:
        elements.extend(_apply_model_entry(mcmeta, entry))
    return elements


def resolve_particle_texture(mcmeta, java_block_id, properties):
    """The particle texture of the model this state picks, or None if the
    block has no blockstate data or its model declares no particle."""
    entries = _entries_for(mcmeta, java_block_id, properties)
    if not entries:
        return None
    entry = entries[0]
    if isinstance(entry, list):
        entry = entry[0]
    return resolve_model_particle(mcmeta, entry["model"])


def rotate_elements(elements, x_rot, y_rot):
    """Rotates an already-resolved elements list around the block center, the
    way a blockstate variant's 'x'/'y' would. Used by block_entity_models to
    orient a hardcoded shape by its 'facing' property."""
    if not x_rot and not y_rot:
        return elements
    return [_rotate_element(element, x_rot, y_rot) for element in elements]


def _entries_for(mcmeta, java_block_id, properties):
    name = java_block_id.split(":")[-1]
    path = BLOCKSTATE_PATH_TMPL.format(name=name)
    if not mcmeta.exists(path):
        return None
    return _applicable_entries(mcmeta.read_json(path), properties)


def _applicable_entries(blockstate, properties):
    """The blockstate's model entries Java would apply for `properties`, in
    order, or None if the blockstate is neither variants nor multipart."""
    if "variants" in blockstate:
        return _variant_entries(blockstate["variants"], properties)
    if "multipart" in blockstate:
        return _multipart_entries(blockstate["multipart"], properties)
    return None


def _variant_entries(variants, properties):
    """Matched on whichever subset of properties each key names, rather than
    requiring every given property to appear in the key: some vanilla
    blockstates omit properties that don't affect the model from their keys
    entirely (bell's keys only ever mention attachment and facing, never
    powered), so an exact match would miss a variant Java would still pick."""
    for key, entry in variants.items():
        if not key:
            continue
        conditions = dict(pair.split("=", 1) for pair in key.split(","))
        if all(properties.get(k) == v for k, v in conditions.items()):
            return [entry]
    if "" in variants:
        return [variants[""]]
    return []


def _multipart_entries(parts, properties):
    return [
        part["apply"] for part in parts
        if part.get("when") is None or _matches(part["when"], properties)
    ]


def _matches(condition, properties):
    if "OR" in condition:
        return any(_matches(sub, properties) for sub in condition["OR"])
    if "AND" in condition:
        return all(_matches(sub, properties) for sub in condition["AND"])
    for key, expected in condition.items():
        if properties.get(key) not in str(expected).split("|"):
            return False
    return True


def _apply_model_entry(mcmeta, entry):
    """`entry` is a single {'model':..., 'x':0, 'y':0} or a list of those,
    from which Java picks one at random for visual variety; we always take
    the first, since they are geometrically equivalent for our purposes."""
    if isinstance(entry, list):
        entry = entry[0]
    elements = resolve_model(mcmeta, entry["model"])
    x_rot, y_rot = entry.get("x", 0), entry.get("y", 0)
    if x_rot or y_rot:
        uvlock = entry.get("uvlock", False)
        elements = [_rotate_element(el, x_rot, y_rot, uvlock) for el in elements]
    return elements


def _rotate_element(element, x_rot, y_rot, uvlock=False):
    """Rotates every face around the block center by x_rot then y_rot degrees
    (Java model rotations are always multiples of 90).

    A 90-degree rotation can move a face onto a different world axis, so the
    normal, the extent and the texture axes all have to turn with the
    position - otherwise the texture ends up rolled or transposed relative to
    the quad."""
    return {"faces": {
        face_name: _rotate_face(face, x_rot, y_rot, uvlock)
        for face_name, face in element["faces"].items()
    }}


def _rotate_face(face, x_rot, y_rot, uvlock):
    center, extent, normal = face["center"], face["extent"], face["normal"]
    uv_u, uv_v = face["uv_u"], face["uv_v"]
    # A blockstate "x" turns the model the opposite way to rotate_vector's X
    # axis, so it has to be negated; "y" already lines up (rotate_vector's Y
    # is deliberately the odd one out - see the note there). Only x:90 and
    # x:270 can tell the difference, x:180 being its own opposite, which is
    # why this hid for so long.
    #
    # Which way round is settled by three vanilla blocks that all put their
    # distinctive face on the model's north side and all agree x:270 must
    # carry it onto the top: a piston facing up has its platform on top, an
    # observer facing up has its face on top, and a wall button (x:90) faces
    # out of the wall it is stuck to.
    for axis, degrees in (("x", -x_rot), ("y", y_rot)):
        if not degrees:
            continue
        center = rotate_point(center, _BLOCK_CENTER, axis, degrees)
        extent = rotate_vector(extent, axis, degrees)
        normal = rotate_vector(normal, axis, degrees)
        uv_u = rotate_vector(uv_u, axis, degrees)
        uv_v = rotate_vector(uv_v, axis, degrees)
    uv = face["uv"]
    if uvlock:
        uv, uv_u, uv_v = _relock_uv(uv, uv_u, uv_v, normal, face["uv_rotation"])
    return {**face, "center": center, "extent": extent, "normal": normal,
            "uv_u": uv_u, "uv_v": uv_v, "uv": uv}


def _relock_uv(uv, uv_u, uv_v, normal, uv_rotation):
    """Pins the texture back to world alignment, which is what Java's
    'uvlock: true' asks for (every non-default-facing stairs variant, among
    others): the texture must not turn with the block, so the face's frame is
    rebuilt from the direction it ended up facing rather than carried round
    with it.

    The axes still have to have been rotated first, even here. They describe
    directions within the face's own plane, and the plane itself moves; left
    behind, they would point out of it and the face's width would collapse to
    zero.

    The rect turns as well as the frame, and the opposite way. The frame says
    which world axis u runs along, the rect how far the texture reaches along
    u; correct one without the other and a quarter turn leaves them
    transposed - a 16-wide, 8-tall quad sampling an 8-wide, 16-tall rect,
    which is the stretched top face on every stair Java uvlocks. Pinning the
    frame back undoes the block's rotation, and for the texture's content to
    stay put in the world it has to be carried the inverse of that."""
    relocked = uv_axes_for_normal(normal, uv_rotation)
    if not relocked:
        return uv, uv_u, uv_v
    turns = _quarter_turns(uv_u, relocked[0], normal)
    return rotate_uv_rect(uv, -turns), relocked[0], relocked[1]


def _quarter_turns(from_axis, to_axis, normal):
    """How many quarter turns about `normal` carry `from_axis` onto
    `to_axis`. Blockstate rotations are always multiples of 90 degrees, so
    this is always a whole number."""
    return int(round(float(signed_angle(from_axis, to_axis, normal)) / 90))
