"""Resolves a Java block model's parent chain into concrete elements, with
every face's geometry, texture frame and texture name fully worked out."""

from decimal import Decimal

from geometry.rotation import element_angle, rotate_about_normal, rotate_point, rotate_vector

MODEL_PATH_TMPL = "assets/minecraft/models/{path}.json"

# (axis index into from/to, which corner of the element's bounding box that
# axis is pinned to) - i.e. the flat plane each face lies on.
_FACE_PLANE = {
    "down": (1, "from"), "up": (1, "to"),
    "north": (2, "from"), "south": (2, "to"),
    "west": (0, "from"), "east": (0, "to"),
}

_FACE_NORMAL = {
    "down": [0, -1, 0], "up": [0, 1, 0],
    "north": [0, 0, -1], "south": [0, 0, 1],
    "west": [-1, 0, 0], "east": [1, 0, 0],
}

# Which way Java's uv u and v axes point in world space for each unrotated
# face - not just which axis they land on, but which direction along it. v
# points the way the texture image reads downward.
#
# Derived from Java's own default-uv table (BlockElement.uvsByFace) and
# cross-checked for internal consistency: every row satisfies u x v ==
# -normal, which is the handedness an unmirrored texture viewed from outside
# the face must have, so a single wrong sign anywhere would break it.
#
# Direction rather than axis alone is what lets a face's roll be computed:
# knowing only that the up face's v lies "on the z axis" can't distinguish a
# texture reading north from one reading south.
_FACE_UV_BASIS = {
    "down": ([1, 0, 0], [0, 0, -1]),
    "up": ([1, 0, 0], [0, 0, 1]),
    "north": ([-1, 0, 0], [0, -1, 0]),
    "south": ([1, 0, 0], [0, -1, 0]),
    "west": ([0, 0, 1], [0, -1, 0]),
    "east": ([0, 0, -1], [0, -1, 0]),
}

# The same table seen from the other side: Java's rule for what a face's uv
# is when the model gives none. Each u0/v0/u1/v1 slot reads (axis index,
# which corner, invert?), where invert means 16 minus the value. Spelled out
# rather than derived because which corner a slot reads flips along with the
# invert, and that is far easier to check against Java's source as a table.
#
# The default is NOT the whole texture - it is the slice of it the element
# covers, so a part-block element samples a correspondingly small part. A
# full 0-16 default instead crams a whole 16x16 into, say, cake's 14x8 sides.
_FROM, _TO = 0, 1
_FACE_UV_DEFAULT = {
    #          u0                    v0                   u1                   v1
    "down": ((0, _FROM, False), (2, _TO, True), (0, _TO, False), (2, _FROM, True)),
    "up": ((0, _FROM, False), (2, _FROM, False), (0, _TO, False), (2, _TO, False)),
    "north": ((0, _TO, True), (1, _TO, True), (0, _FROM, True), (1, _FROM, True)),
    "south": ((0, _FROM, False), (1, _TO, True), (0, _TO, False), (1, _FROM, True)),
    "west": ((2, _FROM, False), (1, _TO, True), (2, _TO, False), (1, _FROM, True)),
    "east": ((2, _TO, True), (1, _TO, True), (2, _FROM, True), (1, _FROM, True)),
}

_NORMAL_TO_FACE = {tuple(normal): name for name, normal in _FACE_NORMAL.items()}
_UV_SPAN = Decimal(16)


def resolve_model(mcmeta, model_id):
    """Every element of the model at `model_id`, as {'faces': {face_name:
    {...}}} dicts."""
    elements, textures = _merge_chain(mcmeta, model_id)
    return resolve_elements(elements, textures)


def resolve_elements(elements, textures):
    """Turns a raw (already-flattened, parent-less) elements list plus its
    texture-variable dict into resolved elements. Shared by real mcmeta model
    chains and the hardcoded block-entity shapes, which are authored in this
    same elements/textures shape."""
    resolved_elements = []
    for element in elements or []:
        resolved_faces = {}
        for face_name, face in element.get("faces", {}).items():
            resolved_faces[face_name] = _resolve_face(element, face_name, face, textures)
        resolved_elements.append({"faces": resolved_faces})
    return resolved_elements


