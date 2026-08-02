import math
import unittest
from decimal import Decimal

from face_geometry import billboard_facing, billboard_roll, face_size
from rotation import rotate_vector


class FaceSizeTest(unittest.TestCase):
    def test_unrotated_up_face_reads_x_as_width_and_z_as_height(self):
        # up face texture axes: u runs +x, v runs +z
        width, height = face_size([16, 0, 4], [1, 0, 0], [0, 0, 1])
        self.assertEqual(width, 16)
        self.assertEqual(height, 4)

    def test_unrotated_west_face_reads_z_as_width_and_y_as_height(self):
        # west face texture axes: u runs +z, v runs -y
        width, height = face_size([0, 16, 4], [0, 0, 1], [0, -1, 0])
        self.assertEqual(width, 4)
        self.assertEqual(height, 16)

    def test_permuted_extent_after_an_x_axis_blockstate_rotation(self):
        # Mirrors minecraft:piston_head facing=down (x:90): a face that
        # started as the arm's "up" face (width=4 on X, height=16 on Z)
        # rotates to a horizontal, south-facing normal. x:90 swaps the Y/Z
        # extents - Y ends up holding the old Z length (16) - and rotates
        # the texture axes to match, carrying v from +z onto -y. Width still
        # reads the u axis (X, 4) and height still reads v (Y, 16), with no
        # normal-based special case involved.
        extent = [4, 16, 0]  # already rotated: x unaffected, y<-old z, z<-old y
        width, height = face_size(extent, [1, 0, 0], [0, -1, 0])
        self.assertEqual(width, 4)
        self.assertEqual(height, 16)

    def test_diagonal_extent_projects_onto_an_equally_diagonal_texture_axis(self):
        # Mirrors a cross-plant quad (e.g. short_grass) rotated 45 degrees
        # around Y: the original single horizontal length (14.4) gets split
        # across X and Z, and so does the texture's u axis. Projecting the
        # extent onto that same diagonal axis recovers the full 14.4 - the
        # raw X or Z component alone would be short by root 2.
        half = Decimal(14.4) * Decimal(math.sqrt(2) / 2)
        diagonal_u = [Decimal("0.707107"), 0, Decimal("0.707107")]
        width, height = face_size([half, 16, half], diagonal_u, [0, -1, 0])
        self.assertAlmostEqual(float(width), 14.4, places=3)
        self.assertEqual(height, 16)


class BillboardRollTest(unittest.TestCase):
    """A face's roll is how far the billboard has to spin for its texture to
    read the way Java draws it, given where the engine's own default
    orientation leaves it."""

    def test_side_faces_need_no_roll(self):
        # An unrotated Java side face reads world-up, which is exactly where
        # the engine already puts a horizontal-normal billboard - which is
        # why side textures look right today without any roll at all.
        for normal, uv_v in (
            ([0, 0, -1], [0, -1, 0]),  # north
            ([0, 0, 1], [0, -1, 0]),   # south
            ([-1, 0, 0], [0, -1, 0]),  # west
            ([1, 0, 0], [0, -1, 0]),   # east
        ):
            with self.subTest(normal=normal):
                self.assertEqual(billboard_roll(normal, uv_v), 0)

    def test_up_face_is_half_a_turn_out_from_where_the_engine_leaves_it(self):
        # Java's up face runs v along +z, so its texture reads north (-z) -
        # but a vertical-normal billboard has no world-up to orient against
        # and the engine settles on reading south instead, which is why every
        # top texture faced the same way no matter which block it belonged
        # to. Half a turn closes the gap.
        self.assertEqual(abs(billboard_roll([0, 1, 0], [0, 0, 1])), 180)

    def test_down_face_already_lands_where_java_wants_it(self):
        # Java's down face runs v along -z (the opposite of the up face, so
        # the two read in opposite directions), which happens to match the
        # engine's own fixed choice - so unlike the up face it needs no roll.
        self.assertEqual(billboard_roll([0, -1, 0], [0, 0, -1]), 0)

    def test_a_quarter_turned_up_face_rolls_a_quarter_turn(self):
        # A per-face uv rotation of 90 (or a blockstate rotation) leaves v
        # running along x instead of z, so the roll has to make up a quarter
        # turn. The sign matters and is asserted: negating a roll changes
        # what's drawn by twice the angle, so a wrong sign here lands a
        # quarter-turned face a full 180 degrees out - which is exactly how
        # it was caught, on command blocks and barrels facing east whose top
        # and bottom textures read west.
        self.assertEqual(billboard_roll([0, 1, 0], [1, 0, 0]), -90)

    def test_up_and_down_faces_of_a_turned_block_roll_opposite_ways(self):
        # The two are seen from opposite sides, so the same turn in the world
        # is opposite turns on screen. Mirrors a block turned y:90, which
        # leaves both its top and bottom textures reading east.
        east = [-1, 0, 0]  # v runs west, so the texture reads east
        self.assertEqual(billboard_roll([0, 1, 0], east), 90)
        self.assertEqual(billboard_roll([0, -1, 0], east), -90)

    def test_a_side_face_whose_texture_was_turned_upside_down_rolls_half_a_turn(self):
        # v running +y instead of -y means the texture reads downward.
        self.assertEqual(abs(billboard_roll([0, 0, 1], [0, 1, 0])), 180)

    def test_a_quarter_turned_side_face_rolls_the_opposite_way_to_a_top_face(self):
        # Mirrors minecraft:piston facing north, which Java draws straight
        # from the unrotated model: its west face carries piston_side turned
        # a quarter turn (the model's own "rotation": 270), leaving the
        # texture reading north - toward the piston's head, which is where
        # piston_side's head end belongs.
        #
        # The two face classes take opposite signs, so this has to be pinned
        # separately from the top-face cases above - the sign being shared is
        # what left every quarter-turned side face a full 180 degrees out.
        # Sides only ever rolled 0 or 180 in the blocks checked before this
        # one, and at a half turn a wrong sign is indistinguishable.
        west, reads_north = [-1, 0, 0], [0, 0, 1]  # v runs south, texture reads north
        self.assertEqual(billboard_roll(west, reads_north), 90)
        # its mirror on the far side of the block turns the other way
        east, reads_north = [1, 0, 0], [0, 0, 1]
        self.assertEqual(billboard_roll(east, reads_north), -90)


