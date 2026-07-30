"""Resolves a Java block model's parent chain into concrete elements with
textures fully resolved to literal names (no #variable indirection left)."""

from decimal import Decimal

from rotation import rotate_about_normal, rotate_point, rotate_vector

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

# Which way Java's uv u and v axes actually point in world space for each
# face, before any rotation - not just which axis they land on, but which
# direction along it. v points the way the texture image reads *downward*
# (v=0 is the image's top row).
#
# Derived from Java's own default-uv table (BlockElement.uvsByFace): up is
# [from.x, from.z, to.x, to.z] so u=+x, v=+z; down is [from.x, 16-to.z,
# to.x, 16-from.z] so u=+x, v=-z; the four sides all run v=-y with u=+x
# (south), -x (north), +z (west), -z (east). Cross-checked for internal
# consistency: every row below satisfies u x v == -normal, which is exactly
# the handedness an unmirrored texture viewed from outside the face must
# have - a single wrong sign anywhere would break that.
#
# Direction (not just axis) is what lets a face's roll be computed at all:
# knowing only that the up face's v lies "on the z axis" can't distinguish
# a texture reading north from one reading south.
_FACE_UV_BASIS = {
    "down": ([1, 0, 0], [0, 0, -1]),
    "up": ([1, 0, 0], [0, 0, 1]),
    "north": ([-1, 0, 0], [0, -1, 0]),
    "south": ([1, 0, 0], [0, -1, 0]),
    "west": ([0, 0, 1], [0, -1, 0]),
    "east": ([0, 0, -1], [0, -1, 0]),
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


_NORMAL_TO_FACE = {tuple(normal): name for name, normal in _FACE_NORMAL.items()}
_UV_SPAN = Decimal(16)


def rotate_uv_rect(uv, quarter_turns):
    """Turns a uv rect a quarter turn at a time about the texture's centre,
    the way Java's uvlock does. Rotating about the centre (rather than the
    rect's own centre) is what keeps the result inside the texture's own
    0-16 bounds - a rect rotated in place could otherwise run past the edge
    and sample whatever is packed next to it in the atlas.

    Returned as a plain [u0, v0, u1, v1] rect with the corners re-sorted, so
    everything downstream can keep reading it as "offset plus span"."""
    quarter_turns %= 4
    if not quarter_turns:
        return uv
    corners = [(Decimal(uv[0]), Decimal(uv[1])), (Decimal(uv[2]), Decimal(uv[3]))]
    for _ in range(quarter_turns):
        corners = [(v, _UV_SPAN - u) for u, v in corners]
    (u0, v0), (u1, v1) = corners
    return [min(u0, u1), min(v0, v1), max(u0, u1), max(v0, v1)]


def uv_axes_for_normal(normal, face_rotation):
    """Same as _uv_axes, but keyed by an outward normal instead of a face
    name - i.e. "whichever face points this way". Returns None if the normal
    isn't a cardinal direction. Used for uvlock (see blockstate_resolver),
    which needs the texture frame a face *would* have been authored with had
    it started out in the orientation it ended up in."""
    key = tuple(int(round(float(c))) for c in normal)
    face_name = _NORMAL_TO_FACE.get(key)
    if face_name is None:
        return None
    return _uv_axes(face_name, face_rotation)


def _uv_axes(face_name, face_rotation):
    """Returns the face's texture u and v axes as world-space unit vectors,
    so they can be rotated exactly like the geometry's extent and normal are.
    Only directions live here - how far the uv rect spans along each is read
    straight off the raw uv rect where it's needed (main.py), and a span is
    a scalar no rotation can change.

    Java's per-face "rotation" turns the texture clockwise as seen from
    outside the face by 0/90/180/270 degrees; clockwise-from-outside is a
    negative right-handed rotation about the outward normal. Applying it
    here - while the normal is still a plain cardinal direction, and before
    any element or blockstate rotation - keeps it in Java's own order, and
    means everything downstream only ever sees an already-rotated texture
    frame. A 90/270 rotation swaps which world axis carries u vs. v, which
    is precisely what makes the quad's width/height and uv width/height swap
    together later on instead of drifting apart."""
    u_dir, v_dir = _FACE_UV_BASIS[face_name]
    uv_u = [Decimal(c) for c in u_dir]
    uv_v = [Decimal(c) for c in v_dir]
    if face_rotation:
        normal = _FACE_NORMAL[face_name]
        uv_u = rotate_about_normal(uv_u, normal, -face_rotation)
        uv_v = rotate_about_normal(uv_v, normal, -face_rotation)
    return uv_u, uv_v


def _apply_element_rotation(center, extent, normal, uv_u, uv_v, rotation):
    """Applies a Java model element's optional 'rotation' object (arbitrary
    angle around a single axis, e.g. the 45-degree y-axis rotation used by
    cross-shaped plant models) to a face's center, extent, normal, and
    texture axes."""
    if not rotation:
        return center, extent, normal, uv_u, uv_v
    angle = rotation.get("angle", 0)
    if not angle:
        return center, extent, normal, uv_u, uv_v
    origin = rotation.get("origin", [8, 8, 8])
    axis = rotation["axis"]
    return (
        rotate_point(center, origin, axis, angle),
        rotate_vector(extent, axis, angle),
        rotate_vector(normal, axis, angle),
        rotate_vector(uv_u, axis, angle),
        rotate_vector(uv_v, axis, angle),
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
            uv_u, uv_v = _uv_axes(face_name, face.get("rotation", 0))
            center, extent, normal, uv_u, uv_v = _apply_element_rotation(
                center, extent, normal, uv_u, uv_v, element.get("rotation"),
            )
            resolved_faces[face_name] = {
                "center": center,
                "extent": extent,
                "normal": normal,
                "uv": uv,
                "uv_u": uv_u,
                "uv_v": uv_v,
                # Java's per-face "rotation" is already baked into uv_u/uv_v
                # (see _uv_axes) and must never be applied a second time.
                # It's kept only because uvlock rebuilds the texture frame
                # from scratch for a face's final orientation, and has to
                # put this back when it does.
                "uv_rotation": face.get("rotation", 0),
                "texture": _resolve_texture_ref(face["texture"], textures),
                "cullface": face.get("cullface"),
                "tintindex": face.get("tintindex", -1),
                # only ever set by hardcoded block-entity shapes (see
                # block_entity_models.json): real mcmeta face uv is always
                # authored forward, but a box-uv auto-unwrap (used by those
                # shapes' source data) mirrors its up/down faces relative to
                # the sides, which our uv pipeline can't express as a signed
                # rect - "flip" ("fx"/"fy"/"fxfy") instead asks main.py to
                # sample a pre-mirrored copy of the texture for this face.
                "flip": face.get("flip", ""),
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