def _resolve_face(element, face_name, face, textures):
    uv = face.get("uv") or default_uv(element["from"], element["to"], face_name)
    uv, uv_flip = _unmirror_uv(uv)
    center, extent, normal = _face_geometry(element["from"], element["to"], face_name)
    uv_u, uv_v = _uv_axes(face_name, face.get("rotation", 0))
    center, extent, normal, uv_u, uv_v = _apply_element_rotation(
        center, extent, normal, uv_u, uv_v, element.get("rotation"),
    )
    return {
        "center": center,
        "extent": extent,
        "normal": normal,
        "uv": uv,
        "uv_u": uv_u,
        "uv_v": uv_v,
        # already baked into uv_u/uv_v and must never be applied a second
        # time; kept only because uvlock rebuilds the texture frame from
        # scratch and has to put this back when it does
        "uv_rotation": face.get("rotation", 0),
        "texture": _resolve_texture_ref(face["texture"], textures),
        "cullface": face.get("cullface"),
        "tintindex": face.get("tintindex", -1),
        "flip": face.get("flip", "") + uv_flip,
    }


def resolve_model_particle(mcmeta, model_id):
    """The literal texture name the model's 'particle' slot resolves to, or
    None if it declares none.

    A model that draws nothing still names a particle - it is what Java shows
    for the block when it has no geometry, which makes it the one honest
    stand-in available for such a block."""
    _, textures = _merge_chain(mcmeta, model_id)
    if "particle" not in textures:
        return None
    return _resolve_texture_ref(textures["particle"], textures)


def load_model(mcmeta, model_id):
    path = model_id.split(":")[-1]
    return mcmeta.read_json(MODEL_PATH_TMPL.format(path=path))


def default_uv(elem_from, elem_to, face_name):
    """Java's default uv for a face whose model omits one: the element's own
    bounds projected onto the face's two texture axes."""
    corners = (elem_from, elem_to)
    uv = []
    for axis, corner, invert in _FACE_UV_DEFAULT[face_name]:
        value = Decimal(corners[corner][axis])
        uv.append(Decimal(16) - value if invert else value)
    return uv


def rotate_uv_rect(uv, quarter_turns):
    """Turns a uv rect about the texture's centre, the way Java's uvlock
    does. About the texture's centre rather than the rect's own is what keeps
    the result inside the texture's 0-16 bounds - a rect rotated in place
    could run past the edge and sample whatever is packed next to it in the
    atlas.

    Returned with its corners re-sorted, so everything downstream can keep
    reading it as offset plus span."""
    quarter_turns %= 4
    if not quarter_turns:
        return uv
    corners = [(Decimal(uv[0]), Decimal(uv[1])), (Decimal(uv[2]), Decimal(uv[3]))]
    for _ in range(quarter_turns):
        corners = [(v, _UV_SPAN - u) for u, v in corners]
    (u0, v0), (u1, v1) = corners
    return [min(u0, u1), min(v0, v1), max(u0, u1), max(v0, v1)]


def uv_axes_for_normal(normal, face_rotation):
    """The texture frame of whichever face points along `normal`, or None if
    that isn't a cardinal direction. Used for uvlock, which needs the frame a
    face *would* have been authored with had it started out in the
    orientation it ended up in."""
    key = tuple(int(round(float(c))) for c in normal)
    face_name = _NORMAL_TO_FACE.get(key)
    if face_name is None:
        return None
    return _uv_axes(face_name, face_rotation)


def _uv_axes(face_name, face_rotation):
    """The face's texture u and v axes as world-space unit vectors, so they
    can be rotated exactly like its extent and normal are. Only directions
    live here; how far the uv rect spans along each is read off the rect
    itself, and a span is a scalar no rotation can change.

    Java's per-face "rotation" turns the texture clockwise as seen from
    outside, which is a negative right-handed rotation about the outward
    normal. Applying it here - while the normal is still a plain cardinal
    direction, before any element or blockstate rotation - keeps it in Java's
    own order and means everything downstream sees an already-rotated
    frame."""
    u_dir, v_dir = _FACE_UV_BASIS[face_name]
    uv_u = [Decimal(c) for c in u_dir]
    uv_v = [Decimal(c) for c in v_dir]
    if face_rotation:
        normal = _FACE_NORMAL[face_name]
        uv_u = rotate_about_normal(uv_u, normal, -face_rotation)
        uv_v = rotate_about_normal(uv_v, normal, -face_rotation)
    return uv_u, uv_v