class DiagonalFaceTest(unittest.TestCase):
    """A face left pointing diagonally by an element rotation (a lever's
    handle, a lectern's rest, a tripwire hook) is the case the y-negation
    that used to produce a facing direction cannot survive: negating y is a
    reflection, and a reflection only lands back on the face's own axis when
    the normal is axis-aligned."""

    def _tilt(self, vec, degrees):
        return [float(c) for c in rotate_vector(vec, "x", degrees)]

    def test_a_diagonal_face_is_sent_the_way_it_actually_points(self):
        # y-negating this gives a direction perpendicular to the real one,
        # so the quad was drawn 90 degrees out of its own plane
        diagonal = [0, -0.707107, -0.707107]
        self.assertEqual([float(c) for c in billboard_facing(diagonal)], diagonal)

    def test_a_straight_up_or_down_face_is_still_sent_reversed(self):
        # unchanged: this is the one case the negation was ever exercised on,
        # and direction_z draws these backwards without it
        self.assertEqual([float(c) for c in billboard_facing([0, 1, 0])], [0, -1, 0])
        self.assertEqual([float(c) for c in billboard_facing([0, -1, 0])], [0, 1, 0])

    def test_a_horizontal_face_is_sent_unchanged(self):
        self.assertEqual([float(c) for c in billboard_facing([0, 0, -1])], [0, 0, -1])

    def test_a_tilted_side_face_reads_up_its_own_slope(self):
        # Tilting a north face about x carries its texture's v axis with it,
        # and world-up projected into the tilted plane tilts by exactly as
        # much - so the texture is already where the engine leaves it, at
        # every angle. Held for a lever (-45), a lectern's rest (-22.5) and
        # anything between.
        for degrees in (-22.5, -45, -67.5, 30):
            with self.subTest(degrees=degrees):
                normal = self._tilt([0, 0, -1], degrees)
                uv_v = self._tilt([0, -1, 0], degrees)
                self.assertEqual(billboard_roll(normal, uv_v), 0)

    def test_a_tilted_top_face_stays_half_a_turn_out_like_a_flat_one(self):
        # the same reasoning as the flat up face: Java's up-face v runs the
        # opposite way to the engine's own choice, and tilting turns both
        for degrees in (-22.5, -45, -67.5):
            with self.subTest(degrees=degrees):
                normal = self._tilt([0, 1, 0], degrees)
                uv_v = self._tilt([0, 0, 1], degrees)
                self.assertEqual(abs(billboard_roll(normal, uv_v)), 180)

    def test_a_skew_face_takes_a_real_angle_rather_than_collapsing(self):
        # A chain laid horizontal: its planes are turned 45 about y by the
        # model, then a quarter turn about x by the blockstate, which leaves
        # a normal skew to every axis. Measured about the y-negated normal
        # this could only ever come out 0 or 180, because that axis is not
        # perpendicular to the face's texture-up.
        normal = [0.707107, 0.707107, 0]
        uv_v = [0, 0, -1]
        self.assertEqual(billboard_roll(normal, uv_v), 90)


if __name__ == "__main__":
    unittest.main()
