import unittest
from decimal import Decimal

from atlas_uv import WHITE_TEXTURE
from neighbor_culling import CULL_DIRECTIONS, covers_side, cull_direction, mark_side_cover
from stand_in_shapes import CUBE_FACES, WHITE_CUBE_FACES


class FakeOpacityAtlas:
    def __init__(self, transparent=()):
        self._transparent = set(transparent)

    def is_opaque(self, name):
        return name not in self._transparent


class CullDirectionTest(unittest.TestCase):
    """A face flush against the block hull and looking outward is hidden
    outright by a neighbor that fills its own cube opaquely, so it carries the
    index of that neighbor's direction and the renderer skips it."""

    DOWN, UP, NORTH, SOUTH, WEST, EAST = range(6)

    def test_each_side_of_a_full_cube_names_the_neighbor_beyond_it(self):
        for center, normal, expected in (
            ([8, 16, 8], [0, 1, 0], self.UP),
            ([8, 0, 8], [0, -1, 0], self.DOWN),
            ([8, 8, 0], [0, 0, -1], self.NORTH),
            ([8, 8, 16], [0, 0, 1], self.SOUTH),
            ([0, 8, 8], [-1, 0, 0], self.WEST),
            ([16, 8, 8], [1, 0, 0], self.EAST),
        ):
            self.assertEqual(cull_direction(center, normal), expected, normal)

    def test_the_cull_direction_indexes_the_offset_to_that_neighbor(self):
        # the renderer walks this exact table (CULL_OFFSETS in
        # VerificationLevels.js) to find the block to ask about, so an index
        # that doesn't line up with the offsets culls against the wrong side
        self.assertEqual(CULL_DIRECTIONS[cull_direction([8, 16, 8], [0, 1, 0])], [0, 1, 0])
        self.assertEqual(CULL_DIRECTIONS[cull_direction([0, 8, 8], [-1, 0, 0])], [-1, 0, 0])

    def test_a_face_looking_into_the_block_is_not_culled(self):
        # the inside of a hollow shape - a cauldron's inner wall sits on no
        # hull plane at all, but a face on the hull looking inward (the
        # underside of a lid flush with the block top) is seen from within
        self.assertIsNone(cull_direction([8, 16, 8], [0, -1, 0]))
        self.assertIsNone(cull_direction([0, 8, 8], [1, 0, 0]))

    def test_a_face_held_off_the_hull_is_not_culled(self):
        # a cactus side sits a pixel in from the block edge; the strip of
        # block beside it stays visible however solid the neighbor is, which
        # is the case Java's own cullface flag gets wrong for our renderer
        self.assertIsNone(cull_direction([1, 8, 8], [-1, 0, 0]))
        self.assertIsNone(cull_direction([8, 15, 8], [0, 1, 0]))

    def test_a_diagonal_face_has_no_neighbor_that_can_hide_it(self):
        half = Decimal(1) / Decimal(2).sqrt()
        self.assertIsNone(cull_direction([8, 8, 0], [half, 0, -half]))


class SideCoverTest(unittest.TestCase):
    """What each face offers the neighbor pressed against it: whether it
    covers that side of the block at all, and whether it does so opaquely.
    Judged one face at a time, so a shape that only seals some of its sides
    still gets to hide a neighbor's faces on those."""

    def _cube(self, texture="block/stone", **overrides):
        return [dict({
            "center": face["center"], "width": 16, "height": 16,
            "normal": face["normal"], "texture": texture,
        }, **overrides) for face in CUBE_FACES]

    def _mark(self, faces, atlas=None):
        mark_side_cover({"minecraft:x[]": faces}, atlas or FakeOpacityAtlas())
        return faces

    def test_every_side_of_a_full_opaque_cube_covers_opaquely(self):
        faces = self._mark(self._cube())
        self.assertTrue(all(covers_side(face) for face in faces))
        self.assertTrue(all(face["opaque"] for face in faces))

    def test_one_see_through_texel_anywhere_costs_the_face_its_opacity(self):
        faces = self._mark(
            self._cube("block/glass"),
            FakeOpacityAtlas(transparent={"block/glass"}),
        )
        # still covers - a pane of glass leaves nothing of a neighbor's face
        # visible around it, only through it
        self.assertTrue(all(covers_side(face) for face in faces))
        self.assertFalse(any(face["opaque"] for face in faces))

    def test_a_slab_seals_the_side_it_covers_and_no_other(self):
        # the whole point of judging per face: the bottom of a bottom slab
        # seals the block below it completely, whatever the id "slab" as a
        # whole can say
        bottom = dict(self._cube()[1])                       # y=0, looking down
        top = dict(self._cube()[0], center=[8, 8, 8])        # the slab's own top
        self._mark([bottom, top])
        self.assertTrue(bottom["opaque"])       # flush on the hull
        self.assertFalse(covers_side(top))      # mid-block, seals nothing
        self.assertFalse(top["opaque"])

    def test_a_face_smaller_than_its_side_seals_nothing(self):
        faces = self._mark([dict(self._cube()[0], width=8)])
        self.assertFalse(covers_side(faces[0]))
        self.assertFalse(faces[0]["opaque"])

    def test_a_face_held_off_the_hull_seals_nothing(self):
        # right size, but a pixel in - the sliver of the neighbor's face
        # beside it stays visible
        faces = self._mark([dict(self._cube()[0], center=[8, 15, 8])])
        self.assertFalse(covers_side(faces[0]))
        self.assertFalse(faces[0]["opaque"])

    def test_an_unresolved_cube_covers_but_never_opaquely(self):
        # the missing-block cube is a full cube of the white swatch, which is
        # opaque - but it stands for "we don't know what this is" and is drawn
        # see-through, so it may only hide another placeholder's faces
        faces = self._mark([dict(face, texture=WHITE_TEXTURE)
                            for face in WHITE_CUBE_FACES])
        self.assertTrue(all(covers_side(face) for face in faces))
        self.assertFalse(any(face["opaque"] for face in faces))

    def test_states_of_one_id_are_judged_apart(self):
        # a top slab and a bottom slab share an id and seal opposite sides;
        # judged as one id they would intersect to nothing
        block_models = {
            "minecraft:slab[top_slot_bit=0]": [self._cube()[1]],  # y=0, down
            "minecraft:slab[top_slot_bit=1]": [self._cube()[0]],  # y=16, up
        }
        mark_side_cover(block_models, FakeOpacityAtlas())
        for faces in block_models.values():
            self.assertTrue(faces[0]["opaque"])

    def test_it_reports_how_many_faces_came_out_opaque(self):
        self.assertEqual(
            mark_side_cover({"minecraft:stone[]": self._cube()}, FakeOpacityAtlas()),
            len(CUBE_FACES),
        )


if __name__ == "__main__":
    unittest.main()
