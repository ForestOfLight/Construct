"""Cuts the number of faces a block draws without changing what it looks
like. Every face here is a particle the renderer would otherwise spawn for
every block placed, so this is the pass worth watching when a Minecraft
update reshapes the models.

Three reductions, run in this order by block_models.build_block_models:
compose faces drawn exactly on top of each other, drop faces sealed inside
opaque geometry, and join neighboring faces that sample neighboring parts of
the same texture.
"""

from dataclasses import dataclass
from decimal import Decimal

from atlas.packing import compose_textures
from geometry.vectors import dot, negated, offset


@dataclass
class ReductionStats:
    """What the reductions took off, across every block in a bake."""
    faces_before: int = 0
    faces_after: int = 0
    culled: int = 0
    joined: int = 0

    def summary(self):
        if not self.faces_before:
            return "no faces to reduce"
        percent = 100 * (self.faces_before - self.faces_after) / self.faces_before
        return (f"faces {self.faces_before} -> {self.faces_after} "
                f"({percent:.1f}% fewer): {self.culled} interior culled, "
                f"{self.joined} joined")


def merge_coincident_faces(faces):
    """Collapses faces occupying exactly the same quad into one carrying a
    composited texture.

    Java draws a block's elements in order, so an element laid exactly over
    an earlier one is a deliberate overlay - a grass block is a cube of
    dirt-and-grass sides with a second, identical cube carrying just the
    tinted grass fringe. Our renderer has no draw order to lean on: two quads
    sharing a plane z-fight and flicker between the two textures instead of
    layering. One quad with the layers composited into its texture cannot
    fight itself.

    Only faces agreeing on every other value are merged, because compositing
    happens at texture level, which is equivalent to layering only when both
    faces sample the same rect of that texture."""
    merged = []
    by_quad = {}
    for face in faces:
        key = (
            tuple(str(c) for c in face["center"]), tuple(str(c) for c in face["normal"]),
            str(face["width"]), str(face["height"]), str(face["roll"]),
            tuple(str(c) for c in face["uv"]),
        )
        first = by_quad.get(key)
        if first is None:
            by_quad[key] = face
            merged.append(face)
        elif first["texture"] != face["texture"]:
            first["texture"] = compose_textures(first["texture"], face["texture"])
    return merged


def cull_interior_faces(faces, atlas):
    """Drops faces sealed inside opaque geometry of the same block. Returns
    (kept, dropped_count).

    Java gets these for free by drawing solid elements into a depth buffer;
    we spawn a particle per face, so a buried surface costs as much as a
    visible one and additionally z-fights the face it is pressed against - a
    beacon's core sits in its obsidian base, a dried ghast's tentacles hang
    off its body, and every one of those seams is drawn twice.

    Two conditions together, both load-bearing: something opaque lies flat
    against the face's back (_covers) and that something is a box the face is
    sealed inside rather than a bare plane (_is_buried).

    Only a *surviving* face can bury another, so a pair of quads covering
    each other loses at most one. Removing both would need the shell around
    them to be opaque everywhere the pair can be seen through, which is a
    question about the whole model rather than about two faces.

    Opacity is judged over the whole texture rather than the rect a face
    samples, which is the conservative direction: this can miss a cull but
    never make a wrong one."""
    kept = list(faces)
    dropped = 0
    for face in faces:
        for other in kept:
            if other is face or not _covers(other, face):
                continue
            if not atlas.is_opaque(other["texture"]):
                continue
            if not _is_buried(face, other, kept, atlas):
                continue
            kept.remove(face)
            dropped += 1
            break
    return kept, dropped


def _covers(other, face):
    """Whether `other` lies flat against the back of `face`, spanning at
    least every point `face` does. This alone does not mean `face` is hidden
    - see _is_buried."""
    if tuple(other["normal"]) != tuple(negated(face["normal"])):
        return False
    if dot(other["center"], face["normal"]) != dot(face["center"], face["normal"]):
        return False
    if not _is_axis_aligned_with(face, other):
        return False
    u_axis, v_axis = face["uv_u"], face["uv_v"]
    fu, fhw, fv, fhh = _extent_in_frame(face, u_axis, v_axis)
    ou, ohw, ov, ohh = _extent_in_frame(other, u_axis, v_axis)
    return (ou - ohw <= fu - fhw and ou + ohw >= fu + fhw
            and ov - ohh <= fv - fhh and ov + ohh >= fv + fhh)


def _is_axis_aligned_with(face, other):
    """Whether `other`'s texture axes lie along `face`'s - parallel or
    perpendicular, either way round.

    This is the precondition for measuring one quad's extent in the other's
    frame as a plain interval. Two coplanar quads at some other angle - a
    cross-plant's 45-degree elements - would need real polygon intersection,
    and a bounding box would claim coverage that isn't there, so they are
    left alone."""
    for axis in (other["uv_u"], other["uv_v"]):
        for own in (face["uv_u"], face["uv_v"]):
            if abs(dot(axis, own)) not in (0, 1):
                return False
    return True


def _extent_in_frame(face, u_axis, v_axis):
    """(u position, u half-width, v position, v half-height) of `face`'s quad
    measured along the given in-plane axes. Meaningful only when those axes
    are aligned with the face's own."""
    half_w, half_h = Decimal(face["width"]) / 2, Decimal(face["height"]) / 2
    return (
        dot(face["center"], u_axis),
        abs(half_w * dot(face["uv_u"], u_axis)) + abs(half_h * dot(face["uv_v"], u_axis)),
        dot(face["center"], v_axis),
        abs(half_w * dot(face["uv_u"], v_axis)) + abs(half_h * dot(face["uv_v"], v_axis)),
    )


