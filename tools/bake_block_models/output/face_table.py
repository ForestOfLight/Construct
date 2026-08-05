"""Turns every block's face list into indices into one shared table of face
descriptors, then flattens that table into bare numbers.

Written out as objects, a descriptor costs ~300 bytes: nine field names
repeated on every one of ~34,000 faces (the names alone were 2MB of the
generated module), plus an object, a nested uv object and two arrays for the
engine to allocate at load and hold for the session. A row of numbers costs
neither, and the renderer builds a descriptor back out of a row only for the
faces a build actually draws.
"""

from geometry.billboard import billboard_facing
from blocks.neighbor_culling import covers_side, cull_direction

# A face-type descriptor's fields, in the order flatten_face_types writes
# them into a row. The renderer's FaceTable reads them back by the same
# offsets, so this is one definition in two languages - change it and FACE_*
# in packs/BP/scripts/classes/Render/FaceTable.js together.
FACE_ROW_FIELDS = (
    "cull", "facing", "center", "width", "height", "roll", "tintindex", "uv",
)
FACE_ROW_WIDTH = 15

# Stands in for a face no neighbor can hide, on the ~64% of faces that carry
# no cull direction. Not a valid cull index (they are 0-5), so the renderer
# can test for it rather than needing a column of its own.
NO_CULL = -1

# What a face offers the neighbor on the other side of it, packed into the
# spare bits of the cull column rather than given columns of their own: both
# are only ever set on a face that HAS a cull direction, so they have nowhere
# else to be, and two more columns would have cost ~67,000 numbers in the
# generated module to carry two bits apiece. FaceTable reads them back with
# the same masks.
CULL_MASK = 0b111
COVERS_SIDE = 0b1000   # the face spans its whole side of the block
OPAQUE_SIDE = 0b10000  # ...and nothing shows through it


def build_face_types_and_refs(block_models):
    """Deduplicates each face's full descriptor - shape and uv together -
    into a shared table, replacing each block's face list with indices into
    it. Mutates and returns `block_models` alongside the table.

    Call this after atlas.uv.project_uv, so faces carry a 'uv' rect rather
    than a texture name."""
    face_type_index = {}
    face_types = []
    for bedrock_state, faces in block_models.items():
        refs = []
        for face in faces:
            descriptor = _describe(face)
            key = _dedup_key(descriptor)
            if key not in face_type_index:
                face_type_index[key] = len(face_types)
                face_types.append(descriptor)
            refs.append(face_type_index[key])
        block_models[bedrock_state] = refs
    return face_types, block_models


def _describe(face):
    """A face as the renderer needs it. The optional fields are left off
    rather than set to a falsy value, since every descriptor is written out
    literally into the generated module."""
    # Both of these are derived from the outward normal rather than from the
    # published 'facing', which is reversed for a face pointing straight up
    # or down (see geometry.billboard.billboard_facing) - reading the cull
    # direction off that would have every top face culled by the block below.
    cull = cull_direction(face["center"], face["normal"])
    covers = covers_side(face)
    descriptor = {
        "center": face["center"],
        "width": face["width"],
        "height": face["height"],
        "facing": billboard_facing(face["normal"]),
        "roll": face["roll"],
        "tintindex": face["tintindex"],
        "uv": face["uv"],
    }
    if face.get("missing", False):
        descriptor["missing"] = True
    if cull is not None:
        descriptor["cull"] = cull
    if covers:
        descriptor["covers"] = True
        # the geometry half of what this face offers a neighbor is settled
        # here; the opacity half was settled by mark_side_cover, back when
        # the face still named its texture
        if face.get("opaque", False):
            descriptor["opaque"] = True
    return descriptor


def _dedup_key(descriptor):
    uv = descriptor["uv"]
    return (
        tuple(descriptor["center"]), descriptor["width"], descriptor["height"],
        tuple(descriptor["facing"]), descriptor["roll"], descriptor["tintindex"],
        uv["x"], uv["y"], uv["w"], uv["h"],
        descriptor.get("missing", False), descriptor.get("cull"),
        descriptor.get("covers", False), descriptor.get("opaque", False),
    )


def flatten_face_types(face_types):
    """Flattens the descriptors into one array of numbers, FACE_ROW_WIDTH per
    face, laid out as FACE_ROW_FIELDS describes. Returns (rows,
    missing_indices).

    `missing` stays out of the rows: it is true on a handful of faces, so a
    column for it would be ~34,000 zeroes. The indices of those few come back
    as their own list instead."""
    rows = []
    missing_indices = []
    for index, descriptor in enumerate(face_types):
        uv = descriptor["uv"]
        rows.extend([
            _cull_column(descriptor),
            *descriptor["facing"],
            *descriptor["center"],
            descriptor["width"],
            descriptor["height"],
            descriptor["roll"],
            descriptor["tintindex"],
            uv["x"], uv["y"], uv["w"], uv["h"],
        ])
        if descriptor.get("missing"):
            missing_indices.append(index)
    return rows, missing_indices


def _cull_column(descriptor):
    """Which neighbor hides this face, plus what it offers that neighbor in
    return (see COVERS_SIDE / OPAQUE_SIDE)."""
    cull = descriptor.get("cull")
    if cull is None:
        return NO_CULL
    return (cull
            | (COVERS_SIDE if descriptor.get("covers") else 0)
            | (OPAQUE_SIDE if descriptor.get("opaque") else 0))
