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

# (u axis index, v axis index) - which local axis Java's uv u/v span for each
# face, before any rotation. Matches real vanilla data (e.g. button's up
# face: uv u spans its X extent, v spans its Z extent). This must stay in
# sync with the geometry's own axis pairing (see _derive_width_height in
# main.py): a 90-degree blockstate rotation that swaps which axis is
# "width" vs "height" for the geometry must swap the uv's u/v the same way,
# or the texture sample ends up transposed relative to the quad (e.g. a
# button rotated to face a wall stretches its top-face texture 90 degrees).
_FACE_UV_AXES = {
    "up": (0, 2), "down": (0, 2),
    "north": (0, 1), "south": (0, 1),
    "west": (2, 1), "east": (2, 1),
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


def _uv_extent(face_name, uv):
    """Places the Java uv's u/v span onto the same local axes _face_geometry
    uses for extent, so it can be rotated identically (see _FACE_UV_AXES)."""
    u_idx, v_idx = _FACE_UV_AXES[face_name]
    vec = [Decimal(0), Decimal(0), Decimal(0)]
    vec[u_idx] = Decimal(uv[2]) - Decimal(uv[0])
    vec[v_idx] = Decimal(uv[3]) - Decimal(uv[1])
    return vec


def _apply_element_rotation(center, extent, normal, uv_extent, rotation):
    """Applies a Java model element's optional 'rotation' object (arbitrary
    angle around a single axis, e.g. the 45-degree y-axis rotation used by
    cross-shaped plant models) to a face's center, extent, normal, and uv
    extent."""
    if not rotation:
        return center, extent, normal, uv_extent
    angle = rotation.get("angle", 0)
    if not angle:
        return center, extent, normal, uv_extent
    origin = rotation.get("origin", [8, 8, 8])
    axis = rotation["axis"]
    return (
        rotate_point(center, origin, axis, angle),
        rotate_vector(extent, axis, angle),
        rotate_vector(normal, axis, angle),
        rotate_vector(uv_extent, axis, angle),
    )


def resolve_elements(elements, textures):
    """Shared core: turns a raw (already-flattened, parent-less) 'elements'
    list plus its 'textures' variable dict into the same resolved-face shape
    resolve_model produces. Used both for a real mcmeta model chain and for
    the hardcoded block-entity shapes (block_entity_models.json), which are
    already in this exact elements/textures shape - see block_entity_models.py."""
    resolved_elements = []
    for element in elements or []:
        resolved_faces = {}
        for face_name, face in element.get("faces", {}).items():
            uv = face.get("uv", [0, 0, 16, 16])
            center, extent, normal = _face_geometry(element["from"], element["to"], face_name)
            uv_extent = _uv_extent(face_name, uv)
            center, extent, normal, uv_extent = _apply_element_rotation(
                center, extent, normal, uv_extent, element.get("rotation"),
            )
            resolved_faces[face_name] = {
                "center": center,
                "extent": extent,
                "normal": normal,
                "uv": uv,
                "uv_extent": uv_extent,
                "texture": _resolve_texture_ref(face["texture"], textures),
                "rotation": face.get("rotation", 0),
                "cullface": face.get("cullface"),
                "tintindex": face.get("tintindex", -1),
            }
        resolved_elements.append({"faces": resolved_faces})
    return resolved_elements


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

    return resolve_elements(elements, textures)


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
