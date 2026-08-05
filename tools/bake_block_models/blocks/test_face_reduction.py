import unittest
from decimal import Decimal

from blocks.face_reduction import (
    ReductionStats,
    cull_interior_faces,
    join_coplanar_faces,
    merge_coincident_faces,
)
from blocks.fakes import FakeAtlas


def _south_face(center, width=16, height=16, uv=None, texture="a", tintindex=-1, roll=0):
    """A face on the south side of a block: normal +z, u running +x and v
    running -y (the way the texture reads downward)."""
    return {
        "center": [Decimal(c) for c in center], "width": Decimal(width),
        "height": Decimal(height), "normal": [0, 0, 1], "texture": texture,
        "uv": [Decimal(c) for c in (uv or [0, 0, 16, 16])], "roll": roll,
        "tintindex": tintindex, "uv_u": [1, 0, 0], "uv_v": [0, -1, 0],
    }


def _flat_face(y, facing, width=16, x=8, texture="a", element=0):
    """A horizontal face at height `y`, pointing up (facing 1) or down
    (facing -1), spanning the full 16 in z and `width` in x around `x`."""
    return {
        "center": [Decimal(x), Decimal(y), Decimal(8)], "width": Decimal(width),
        "height": Decimal(16), "normal": [0, facing, 0], "texture": texture,
        "uv": [Decimal(0), Decimal(0), Decimal(16), Decimal(16)],
        "roll": 180 if facing > 0 else 0, "tintindex": -1,
        "uv_u": [1, 0, 0], "uv_v": [0, 0, 1 if facing > 0 else -1],
        "element": element,
    }


class MergeCoincidentFacesTest(unittest.TestCase):
    def _face(self, texture, roll=0, uv=None, center=None):
        return {
            "center": center or [8, 8, 0], "width": 16, "height": 16,
            "normal": [0, 0, -1], "texture": texture, "uv": uv or [0, 0, 16, 16],
            "roll": roll, "tintindex": -1,
        }

    def test_an_overlay_laid_over_a_face_becomes_one_composited_face(self):
        # Mirrors a grass block: a full cube of dirt-and-grass sides with a
        # second, identical cube carrying just the tinted fringe over them.
        # Two quads sharing a plane have nothing to order them and flicker,
        # so they become one face sampling both layers combined.
        faces = [self._face("block/grass_block_side"),
                 self._face("block/grass_block_side_overlay")]
        merged = merge_coincident_faces(faces)
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0]["texture"],
                         "block/grass_block_side^block/grass_block_side_overlay")

    def test_the_same_texture_drawn_twice_collapses_to_one_face(self):
        faces = [self._face("block/pink_petals"), self._face("block/pink_petals")]
        merged = merge_coincident_faces(faces)
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0]["texture"], "block/pink_petals")

    def test_layer_order_follows_the_order_the_faces_arrive_in(self):
        merged = merge_coincident_faces([self._face("a"), self._face("b"), self._face("c")])
        self.assertEqual(merged[0]["texture"], "a^b^c")

    def test_faces_that_only_share_a_position_are_left_alone(self):
        # Compositing happens in the atlas, at texture level, so it is only
        # equivalent to layering when both faces sample the same rect of it -
        # and only when they'd be drawn at the same roll.
        differing_uv = [self._face("a"), self._face("b", uv=[0, 0, 8, 16])]
        differing_roll = [self._face("a"), self._face("b", roll=90)]
        elsewhere = [self._face("a"), self._face("b", center=[8, 8, 16])]
        for label, faces in (("uv", differing_uv), ("roll", differing_roll), ("position", elsewhere)):
            with self.subTest(differing=label):
                self.assertEqual(len(merge_coincident_faces(faces)), 2)


