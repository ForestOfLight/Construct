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

# (width axis index, height axis index) into from/to for each face's own
# flat rect, matching how the renderer maps a face's 2D size onto the world.
_FACE_DIMS = {
    "up": (0, 2), "down": (0, 2),
    "north": (0, 1), "south": (0, 1),
    "west": (1, 2), "east": (1, 2),
}


def load_model(mcmeta, model_id):
    path = model_id.split(":")[-1]
    return mcmeta.read_json(MODEL_PATH_TMPL.format(path=path))


def _face_geometry(elem_from, elem_to, face_name):
    """Derives a face's center point, world-space width/height, and outward
    normal from the element's 3D bounding box (e.g. the 'up' face only spans
    the top, not the whole element). Width/height are computed here, before
    any rotation, since rotation is a rigid transform that never changes
    them - only the element-level 'rotation' object (see
    _apply_element_rotation) and blockstate x/y rotation change center/normal."""
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
    width_idx, height_idx = _FACE_DIMS[face_name]
    width = abs(rect_to[width_idx] - rect_from[width_idx])
    height = abs(rect_to[height_idx] - rect_from[height_idx])
    return center, width, height, list(_FACE_NORMAL[face_name])


def _apply_element_rotation(center, normal, rotation):
    """Applies a Java model element's optional 'rotation' object (arbitrary
    angle around a single axis, e.g. the 45-degree y-axis rotation used by
    cross-shaped plant models) to a face's center and normal."""
    if not rotation:
        return center, normal
    angle = rotation.get("angle", 0)
    if not angle:
        return center, normal
    origin = rotation.get("origin", [8, 8, 8])
    axis = rotation["axis"]
    return rotate_point(center, origin, axis, angle), rotate_vector(normal, axis, angle)


def resolve_model(mcmeta, model_id):
    """Returns a list of elements: [{'faces': {face_name: {'center','width',
    'height','normal','uv','texture','rotation','cullface','tintindex'}}}]"""
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
            center, width, height, normal = _face_geometry(element["from"], element["to"], face_name)
            center, normal = _apply_element_rotation(center, normal, element.get("rotation"))
            resolved_faces[face_name] = {
                "center": center,
                "width": width,
                "height": height,
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
