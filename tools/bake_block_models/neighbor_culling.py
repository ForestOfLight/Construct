"""Which of a face's neighbors can hide it, and what the face offers the
neighbor pressed against it in return."""

from decimal import Decimal

from vectors import is_cardinal

# The six directions a face can be culled against, as offsets to the
# neighboring block. A face's cull value is an index into this table, and the
# renderer keeps the same table (CULL_OFFSETS in VerificationLevels.js) to
# turn that index back into the neighbor to ask about - the order is
# arbitrary but shared, so changing it here means changing it there.
CULL_DIRECTIONS = [
    [0, -1, 0],  # 0 down
    [0, 1, 0],   # 1 up
    [0, 0, -1],  # 2 north
    [0, 0, 1],   # 3 south
    [-1, 0, 0],  # 4 west
    [1, 0, 0],   # 5 east
]

_HULL_LOW, _HULL_HIGH = Decimal(0), Decimal(16)
_FULL_SIDE = 16


def cull_direction(center, normal):
    """The index into CULL_DIRECTIONS of the neighbor that hides this face,
    or None if no neighbor can.

    A neighbor hides a face exactly when the face lies flat on the block's
    own hull looking outward, so it is coplanar with the neighbor's facing
    surface and inside the footprint that surface covers. Both halves matter:
    a hull-plane face looking inward is seen from inside the block, and an
    outward face held off the hull (a cactus side, inset a pixel) has a
    sliver of block beside it that stays visible.

    Derived from the geometry rather than read from Java's own "cullface",
    which is the more aggressive of the two - it culls faces merely near the
    hull, and a preview block is drawn slightly inset or oversized rather
    than filling its cube."""
    if not is_cardinal(normal):
        return None
    axis = next(i for i, c in enumerate(normal) if c)
    plane = _HULL_HIGH if Decimal(normal[axis]) > 0 else _HULL_LOW
    if Decimal(center[axis]) != plane:
        return None
    step = 1 if plane == _HULL_HIGH else -1
    return CULL_DIRECTIONS.index([step if i == axis else 0 for i in range(3)])


def covers_side(face):
    """Whether the face fills its whole side of the block, so a neighbor
    pressed against it has nothing showing around the edges."""
    return (
        face["width"] == _FULL_SIDE and face["height"] == _FULL_SIDE
        and cull_direction(face["center"], face["normal"]) is not None
    )


def mark_side_cover(block_models, atlas):
    """Records on every face whether it seals its side of the block opaquely,
    and returns how many do. Mutates `block_models`.

    Call this while faces still carry a 'texture' name - the atlas is what
    knows whether that texture has any transparency in it - so before
    atlas_uv.project_uv drops the names. Whether a face covers its side at
    all is plain geometry, so the face table works that out for itself.

    `missing` disqualifies a face from being opaque but not from covering: a
    cube standing in for something the pipeline could not resolve is drawn
    see-through, so it hides another placeholder pressed against it but
    nothing real.

    Skipping this pass costs culls rather than causing wrong ones, so the
    count is printed rather than asserted on."""
    opaque = 0
    for faces in block_models.values():
        for face in faces:
            face["opaque"] = (
                covers_side(face) and not face.get("missing")
                and atlas.is_opaque(face["texture"])
            )
            opaque += face["opaque"]
    return opaque