class CullInteriorFacesTest(unittest.TestCase):
    """Faces sealed inside opaque geometry of the same block."""

    def _base_box(self, texture="b", element=1):
        """A solid slab from y=0 to y=3 - the beacon's obsidian base. Its top
        face is what another element can be buried against, and its bottom
        face is the far wall that makes the burial real."""
        return [_flat_face(3, 1, texture=texture, element=element),
                _flat_face(0, -1, texture=texture, element=element)]

    def test_a_face_sealed_inside_a_box_is_dropped(self):
        # the beacon's core sitting in its obsidian base: the core's underside
        # looks down into solid obsidian and can never be seen
        core_bottom = _flat_face(3, -1, width=10, texture="core", element=0)
        faces = [core_bottom, *self._base_box()]
        kept, dropped = cull_interior_faces(faces, FakeAtlas())
        self.assertEqual(dropped, 1)
        self.assertNotIn(core_bottom, kept)

    def test_both_sides_of_a_zero_thickness_plane_are_kept(self):
        # An azalea's top leaf layer is one quad facing up and one facing
        # down at the same height, with nothing between them. Each covers the
        # other, but neither is buried - drop the down side and the block
        # disappears when you look up at it from below.
        up = _flat_face(16, 1, texture="block/azalea_top", element=0)
        down = _flat_face(16, -1, texture="block/azalea_top|fy", element=0)
        kept, dropped = cull_interior_faces([up, down], FakeAtlas())
        self.assertEqual(dropped, 0)
        self.assertEqual(len(kept), 2)

    def test_a_pair_that_buries_each_other_keeps_one_of_the_two(self):
        # a double slab's seam: two boxes meeting at y=8, each with a far wall
        bottom = [_flat_face(8, 1, element=0), _flat_face(0, -1, element=0)]
        top = [_flat_face(8, -1, element=1), _flat_face(16, 1, element=1)]
        kept, dropped = cull_interior_faces([*bottom, *top], FakeAtlas())
        self.assertEqual(dropped, 1)
        self.assertEqual(len(kept), 3)

    def test_a_see_through_box_hides_nothing(self):
        core_bottom = _flat_face(3, -1, width=10, texture="core", element=0)
        faces = [core_bottom, *self._base_box("block/glass")]
        kept, dropped = cull_interior_faces(
            faces, FakeAtlas(transparent={"block/glass"}))
        self.assertEqual(dropped, 0)
        self.assertEqual(len(kept), 3)

    def test_a_box_with_a_see_through_far_wall_hides_nothing(self):
        # the near face is opaque, but you can still see in from underneath
        core_bottom = _flat_face(3, -1, width=10, texture="core", element=0)
        faces = [core_bottom,
                 _flat_face(3, 1, texture="opaque", element=1),
                 _flat_face(0, -1, texture="block/glass", element=1)]
        kept, dropped = cull_interior_faces(
            faces, FakeAtlas(transparent={"block/glass"}))
        self.assertEqual(dropped, 0)
        self.assertEqual(len(kept), 3)

    def test_a_partly_covered_face_is_kept_whole(self):
        # splitting it would mint new geometry rather than remove any. The
        # core's underside spans x 3-13; this base only reaches x 4-12.
        core_bottom = _flat_face(3, -1, width=10, texture="core", element=0)
        faces = [core_bottom,
                 _flat_face(3, 1, width=8, element=1),
                 _flat_face(0, -1, width=8, element=1)]
        kept, dropped = cull_interior_faces(faces, FakeAtlas())
        self.assertEqual(dropped, 0)
        self.assertEqual(len(kept), 3)

    def test_faces_looking_the_same_way_are_left_alone(self):
        # both are seen from the same side, so neither is an interior surface
        # backing the other - this is merge_coincident_faces's territory
        faces = [_flat_face(3, 1, element=0), _flat_face(3, 1, width=8, element=1)]
        kept, dropped = cull_interior_faces(faces, FakeAtlas())
        self.assertEqual(dropped, 0)
        self.assertEqual(len(kept), 2)


