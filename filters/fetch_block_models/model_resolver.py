"""Resolves a Java block model's parent chain into concrete elements with
textures fully resolved to literal names (no #variable indirection left)."""

from decimal import Decimal

from rotation import rotate_point, rotate_vector

MODEL_PATH_TMPL = "assets/minecraft/models/{path}.json"

# (axis index into from/to, which corner of the element's bounding box that
# axis is pinned to for this face) - i.e. the flat plane each face lies on.
_FACE_PLANE = {
    "down": (1, "from"), "up": (1, "to"),
    "north": (2, "from"), "south": (2, "to"),
    "west": (0, "from"), "east": (0, "to"),
}

# Outward-facing unit normal for each face, before any rotation is applied.
_FACE_NORMAL = {
    "down": [0, -1, 0], "up": [0, 1, 0],
    "north": [0, 0, -1], "south": [0, 0, 1],
    "west": [-1, 0, 0], "east": [1, 0, 0],
}


def load_model(mcmeta, model_id):
    path = model_id.split(":")[-1]
    return mcmeta.read_json(MODEL_PATH_TMPL.format(path=path))


def _face_geometry(elem_from, elem_to, face_name):
    """Derives a face's center point, signed extent vector, and outward
    normal from the element's 3D bounding box (e.g. the 'up' face only spans
    the top, not the whole element).

    The extent vector (to - from on the face's own collapsed rect) is kept
    signed and un-abs'd so it can be rotated exactly like the normal is
    (see _apply_element_rotation and blockstate_resolver._rotate_face) -
    world-space width/height are only derived from it at the very end
    (main.py), after ALL rotation is done. This matters because a 90-degree
    blockstate rotation around X or Z mixes the Y axis with a horizontal
    one, which can change which axis is "vertical" for a face (e.g. a
    piston head rotated to face up/down): deriving width/height too early,
    before that rotation, bakes in the wrong axis pairing."""
    axis_idx, which = _FACE_PLANE[face_name]
    value = elem_from[axis_idx] if which == "from" else elem_to[axis_idx]
    rect_from = list(elem_from)
    rect_to = list(elem_to)
    rect_from[axis_idx] = value
    rect_to[axis_idx] = value
    # Decimal(a) + Decimal(b) keeps this exact and Decimal-typed even when
    # both inputs are plain ints - Python's "/" on two ints returns a native
    # float, which can't mix with Decimal during rotation math later on.
    center = [(Decimal(a) + Decimal(b)) / 2 for a, b in zip(rect_from, rect_to)]
    extent = [Decimal(b) - Decimal(a) for a, b in zip(rect_from, rect_to)]
    return center, extent, list(_FACE_NORMAL[face_name])


def _apply_element_rotation(center, extent, normal, rotation):
    """Applies a Java model element's optional 'rotation' object (arbitrary
    angle around a single axis, e.g. the 45-degree y-axis rotation used by
    cross-shaped plant models) to a face's center, extent, and normal."""
    if not rotation:
        return center, extent, normal
    angle = rotation.get("angle", 0)
    if not angle:
        return center, extent, normal
    origin = rotation.get("origin", [8, 8, 8])
    axis = rotation["axis"]
    return (
        rotate_point(center, origin, axis, angle),
        rotate_vector(extent, axis, angle),
        rotate_vector(normal, axis, angle),
    )


def resolve_model(mcmeta, model_id):
    """Returns a list of elements: [{'faces': {face_name: {'center','extent',
    'normal','uv','texture','rotation','cullface','tintindex'}}}]"""
    chain = []
    current_id = model_id
    seen = set()
    while current_id and current_id not in seen:
        seen.add(current_id)
        model = load_model(mcmeta, current_id)
        chain.append(model)
        current_id = model.get("parent")
    chain.reverse()  # root first, most specific last

    textures = {}
    elements = None
    for model in chain:
        textures.update(model.get("textures", {}))
        if "elements" in model:
            elements = model["elements"]

    resolved_elements = []
    for element in elements or []:
        resolved_faces = {}
        for face_name, face in element.get("faces", {}).items():
            center, extent, normal = _face_geometry(element["from"], element["to"], face_name)
            center, extent, normal = _apply_element_rotation(center, extent, normal, element.get("rotation"))
            resolved_faces[face_name] = {
                "center": center,
                "extent": extent,
                "normal": normal,
                "uv": face.get("uv", [0, 0, 16, 16]),
                "texture": _resolve_texture_ref(face["texture"], textures),
                "rotation": face.get("rotation", 0),
                "cullface": face.get("cullface"),
                "tintindex": face.get("tintindex", -1),
            }
        resolved_elements.append({"faces": resolved_faces})
    return resolved_elements


def _resolve_texture_ref(ref, textures, depth=0):
    """Follows '#var' (or bare 'var', a real-world Mojang data quirk seen in
    some newer blocks) indirection to a literal 'block/xxx' texture name."""
    if depth > 10:
        raise ValueError(f"texture reference cycle at {ref!r}")
    if isinstance(ref, dict):
        return _resolve_texture_ref(ref["sprite"], textures, depth + 1)
    if isinstance(ref, str):
        var = ref[1:] if ref.startswith("#") else ref
        if var in textures:
            return _resolve_texture_ref(textures[var], textures, depth + 1)
        if ref.startswith("#"):
            raise KeyError(f"unresolved texture variable '#{var}'")
        return ref.split(":")[-1]
    return ref