def _is_buried(face, coverer, faces, atlas):
    """Whether `face` looks out into the solid inside of `coverer`'s element
    rather than into open space.

    `face` is only ever seen from the side its normal points, and `coverer`
    is flat against its back, so `coverer`'s element is the thing between the
    two - but only if that element has real thickness along the normal. What
    proves it does is the element having another face pointing the same way
    and further along that normal: the far wall of a box `face` is sealed
    inside, which a viewer meets first if it is opaque.

    Without this test, "covered by an opposite-facing opaque quad" also
    describes the two sides of a zero-thickness plane - an azalea's top leaf
    layer is one quad up and one quad down at the same height - and dropping
    the down side makes the block vanish when looked at from below."""
    normal = face["normal"]
    depth = dot(face["center"], normal)
    for other in faces:
        if other is face or other.get("element") != coverer.get("element"):
            continue
        if tuple(other["normal"]) != tuple(normal):
            continue
        if dot(other["center"], normal) <= depth:
            continue
        if atlas.is_opaque(other["texture"]):
            return True
    return False


def join_coplanar_faces(faces):
    """Merges neighboring coplanar quads that sample neighboring parts of the
    same texture into single larger quads. Returns (kept, joined_count).

    Models are authored as boxes, so one flat surface routinely arrives as
    several abutting quads, each costing a particle. Where two are edge to
    edge in the world AND edge to edge in the texture, one quad covering both
    samples exactly the union of what the two sampled, at the same
    texels-per-pixel - so the merge is invisible by construction."""
    kept = list(faces)
    joined = 0
    merging = True
    while merging:
        merging = False
        for i in range(len(kept)):
            for j in range(i + 1, len(kept)):
                merged = _join_pair(kept[i], kept[j])
                if merged is None:
                    continue
                kept[i] = merged
                del kept[j]
                joined += 1
                merging = True
                break
            if merging:
                break
    return kept, joined


def _join_pair(a, b):
    """The single quad covering both `a` and `b`, or None if they can't be
    joined without changing what gets drawn."""
    if a["texture"] != b["texture"] or a["tintindex"] != b["tintindex"]:
        return None
    if a["roll"] != b["roll"] or tuple(a["normal"]) != tuple(b["normal"]):
        return None
    # Same texture frame, not merely aligned: the merged uv rect is written
    # in these axes, so a pair reading u along opposite world directions
    # could not share one rect even though their quads line up.
    if tuple(a["uv_u"]) != tuple(b["uv_u"]) or tuple(a["uv_v"]) != tuple(b["uv_v"]):
        return None
    if dot(a["center"], a["normal"]) != dot(b["center"], b["normal"]):
        return None
    return _join_along_u(a, b) or _join_along_v(a, b)


def _join_along_u(a, b):
    """The pair joined side by side along the texture's u axis, or None."""
    if a["height"] != b["height"] or a["uv"][1] != b["uv"][1] or a["uv"][3] != b["uv"][3]:
        return None
    if dot(a["center"], a["uv_v"]) != dot(b["center"], b["uv_v"]):
        return None
    lo, hi = sorted((a, b), key=lambda face: dot(face["center"], face["uv_u"]))
    if not _abut_in_world(lo, hi, "uv_u", "width"):
        return None
    if not _abut_in_texture(lo, hi, "width", 0, 2):
        return None
    return {
        **lo,
        "center": offset(lo["center"], lo["uv_u"], Decimal(hi["width"]) / 2),
        "width": Decimal(lo["width"]) + Decimal(hi["width"]),
        "uv": [lo["uv"][0], lo["uv"][1], hi["uv"][2], lo["uv"][3]],
    }


def _join_along_v(a, b):
    """The pair joined one above the other along the texture's v axis, or
    None. v runs the way the texture reads downward, so the quad further
    along it is the one sampling further down the texture."""
    if a["width"] != b["width"] or a["uv"][0] != b["uv"][0] or a["uv"][2] != b["uv"][2]:
        return None
    if dot(a["center"], a["uv_u"]) != dot(b["center"], b["uv_u"]):
        return None
    lo, hi = sorted((a, b), key=lambda face: dot(face["center"], face["uv_v"]))
    if not _abut_in_world(lo, hi, "uv_v", "height"):
        return None
    if not _abut_in_texture(lo, hi, "height", 1, 3):
        return None
    return {
        **lo,
        "center": offset(lo["center"], lo["uv_v"], Decimal(hi["height"]) / 2),
        "height": Decimal(lo["height"]) + Decimal(hi["height"]),
        "uv": [lo["uv"][0], lo["uv"][1], lo["uv"][2], hi["uv"][3]],
    }


def _abut_in_world(lo, hi, axis_key, size_key):
    """Whether the two quads meet edge to edge along `axis_key`, with no gap
    between them and no overlap."""
    gap = dot(hi["center"], hi[axis_key]) - dot(lo["center"], lo[axis_key])
    return gap == (Decimal(lo[size_key]) + Decimal(hi[size_key])) / 2


def _abut_in_texture(lo, hi, size_key, start, end):
    """Whether the two quads sample contiguous strips of the texture at the
    same texels-per-pixel.

    Contiguity rather than equality is what keeps a pair sampling the
    *identical* rect apart, however neatly their quads abut: that pair is the
    texture drawn twice, and one quad over both would stretch a single copy
    across it at half the texel density. Matching density is also what keeps
    the merged quad picking the same mip level, so nothing blurs at range."""
    if lo["uv"][end] != hi["uv"][start]:
        return False
    lo_span = Decimal(lo["uv"][end]) - Decimal(lo["uv"][start])
    hi_span = Decimal(hi["uv"][end]) - Decimal(hi["uv"][start])
    return Decimal(lo[size_key]) * hi_span == Decimal(hi[size_key]) * lo_span