class JoinCoplanarFacesTest(unittest.TestCase):
    """Neighboring quads that also sample neighboring parts of the texture
    become one quad drawing exactly what the two drew."""

    def test_two_quads_contiguous_in_world_and_texture_become_one(self):
        left = _south_face([4, 8, 16], width=8, uv=[0, 0, 8, 16])
        right = _south_face([12, 8, 16], width=8, uv=[8, 0, 16, 16])
        kept, joined = join_coplanar_faces([left, right])
        self.assertEqual(joined, 1)
        self.assertEqual(len(kept), 1)
        self.assertEqual(kept[0]["center"], [8, 8, 16])
        self.assertEqual(kept[0]["width"], 16)
        self.assertEqual(kept[0]["uv"], [0, 0, 16, 16])

    def test_quads_sampling_the_identical_rect_are_never_joined(self):
        # This is the texture drawn twice side by side, not one texture split
        # across two quads. One quad over the pair would stretch a single
        # copy across both at half the texel density.
        left = _south_face([4, 8, 16], width=8, uv=[0, 0, 16, 16])
        right = _south_face([12, 8, 16], width=8, uv=[0, 0, 16, 16])
        kept, joined = join_coplanar_faces([left, right])
        self.assertEqual(joined, 0)
        self.assertEqual(len(kept), 2)

    def test_a_run_of_quads_collapses_to_a_single_one(self):
        faces = [_south_face([2 + 4 * i, 8, 16], width=4,
                             uv=[4 * i, 0, 4 * i + 4, 16]) for i in range(4)]
        kept, joined = join_coplanar_faces(faces)
        self.assertEqual(joined, 3)
        self.assertEqual(len(kept), 1)
        self.assertEqual(kept[0]["width"], 16)
        self.assertEqual(kept[0]["uv"], [0, 0, 16, 16])

    def test_quads_stacked_along_v_join_downward_through_the_texture(self):
        # v runs the way the texture reads downward, so the quad higher up in
        # the world is the one sampling the top of the texture
        top = _south_face([8, 12, 16], height=8, uv=[0, 0, 16, 8])
        bottom = _south_face([8, 4, 16], height=8, uv=[0, 8, 16, 16])
        kept, joined = join_coplanar_faces([top, bottom])
        self.assertEqual(joined, 1)
        self.assertEqual(kept[0]["center"], [8, 8, 16])
        self.assertEqual(kept[0]["height"], 16)
        self.assertEqual(kept[0]["uv"], [0, 0, 16, 16])

    def test_a_gap_between_the_quads_blocks_the_join(self):
        left = _south_face([2, 8, 16], width=4, uv=[0, 0, 8, 16])
        away = _south_face([12, 8, 16], width=8, uv=[8, 0, 16, 16])
        self.assertEqual(join_coplanar_faces([left, away])[1], 0)

    def test_mismatched_texel_density_blocks_the_join(self):
        # contiguous both ways, but the right quad shows twice as much
        # texture across the same span - joining would rescale both halves
        left = _south_face([4, 8, 16], width=8, uv=[0, 0, 4, 16])
        right = _south_face([12, 8, 16], width=8, uv=[4, 0, 16, 16])
        self.assertEqual(join_coplanar_faces([left, right])[1], 0)

    def test_faces_disagreeing_on_what_they_draw_are_left_alone(self):
        left = _south_face([4, 8, 16], width=8, uv=[0, 0, 8, 16])
        for label, right in (
            ("texture", _south_face([12, 8, 16], width=8, uv=[8, 0, 16, 16], texture="b")),
            ("tintindex", _south_face([12, 8, 16], width=8, uv=[8, 0, 16, 16], tintindex=0)),
            ("roll", _south_face([12, 8, 16], width=8, uv=[8, 0, 16, 16], roll=90)),
        ):
            with self.subTest(differing=label):
                self.assertEqual(join_coplanar_faces([left, right])[1], 0)

    def test_quads_on_different_planes_are_left_alone(self):
        near = _south_face([4, 8, 16], width=8, uv=[0, 0, 8, 16])
        far = _south_face([12, 8, 0], width=8, uv=[8, 0, 16, 16])
        self.assertEqual(join_coplanar_faces([near, far])[1], 0)


class ReductionStatsTest(unittest.TestCase):
    def test_summary_reports_what_each_pass_took_off(self):
        stats = ReductionStats(faces_before=10, faces_after=6, culled=3, joined=1)
        self.assertEqual(
            stats.summary(),
            "faces 10 -> 6 (40.0% fewer): 3 interior culled, 1 joined",
        )

    def test_a_bake_that_reduced_nothing_does_not_divide_by_zero(self):
        self.assertEqual(ReductionStats().summary(), "no faces to reduce")


if __name__ == "__main__":
    unittest.main()
