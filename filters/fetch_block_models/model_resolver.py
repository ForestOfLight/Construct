"""Resolves a Java block model's parent chain into concrete elements with
textures fully resolved to literal names (no #variable indirection left)."""

MODEL_PATH_TMPL = "assets/minecraft/models/{path}.json"

# (axis index into from/to, which corner of the element's bounding box that
# axis is pinned to for this face) - i.e. the flat plane each face lies on.
_FACE_PLANE = {
    "down": (1, "from"), "up": (1, "to"),
    "north": (2, "from"), "south": (2, "to"),
    "west": (0, "from"), "east": (0, "to"),
}


def load_model(mcmeta, model_id):
    path = model_id.split(":")[-1]
    return mcmeta.read_json(MODEL_PATH_TMPL.format(path=path))


def _face_rect(elem_from, elem_to, face_name):
    """Collapses the element's 3D bounding box down to the flat 2D rectangle
    a single face actually occupies (e.g. the 'up' face only spans the top,
    not the whole element)."""
    axis_idx, which = _FACE_PLANE[face_name]
    value = elem_from[axis_idx] if which == "from" else elem_to[axis_idx]
    rect_from = list(elem_from)
    rect_to = list(elem_to)
    rect_from[axis_idx] = value
    rect_to[axis_idx] = value
    return rect_from, rect_to


def resolve_model(mcmeta, model_id):
    """Returns a list of elements: [{'from': [x,y,z], 'to': [x,y,z],
    'faces': {face_name: {'from','to','uv','texture','rotation','cullface','tintindex'}}}]
    Each face's own 'from'/'to' is its flat rectangle within the element,
    already collapsed on the axis it's normal to."""
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
            rect_from, rect_to = _face_rect(element["from"], element["to"], face_name)
            resolved_faces[face_name] = {
                "from": rect_from,
                "to": rect_to,
                "uv": face.get("uv", [0, 0, 16, 16]),
                "texture": _resolve_texture_ref(face["texture"], textures),
                "rotation": face.get("rotation", 0),
                "cullface": face.get("cullface"),
                "tintindex": face.get("tintindex", -1),
            }
        resolved_elements.append({
            "from": element["from"],
            "to": element["to"],
            "faces": resolved_faces,
        })
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