def _unmirror_uv(uv):
    """Splits a uv rect into a forward-running rect plus the mirroring it
    asked for, as a 'flip' the atlas can satisfy with a pre-mirrored copy of
    the texture.

    A Java face's four vertices take (u0,v0) (u0,v1) (u1,v1) (u1,v0) in a
    fixed geometric order, so a rect written back-to-front on an axis - the
    observer's top face is [0,16,16,0] - reflects the texture across that
    axis. Nothing downstream can express that: the rect's corners get sorted
    the moment it is projected into the atlas.

    The rect has to move with the mirror, because the whole texture is
    mirrored rather than just the part this face samples: rows 2-6 of a
    16-tall texture end up at rows 10-14 of the flipped copy."""
    u0, v0, u1, v1 = (Decimal(c) for c in uv)
    flip = ""
    if u0 > u1:
        flip += "fx"
        u0, u1 = _UV_SPAN - u0, _UV_SPAN - u1
    if v0 > v1:
        flip += "fy"
        v0, v1 = _UV_SPAN - v0, _UV_SPAN - v1
    return [u0, v0, u1, v1], flip


def _face_geometry(elem_from, elem_to, face_name):
    """A face's center point, signed extent vector and outward normal, taken
    off the element's bounding box.

    The extent is kept signed and un-abs'd so it can be rotated exactly like
    the normal is; world-space width and height are only derived from it once
    every rotation is done (see geometry.billboard.face_size). A 90-degree
    blockstate rotation about X or Z can change which axis is vertical for a
    face, so deriving them early bakes in the wrong axis pairing."""
    axis_idx, which = _FACE_PLANE[face_name]
    value = elem_from[axis_idx] if which == "from" else elem_to[axis_idx]
    rect_from = list(elem_from)
    rect_to = list(elem_to)
    rect_from[axis_idx] = value
    rect_to[axis_idx] = value
    # Decimal(a) + Decimal(b) keeps this exact and Decimal-typed even when
    # both inputs are plain ints - "/" on two ints returns a native float,
    # which can't mix with Decimal during rotation math later on.
    center = [(Decimal(a) + Decimal(b)) / 2 for a, b in zip(rect_from, rect_to)]
    extent = [Decimal(b) - Decimal(a) for a, b in zip(rect_from, rect_to)]
    return center, extent, list(_FACE_NORMAL[face_name])


def _apply_element_rotation(center, extent, normal, uv_u, uv_v, rotation):
    """Applies a model element's optional 'rotation' object - an arbitrary
    angle around a single axis, such as the 45 degrees a cross-shaped plant
    turns - to everything the face carries."""
    if not rotation:
        return center, extent, normal, uv_u, uv_v
    axis = rotation["axis"]
    angle = element_angle(axis, rotation.get("angle", 0))
    if not angle:
        return center, extent, normal, uv_u, uv_v
    origin = rotation.get("origin", [8, 8, 8])
    return (
        rotate_point(center, origin, axis, angle),
        rotate_vector(extent, axis, angle),
        rotate_vector(normal, axis, angle),
        rotate_vector(uv_u, axis, angle),
        rotate_vector(uv_v, axis, angle),
    )


def _merge_chain(mcmeta, model_id):
    """Walks a model's parent chain and returns (elements, textures) with
    parents applied first, so the most specific model wins."""
    chain = []
    current_id = model_id
    seen = set()
    while current_id and current_id not in seen:
        seen.add(current_id)
        model = load_model(mcmeta, current_id)
        chain.append(model)
        current_id = model.get("parent")
    chain.reverse()

    textures = {}
    elements = None
    for model in chain:
        textures.update(model.get("textures", {}))
        if "elements" in model:
            elements = model["elements"]
    return elements, textures


def _resolve_texture_ref(ref, textures, depth=0):
    """Follows '#var' - or bare 'var', a real-world Mojang data quirk seen in
    some newer blocks - indirection to a literal 'block/xxx' texture name."""
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
