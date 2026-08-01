import math
import unittest
from decimal import Decimal

from PIL import Image

from main import (
    _derive_roll,
    _facing,
    inset_by_half_texel,
    REDSTONE_POWER_TINTS,
    white_swatch,
    _merge_coincident_faces,
    _derive_width_height,
    build_block_models,
    build_face_types_and_refs,
    build_key_specs,
    project_uv,
    rekey_hanging_signs,
    WHITE_CUBE_FACES,
)
from b2j_source import parse_java_state
from rotation import rotate_vector
from texture_atlas import tinted


class FakeMcmeta:
    def __init__(self, blockstates, models):
        self._blockstates = blockstates
        self._models = models

    def exists(self, path):
        name = path[len("assets/minecraft/blockstates/"):-len(".json")]
        return name in self._blockstates

    def read_json(self, path):
        if path.startswith("assets/minecraft/blockstates/"):
            name = path[len("assets/minecraft/blockstates/"):-len(".json")]
            return self._blockstates[name]
        model_id = path[len("assets/minecraft/models/"):-len(".json")]
        return self._models[model_id]


class FakeAtlas:
    def __init__(self):
        self.added = []

    def add(self, mcmeta, name):
        self.added.append(name)


class BuildBlockModelsTest(unittest.TestCase):
    def test_resolvable_block_produces_faces_with_geometry(self):
        mcmeta = FakeMcmeta(
            blockstates={"stone": {"variants": {"": {"model": "block/stone"}}}},
            models={"block/stone": {"textures": {}, "elements": [{
                "from": [0, 0, 0], "to": [16, 16, 16],
                "faces": {"up": {"texture": "block/stone"}},
            }]}},
        )
        atlas = FakeAtlas()
        b2j = {"minecraft:stone[]": "minecraft:stone"}
        block_models = build_block_models(mcmeta, b2j, atlas)
        faces = block_models["minecraft:stone[]"]
        self.assertEqual(len(faces), 1)
        # the face's geometry is collapsed onto its own plane (y=16), not the
        # element's full 3D bounding box
        self.assertEqual(faces[0]["center"], [8, 16, 8])
        self.assertEqual(faces[0]["width"], 16)
        self.assertEqual(faces[0]["height"], 16)
        self.assertEqual(faces[0]["normal"], [0, 1, 0])
        self.assertIn("block/stone", atlas.added)

    def test_rotated_block_gets_normal_matching_its_rotated_geometry(self):
        mcmeta = FakeMcmeta(
            blockstates={"oak_log": {"variants": {
                "axis=x": {"model": "block/oak_log_horizontal", "y": 90},
            }}},
            models={"block/oak_log_horizontal": {"textures": {}, "elements": [{
                "from": [0, 0, 0], "to": [16, 16, 16],
                "faces": {"north": {"texture": "block/oak_log"}},
            }]}},
        )
        atlas = FakeAtlas()
        b2j = {"minecraft:log[axis=x]": "minecraft:oak_log[axis=x]"}
        block_models = build_block_models(mcmeta, b2j, atlas)
        faces = block_models["minecraft:log[axis=x]"]
        self.assertEqual(len(faces), 1)
        # a 90-degree y-rotation moves the "north" face onto the x=16 (east)
        # plane, so its normal must become (1,0,0), not stay (0,0,-1)
        self.assertEqual(faces[0]["normal"], [1, 0, 0])
        self.assertEqual(faces[0]["center"], [16, 8, 8])

    def test_unresolvable_block_falls_back_to_white_cube(self):
        mcmeta = FakeMcmeta(blockstates={}, models={})
        atlas = FakeAtlas()
        b2j = {"minecraft:unknown_block[]": "minecraft:unknown_block"}
        block_models = build_block_models(mcmeta, b2j, atlas)
        self.assertEqual(block_models["minecraft:unknown_block[]"], WHITE_CUBE_FACES)

    def test_java_state_override_replaces_the_mapped_java_block(self):
        # blocksB2J maps Bedrock's single flower_pot state onto an arbitrary
        # one of Java's per-plant potted_* ids, which draws that plant into
        # every pot; the override sends it to Java's empty pot instead
        mcmeta = FakeMcmeta(
            blockstates={
                "flower_pot": {"variants": {"": {"model": "block/flower_pot"}}},
                "potted_dandelion": {"variants": {"": {"model": "block/potted_dandelion"}}},
            },
            models={
                "block/flower_pot": {"textures": {}, "elements": [{
                    "from": [5, 0, 5], "to": [11, 6, 11],
                    "faces": {"up": {"texture": "block/flower_pot"}},
                }]},
                "block/potted_dandelion": {"textures": {}, "elements": [{
                    "from": [5, 0, 5], "to": [11, 16, 11],
                    "faces": {"up": {"texture": "block/dandelion"}},
                }]},
            },
        )
        atlas = FakeAtlas()
        b2j = {"minecraft:flower_pot[update_bit=0]": "minecraft:potted_dandelion[]"}
        build_block_models(mcmeta, b2j, atlas)
        self.assertIn("block/flower_pot", atlas.added)
        self.assertNotIn("block/dandelion", atlas.added)

    def test_white_cube_fallback_faces_are_flagged_as_missing(self):
        # the flag is what tells the renderer to draw see-through blue rather
        # than a solid white quad indistinguishable from a real blank block
        mcmeta = FakeMcmeta(blockstates={}, models={})
        atlas = FakeAtlas()
        b2j = {"minecraft:unknown_block[]": "minecraft:unknown_block"}
        block_models = build_block_models(mcmeta, b2j, atlas)
        for face in block_models["minecraft:unknown_block[]"]:
            self.assertTrue(face["missing"])

    def test_resolvable_block_faces_are_not_flagged_as_missing(self):
        mcmeta = FakeMcmeta(
            blockstates={"stone": {"variants": {"": {"model": "block/stone"}}}},
            models={"block/stone": {"textures": {}, "elements": [{
                "from": [0, 0, 0], "to": [16, 16, 16],
                "faces": {"up": {"texture": "block/stone"}},
            }]}},
        )
        atlas = FakeAtlas()
        b2j = {"minecraft:stone[]": "minecraft:stone"}
        block_models = build_block_models(mcmeta, b2j, atlas)
        for face in block_models["minecraft:stone[]"]:
            self.assertNotIn("missing", face)

    def test_multi_face_element_across_multiple_axes_all_get_added_to_atlas(self):
        mcmeta = FakeMcmeta(
            blockstates={"stone": {"variants": {"": {"model": "block/stone"}}}},
            models={"block/stone": {"textures": {}, "elements": [{
                "from": [0, 0, 0], "to": [16, 16, 16],
                "faces": {
                    "up": {"texture": "block/stone_top"},
                    "down": {"texture": "block/stone_bottom"},
                    "north": {"texture": "block/stone_side"},
                    "south": {"texture": "block/stone_side"},
                    "east": {"texture": "block/stone_side"},
                    "west": {"texture": "block/stone_side"},
                },
            }]}},
        )
        atlas = FakeAtlas()
        b2j = {"minecraft:stone[]": "minecraft:stone"}
        block_models = build_block_models(mcmeta, b2j, atlas)
        faces = block_models["minecraft:stone[]"]
        self.assertEqual(len(faces), 6)
        # faces preserve the source dict's insertion order: up, down, north, south, east, west
        self.assertEqual(
            [f["normal"] for f in faces],
            [[0, 1, 0], [0, -1, 0], [0, 0, -1], [0, 0, 1], [1, 0, 0], [-1, 0, 0]],
        )
        self.assertEqual(faces[0]["texture"], "block/stone_top")
        self.assertEqual(faces[1]["texture"], "block/stone_bottom")
        self.assertCountEqual(
            atlas.added,
            ["block/stone_top", "block/stone_bottom", "block/stone_side", "block/stone_side",
             "block/stone_side", "block/stone_side"],
        )

    def test_block_with_real_properties_selects_matching_variant(self):
        mcmeta = FakeMcmeta(
            blockstates={"oak_log": {"variants": {
                "axis=x": {"model": "block/oak_log_horizontal"},
                "axis=y": {"model": "block/oak_log"},
                "axis=z": {"model": "block/oak_log_horizontal"},
            }}},
            models={
                "block/oak_log_horizontal": {"textures": {}, "elements": [{
                    "from": [0, 0, 0], "to": [16, 16, 16],
                    "faces": {"north": {"texture": "block/oak_log"}},
                }]},
                "block/oak_log": {"textures": {}, "elements": [{
                    "from": [0, 0, 0], "to": [16, 16, 16],
                    "faces": {"up": {"texture": "block/oak_log_top"}},
                }]},
            },
        )
        atlas = FakeAtlas()
        b2j = {"minecraft:log[axis=x]": "minecraft:oak_log[axis=x]"}
        block_models = build_block_models(mcmeta, b2j, atlas)
        faces = block_models["minecraft:log[axis=x]"]
        self.assertEqual(len(faces), 1)
        self.assertEqual(faces[0]["texture"], "block/oak_log")
        self.assertEqual(faces[0]["normal"], [0, 0, -1])

    def test_stair_shape_is_forced_to_straight_regardless_of_b2j_value(self):
        # blocksB2J.json fills stairs' "shape" property with an arbitrary
        # placeholder ("outer_right") for every plain Bedrock stair state,
        # since Bedrock has no real neighbor-dependent shape concept - left
        # alone this picks the corner model (quarter-width top step) instead
        # of the normal straight-stair model.
        mcmeta = FakeMcmeta(
            blockstates={"oak_stairs": {"variants": {
                "facing=north,half=bottom,shape=straight": {"model": "block/oak_stairs"},
                "facing=north,half=bottom,shape=outer_right": {"model": "block/oak_stairs_outer"},
            }}},
            models={
                "block/oak_stairs": {"textures": {}, "elements": [{
                    "from": [0, 0, 0], "to": [16, 16, 16],
                    "faces": {"up": {"texture": "block/oak_planks"}},
                }]},
                "block/oak_stairs_outer": {"textures": {}, "elements": [{
                    "from": [0, 0, 0], "to": [8, 16, 8],
                    "faces": {"up": {"texture": "block/oak_planks"}},
                }]},
            },
        )
        atlas = FakeAtlas()
        b2j = {
            "minecraft:oak_stairs[weirdo_direction=3]":
                "minecraft:oak_stairs[facing=north,half=bottom,shape=outer_right]",
        }
        block_models = build_block_models(mcmeta, b2j, atlas)
        faces = block_models["minecraft:oak_stairs[weirdo_direction=3]"]
        self.assertEqual(faces[0]["width"], 16)


class DeriveWidthHeightTest(unittest.TestCase):
    def test_unrotated_up_face_reads_x_as_width_and_z_as_height(self):
        # up face texture axes: u runs +x, v runs +z
        width, height = _derive_width_height([16, 0, 4], [1, 0, 0], [0, 0, 1])
        self.assertEqual(width, 16)
        self.assertEqual(height, 4)

    def test_unrotated_west_face_reads_z_as_width_and_y_as_height(self):
        # west face texture axes: u runs +z, v runs -y
        width, height = _derive_width_height([0, 16, 4], [0, 0, 1], [0, -1, 0])
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
        width, height = _derive_width_height(extent, [1, 0, 0], [0, -1, 0])
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
        width, height = _derive_width_height([half, 16, half], diagonal_u, [0, -1, 0])
        self.assertAlmostEqual(float(width), 14.4, places=3)
        self.assertEqual(height, 16)


class DeriveRollTest(unittest.TestCase):
    """A face's roll is how far the billboard has to spin for its texture to
    read the way Java draws it, given where the engine's own default
    orientation leaves it (see the constants at the top of main.py)."""

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
                self.assertEqual(_derive_roll(normal, uv_v), 0)

    def test_up_face_is_half_a_turn_out_from_where_the_engine_leaves_it(self):
        # This is the reported bug. Java's up face runs v along +z, so its
        # texture reads north (-z) - but a vertical-normal billboard has no
        # world-up to orient against and the engine settles on reading south
        # instead, which is why every top texture faces the same way no
        # matter which block it belongs to. Half a turn closes the gap.
        self.assertEqual(abs(_derive_roll([0, 1, 0], [0, 0, 1])), 180)

    def test_down_face_already_lands_where_java_wants_it(self):
        # Java's down face runs v along -z (the opposite of the up face, so
        # the two read in opposite directions), which happens to match the
        # engine's own fixed choice - so unlike the up face it needs no roll.
        self.assertEqual(_derive_roll([0, -1, 0], [0, 0, -1]), 0)

    def test_a_quarter_turned_up_face_rolls_a_quarter_turn(self):
        # A per-face uv rotation of 90 (or a blockstate rotation) leaves v
        # running along x instead of z, so the roll has to make up a quarter
        # turn. The sign matters and is asserted: negating a roll changes
        # what's drawn by twice the angle, so a wrong sign here lands a
        # quarter-turned face a full 180 degrees out - which is exactly how
        # it was caught, on command blocks and barrels facing east whose top
        # and bottom textures read west.
        self.assertEqual(_derive_roll([0, 1, 0], [1, 0, 0]), -90)

    def test_up_and_down_faces_of_a_turned_block_roll_opposite_ways(self):
        # The two are seen from opposite sides, so the same turn in the world
        # is opposite turns on screen. Mirrors a block turned y:90, which
        # leaves both its top and bottom textures reading east.
        east = [-1, 0, 0]  # v runs west, so the texture reads east
        self.assertEqual(_derive_roll([0, 1, 0], east), 90)
        self.assertEqual(_derive_roll([0, -1, 0], east), -90)

    def test_a_side_face_whose_texture_was_turned_upside_down_rolls_half_a_turn(self):
        # v running +y instead of -y means the texture reads downward.
        self.assertEqual(abs(_derive_roll([0, 0, 1], [0, 1, 0])), 180)

    def test_a_quarter_turned_side_face_rolls_the_opposite_way_to_a_top_face(self):
        # Mirrors minecraft:piston facing north, which Java draws straight
        # from the unrotated model: its west face carries piston_side turned
        # a quarter turn (the model's own "rotation": 270), leaving the
        # texture reading north - toward the piston's head, which is where
        # piston_side's head end belongs.
        #
        # The two face classes take opposite signs (see the handedness
        # constants in main.py), so this has to be pinned separately from the
        # top-face cases above - the sign being shared is what left every
        # quarter-turned side face a full 180 degrees out. Sides only ever
        # rolled 0 or 180 in the blocks checked before this one, and at a
        # half turn a wrong sign is indistinguishable.
        west, reads_north = [-1, 0, 0], [0, 0, 1]  # v runs south, texture reads north
        self.assertEqual(_derive_roll(west, reads_north), 90)
        # its mirror on the far side of the block turns the other way
        east, reads_north = [1, 0, 0], [0, 0, 1]
        self.assertEqual(_derive_roll(east, reads_north), -90)


class FacingInTheFaceTypeTableTest(unittest.TestCase):
    def test_an_up_face_is_published_pointing_the_other_way(self):
        block_models = {"a": [{
            "center": [8, 16, 8], "width": 16, "height": 16, "normal": [0, 1, 0],
            "roll": 180, "tintindex": -1, "uv": {"x": 0, "y": 0, "w": 16, "h": 16},
        }]}
        face_types, result = build_face_types_and_refs(block_models)
        self.assertEqual(face_types[result["a"][0]]["facing"], [0, -1, 0])

    def test_a_diagonal_face_is_published_pointing_where_it_looks(self):
        normal = [0, Decimal("-0.707107"), Decimal("-0.707107")]
        block_models = {"a": [{
            "center": [8, 8, 8], "width": 2, "height": 10, "normal": normal,
            "roll": 0, "tintindex": -1, "uv": {"x": 0, "y": 0, "w": 16, "h": 16},
        }]}
        face_types, result = build_face_types_and_refs(block_models)
        self.assertEqual(face_types[result["a"][0]]["facing"], normal)


class DiagonalFaceTest(unittest.TestCase):
    """A face left pointing diagonally by an element rotation (a lever's
    handle, a lectern's rest, a tripwire hook) is the case the y-negation
    that produces a facing direction cannot survive: negating y is a
    reflection, and a reflection only lands back on the face's own axis when
    the normal is axis-aligned."""

    def _tilt(self, vec, degrees):
        return [float(c) for c in rotate_vector(vec, "x", degrees)]

    def test_a_diagonal_face_is_sent_the_way_it_actually_points(self):
        # y-negating this gives a direction perpendicular to the real one,
        # so the quad was drawn 90 degrees out of its own plane
        diagonal = [0, -0.707107, -0.707107]
        self.assertEqual([float(c) for c in _facing(diagonal)], diagonal)

    def test_a_straight_up_or_down_face_is_still_sent_reversed(self):
        # unchanged: this is the one case the negation was ever exercised on,
        # and direction_z draws these backwards without it
        self.assertEqual([float(c) for c in _facing([0, 1, 0])], [0, -1, 0])
        self.assertEqual([float(c) for c in _facing([0, -1, 0])], [0, 1, 0])

    def test_a_horizontal_face_is_sent_unchanged(self):
        self.assertEqual([float(c) for c in _facing([0, 0, -1])], [0, 0, -1])

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
                self.assertEqual(_derive_roll(normal, uv_v), 0)

    def test_a_tilted_top_face_stays_half_a_turn_out_like_a_flat_one(self):
        # the same reasoning as the flat up face: Java's up-face v runs the
        # opposite way to the engine's own choice, and tilting turns both
        for degrees in (-22.5, -45, -67.5):
            with self.subTest(degrees=degrees):
                normal = self._tilt([0, 1, 0], degrees)
                uv_v = self._tilt([0, 0, 1], degrees)
                self.assertEqual(abs(_derive_roll(normal, uv_v)), 180)

    def test_a_skew_face_takes_a_real_angle_rather_than_collapsing(self):
        # A chain laid horizontal: its planes are turned 45 about y by the
        # model, then a quarter turn about x by the blockstate, which leaves
        # a normal skew to every axis. Measured about the y-negated normal
        # this could only ever come out 0 or 180, because that axis is not
        # perpendicular to the face's texture-up.
        normal = [0.707107, 0.707107, 0]
        uv_v = [0, 0, -1]
        self.assertEqual(_derive_roll(normal, uv_v), 90)


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
        merged = _merge_coincident_faces(faces)
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0]["texture"],
                         "block/grass_block_side^block/grass_block_side_overlay")

    def test_the_same_texture_drawn_twice_collapses_to_one_face(self):
        faces = [self._face("block/pink_petals"), self._face("block/pink_petals")]
        merged = _merge_coincident_faces(faces)
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0]["texture"], "block/pink_petals")

    def test_layer_order_follows_the_order_the_faces_arrive_in(self):
        merged = _merge_coincident_faces([self._face("a"), self._face("b"), self._face("c")])
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
                self.assertEqual(len(_merge_coincident_faces(faces)), 2)


class ParticleTextureFallbackTest(unittest.TestCase):
    """A block whose model draws nothing at all (barrier, light, the fluids)
    is not broken data - Java just renders it some other way. Where the model
    names a texture we can honestly stand in with, draw a cube of it rather
    than the see-through blue 'we have no idea' cube."""

    def _mcmeta(self, particle, block="barrier"):
        return FakeMcmeta(
            blockstates={block: {"variants": {"": {"model": f"block/{block}"}}}},
            models={f"block/{block}": {"textures": {"particle": particle}}},
        )

    def _faces(self, particle, block="barrier"):
        atlas = FakeAtlas()
        b2j = {f"minecraft:{block}[]": f"minecraft:{block}"}
        faces = build_block_models(self._mcmeta(particle, block), b2j, atlas)[f"minecraft:{block}[]"]
        return faces, atlas

    def test_item_texture_becomes_a_full_cube_of_that_texture(self):
        faces, atlas = self._faces("item/barrier")
        self.assertEqual(len(faces), 6)
        self.assertEqual({face["texture"] for face in faces}, {"item/barrier"})
        self.assertIn("item/barrier", atlas.added)
        # it stood in for a block Java draws deliberately, so it isn't the
        # unresolved-data cube and must not be flagged as one
        for face in faces:
            self.assertFalse(face.get("missing", False))
        self.assertEqual({tuple(face["normal"]) for face in faces}, {
            (0, 1, 0), (0, -1, 0), (0, 0, -1), (0, 0, 1), (1, 0, 0), (-1, 0, 0),
        })

    def test_fluids_stand_in_with_their_still_texture(self):
        faces, _ = self._faces("block/water_still", block="water")
        self.assertEqual({face["texture"] for face in faces}, {"block/water_still"})

    def test_a_bubble_column_stands_in_with_the_bubble_particle(self):
        # its model is block/water, so the particle it names is water_still -
        # the bubbles are particles, not part of any model
        faces, atlas = self._faces("block/water_still", block="bubble_column")
        self.assertEqual({face["texture"] for face in faces}, {"particle/bubble"})
        self.assertIn("particle/bubble", atlas.added)

    def test_a_block_texture_on_anything_else_stays_a_missing_cube(self):
        # a skull's particle is block/soul_sand: standing in with it would
        # draw a soul sand cube and hide that the block entity is unmodelled
        faces, _ = self._faces("block/soul_sand", block="skeleton_skull")
        self.assertEqual(faces, WHITE_CUBE_FACES)

    def test_a_model_with_no_particle_at_all_stays_a_missing_cube(self):
        atlas = FakeAtlas()
        mcmeta = FakeMcmeta(
            blockstates={"barrier": {"variants": {"": {"model": "block/barrier"}}}},
            models={"block/barrier": {"textures": {}}},
        )
        block_models = build_block_models(mcmeta, {"minecraft:barrier[]": "minecraft:barrier"}, atlas)
        self.assertEqual(block_models["minecraft:barrier[]"], WHITE_CUBE_FACES)


class FluidDepthTest(unittest.TestCase):
    """A fluid's box gets shorter as its level rises: a source stands 4 pixels
    below the block top, the shallowest flow 1 pixel above the block floor.
    Java builds this in the fluid renderer rather than in a model, so it has
    to be reproduced here (see _fluid_height)."""

    def _faces(self, block="water", level=None, texture="block/water_still"):
        atlas = FakeAtlas()
        mcmeta = FakeMcmeta(
            blockstates={block: {"variants": {"": {"model": f"block/{block}"}}}},
            models={f"block/{block}": {"textures": {"particle": texture}}},
        )
        properties = "" if level is None else f"[level={level}]"
        b2j = {"bedrock[]": f"minecraft:{block}{properties}"}
        return build_block_models(mcmeta, b2j, atlas)["bedrock[]"]

    def _top(self, faces):
        top, = [face for face in faces if tuple(face["normal"]) == (0, 1, 0)]
        return top

    def _sides(self, faces):
        return [face for face in faces if face["normal"][1] == 0]

    def test_a_source_stands_four_pixels_below_the_block_top(self):
        self.assertEqual(self._top(self._faces(level=0))["center"][1], 12)

    def test_the_shallowest_flow_stands_one_pixel_above_the_block_floor(self):
        self.assertEqual(self._top(self._faces(level=7))["center"][1], 1)

    def test_height_falls_with_every_step_of_level(self):
        tops = [self._top(self._faces(level=level))["center"][1] for level in range(8)]
        self.assertEqual(tops, sorted(tops, reverse=True))
        self.assertEqual(len(set(tops)), 8)

    def test_the_sides_span_the_box_and_sample_the_texture_under_its_surface(self):
        # a dropping surface must not stretch or slide the texture, so a short
        # side shows the strip that was already against the block floor
        for face in self._sides(self._faces(level=7)):
            with self.subTest(normal=tuple(face["normal"])):
                self.assertEqual(face["height"], 1)
                self.assertEqual(face["center"][1], Decimal("0.5"))
                self.assertEqual(face["uv"], [0, 15, 16, 16])
                self.assertEqual(face["width"], 16)

    def test_the_floor_stays_on_the_block_floor(self):
        bottom, = [face for face in self._faces(level=5) if tuple(face["normal"]) == (0, -1, 0)]
        self.assertEqual(bottom["center"], [8, 0, 8])
        self.assertEqual(bottom["uv"], [0, 0, 16, 16])

    def test_a_falling_fluid_fills_the_block(self):
        # levels 8-15 take their height from the fluid above rather than from
        # their own level, and a preview block has no neighbors to read
        for level in range(8, 16):
            with self.subTest(level=level):
                faces = self._faces(level=level)
                self.assertEqual(self._top(faces)["center"][1], 16)
                self.assertEqual({face["height"] for face in faces}, {16})

    def test_lava_shrinks_the_same_way(self):
        faces = self._faces(block="lava", level=0, texture="block/lava_still")
        self.assertEqual(self._top(faces)["center"][1], 12)

    def test_a_bubble_column_stays_a_full_cube(self):
        faces = self._faces(block="bubble_column")
        self.assertEqual(self._top(faces)["center"][1], 16)

    def test_a_light_blocks_level_is_brightness_not_depth(self):
        # minecraft:light[level=15] stands in with its item icon; read as a
        # depth it would leave the block lying in a puddle on the floor
        faces = self._faces(block="light", level=15, texture="item/light")
        self.assertEqual(self._top(faces)["center"][1], 16)
        self.assertEqual({face["height"] for face in faces}, {16})


class RedstonePowerTintTest(unittest.TestCase):
    def _mcmeta(self):
        return FakeMcmeta(
            blockstates={"redstone_wire": {"variants": {"": {"model": "block/redstone_dust_dot"}}}},
            models={"block/redstone_dust_dot": {"textures": {}, "elements": [{
                "from": [0, 0, 0], "to": [16, 0, 16],
                "faces": {
                    "up": {"texture": "block/redstone_dust_dot", "tintindex": 0},
                    # the dot model's overlay layer carries no tintindex, so
                    # Java draws it untinted whatever the power is
                    "down": {"texture": "block/redstone_dust_overlay"},
                },
            }]}},
        )

    def _added(self, power):
        atlas = FakeAtlas()
        b2j = {f"minecraft:redstone_wire[redstone_signal={power}]":
               f"minecraft:redstone_wire[east=none,north=none,power={power},south=none,west=none]"}
        build_block_models(self._mcmeta(), b2j, atlas)
        return atlas.added

    def test_ramp_matches_javas_colors_for_every_power_level(self):
        # RedStoneWireBlock's ramp: r = f*0.6 + (0.4 if f else 0.3),
        # g = clamp(f*f*0.7 - 0.5), b = clamp(f*f*0.6 - 0.7), f = power/15
        self.assertEqual(len(REDSTONE_POWER_TINTS), 16)
        self.assertEqual(REDSTONE_POWER_TINTS[0], (77, 0, 0))
        self.assertEqual(REDSTONE_POWER_TINTS[15], (255, 51, 0))
        reds = [tint[0] for tint in REDSTONE_POWER_TINTS]
        self.assertEqual(reds, sorted(reds))
        self.assertEqual(len(set(REDSTONE_POWER_TINTS)), 16)

    def test_tinted_face_asks_the_atlas_for_its_own_power_level_color(self):
        added = self._added(15)
        self.assertIn(tinted("block/redstone_dust_dot", REDSTONE_POWER_TINTS[15]), added)

    def test_two_power_levels_ask_for_different_textures(self):
        self.assertNotEqual(
            [n for n in self._added(0) if "redstone_dust_dot" in n],
            [n for n in self._added(15) if "redstone_dust_dot" in n],
        )

    def test_a_face_without_a_tintindex_is_left_untinted(self):
        self.assertIn("block/redstone_dust_overlay", self._added(15))

    def test_blocks_that_arent_state_tinted_keep_their_plain_texture_name(self):
        mcmeta = FakeMcmeta(
            blockstates={"stone": {"variants": {"": {"model": "block/stone"}}}},
            models={"block/stone": {"textures": {}, "elements": [{
                "from": [0, 0, 0], "to": [16, 16, 16],
                "faces": {"up": {"texture": "block/stone", "tintindex": 0}},
            }]}},
        )
        atlas = FakeAtlas()
        build_block_models(mcmeta, {"minecraft:stone[]": "minecraft:stone"}, atlas)
        self.assertEqual(atlas.added, ["block/stone"])


class WhiteSwatchTest(unittest.TestCase):
    def test_swatch_is_a_solid_block_of_texels_not_a_lone_one(self):
        # a lone texel has nothing but the atlas's transparent gaps around it,
        # and the renderer's filtering averages a magnified quad's edges with
        # whatever neighbors it finds - which faded the missing-block cube's
        # face edges out until they no longer met (#18)
        swatch = white_swatch(Image.new("RGBA", (1, 1), (255, 255, 255, 255)))
        self.assertGreaterEqual(min(swatch.size), 16)
        colors = swatch.convert("RGBA").getcolors()
        self.assertEqual(colors, [(swatch.width * swatch.height, (255, 255, 255, 255))])

    def test_swatch_size_is_a_power_of_two_so_its_mips_stay_solid(self):
        # every mip level halves the swatch; an odd size would start averaging
        # in the neighboring texture instead of only white
        size = white_swatch(Image.new("RGBA", (1, 1), (255, 255, 255, 255))).width
        self.assertEqual(size & (size - 1), 0)

    def test_inset_rect_samples_strictly_inside_the_swatch(self):
        # half a texel in on every side, so the outermost points sampled are
        # swatch texel centers rather than the boundary it shares with
        # whatever got packed next to it
        rect = inset_by_half_texel({"x": 576, "y": 544, "w": 16, "h": 16})
        self.assertEqual(rect, {
            "x": Decimal("576.5"), "y": Decimal("544.5"),
            "w": Decimal("15"), "h": Decimal("15"),
        })
        for value in rect.values():
            self.assertNotIsInstance(value, float)


class ProjectUvTest(unittest.TestCase):
    def _face(self, texture, uv=None):
        uv = uv or [0, 0, 16, 16]
        return {
            "texture": texture, "uv": uv,
            "center": [8, 16, 8], "width": 16, "height": 16, "normal": [0, 1, 0],
        }

    def test_replaces_texture_name_with_atlas_pixel_rect(self):
        block_models = {"k": [self._face("block/stone")]}
        atlas_manifest = {"block/stone": {"x": 10, "y": 20, "w": 16, "h": 16}}
        result = project_uv(block_models, atlas_manifest)
        self.assertEqual(result["k"][0]["uv"], {"x": 10, "y": 20, "w": 16, "h": 16})
        self.assertNotIn("texture", result["k"][0])
        # a plain-int uv rect (e.g. WHITE_CUBE_FACES's literal [0, 0, 16, 16])
        # must not produce a native float - js_data.render() can't serialize
        # one, and int/16 in Python 3 is a float even when evenly divisible
        for value in result["k"][0]["uv"].values():
            self.assertNotIsInstance(value, float)

    def test_missing_texture_falls_back_to_white_rect_and_is_flagged(self):
        block_models = {"k": [self._face("block/nonexistent")]}
        atlas_manifest = {"white": {"x": 0, "y": 0, "w": 16, "h": 16}}
        result = project_uv(block_models, atlas_manifest)
        self.assertEqual(result["k"][0]["uv"], {"x": 0, "y": 0, "w": 16, "h": 16})
        # geometry resolved but the texture didn't, so this face alone is
        # unresolved - the rest of the block still draws normally
        self.assertTrue(result["k"][0]["missing"])

    def test_a_face_whose_texture_packed_fine_is_not_flagged_missing(self):
        block_models = {"k": [self._face("block/stone")]}
        atlas_manifest = {
            "block/stone": {"x": 10, "y": 20, "w": 16, "h": 16},
            "white": {"x": 0, "y": 0, "w": 16, "h": 16},
        }
        result = project_uv(block_models, atlas_manifest)
        self.assertNotIn("missing", result["k"][0])

    def test_multiple_faces_across_multiple_blocks_each_project_independently(self):
        block_models = {
            "a": [self._face("block/stone"), self._face("block/dirt")],
            "b": [self._face("block/dirt")],
        }
        atlas_manifest = {
            "block/stone": {"x": 0, "y": 0, "w": 16, "h": 16},
            "block/dirt": {"x": 16, "y": 0, "w": 16, "h": 16},
        }
        result = project_uv(block_models, atlas_manifest)
        self.assertEqual(result["a"][0]["uv"], {"x": 0, "y": 0, "w": 16, "h": 16})
        self.assertEqual(result["a"][1]["uv"], {"x": 16, "y": 0, "w": 16, "h": 16})
        self.assertEqual(result["b"][0]["uv"], {"x": 16, "y": 0, "w": 16, "h": 16})
        for faces in result.values():
            for face in faces:
                self.assertNotIn("texture", face)

    def test_partial_face_uv_maps_to_a_proportional_sub_rect_not_the_whole_texture(self):
        # A fence post's narrow east/west faces only sample a thin strip of
        # the texture (e.g. Java uv [7, 0, 9, 16], a 2-of-16-wide strip) -
        # using the whole texture's rect would squish it into that strip.
        block_models = {"k": [self._face("block/oak_planks", uv=[7, 0, 9, 16])]}
        atlas_manifest = {"block/oak_planks": {"x": 100, "y": 200, "w": 16, "h": 16}}
        result = project_uv(block_models, atlas_manifest)
        self.assertEqual(result["k"][0]["uv"], {"x": 100 + 7, "y": 200, "w": 2, "h": 16})

    def test_partial_face_uv_scales_with_a_non_16px_packed_texture(self):
        # the atlas rect reflects the texture's real packed pixel size, which
        # may not be 16x16 (e.g. a resource-pack override) - the 0-16 Java uv
        # sub-rect is still proportional to that actual size.
        block_models = {"k": [self._face("block/oak_planks", uv=[8, 0, 16, 16])]}
        atlas_manifest = {"block/oak_planks": {"x": 0, "y": 0, "w": 32, "h": 32}}
        result = project_uv(block_models, atlas_manifest)
        self.assertEqual(result["k"][0]["uv"], {"x": 16, "y": 0, "w": 16, "h": 32})

    def test_uv_rect_dimensions_come_straight_off_the_raw_uv_in_u_v_order(self):
        # Mirrors an oak_button rotated to mount on a wall (x:90): the raw
        # java uv is [5, 6, 11, 10], 6 along u and 4 along v. Those stay
        # attached to u and v no matter how the face is rotated, because the
        # quad's own width/height were measured along those same two axes
        # (see DeriveWidthHeightTest) - so the rect never needs transposing
        # here, and reordering it would be what breaks the pairing.
        block_models = {"k": [self._face("block/oak_button", uv=[5, 6, 11, 10])]}
        atlas_manifest = {"block/oak_button": {"x": 0, "y": 0, "w": 16, "h": 16}}
        result = project_uv(block_models, atlas_manifest)
        self.assertEqual(result["k"][0]["uv"]["w"], 6)
        self.assertEqual(result["k"][0]["uv"]["h"], 4)


class BuildFaceTypesAndRefsTest(unittest.TestCase):
    def _face(self, center, width=16, height=16, normal=None, roll=0, tintindex=-1, uv=None):
        return {
            "center": center, "width": width, "height": height, "normal": normal or [0, 1, 0],
            "roll": roll, "tintindex": tintindex, "uv": uv or {"x": 0, "y": 0, "w": 16, "h": 16},
        }

    def test_identical_full_descriptor_across_different_blocks_gets_same_index(self):
        block_models = {
            "a": [self._face([8, 16, 8])],
            "b": [self._face([8, 16, 8])],
        }
        face_types, result = build_face_types_and_refs(block_models)
        self.assertEqual(result["a"][0], result["b"][0])
        self.assertEqual(len(face_types), 1)

    def test_different_shapes_get_different_indices(self):
        block_models = {
            "a": [self._face([8, 16, 8])],
            "b": [self._face([4, 16, 8], width=8)],
        }
        face_types, result = build_face_types_and_refs(block_models)
        self.assertNotEqual(result["a"][0], result["b"][0])
        self.assertEqual(len(face_types), 2)

    def test_different_uv_gets_different_indices_even_with_same_shape(self):
        block_models = {
            "a": [self._face([8, 16, 8], uv={"x": 0, "y": 0, "w": 16, "h": 16})],
            "b": [self._face([8, 16, 8], uv={"x": 16, "y": 0, "w": 16, "h": 16})],
        }
        face_types, result = build_face_types_and_refs(block_models)
        self.assertNotEqual(result["a"][0], result["b"][0])
        self.assertEqual(len(face_types), 2)

    def test_block_face_lists_become_flat_lists_of_plain_integers(self):
        block_models = {
            "a": [self._face([8, 16, 8]), self._face([4, 16, 8], width=8)],
        }
        _face_types, result = build_face_types_and_refs(block_models)
        self.assertEqual(result["a"], [0, 1])
        for ref in result["a"]:
            self.assertIsInstance(ref, int)

    def test_a_missing_face_never_shares_a_face_type_with_an_identical_intact_one(self):
        # both draw the same white quad, so every value they dedup on matches;
        # only the flag separates them, and merging would make an unresolved
        # face render as a normal one (or the reverse)
        block_models = {
            "a": [self._face([8, 16, 8])],
            "b": [dict(self._face([8, 16, 8]), missing=True)],
        }
        face_types, result = build_face_types_and_refs(block_models)
        self.assertNotEqual(result["a"][0], result["b"][0])
        self.assertNotIn("missing", face_types[result["a"][0]])
        self.assertTrue(face_types[result["b"][0]]["missing"])

    def test_face_types_table_reproduces_original_face_descriptor(self):
        block_models = {
            "a": [self._face(
                [1, 2, 3], width=3, height=4, normal=[1, 0, 0], roll=90, tintindex=0,
                uv={"x": 1, "y": 2, "w": 3, "h": 4},
            )],
        }
        face_types, result = build_face_types_and_refs(block_models)
        face_type = face_types[result["a"][0]]
        self.assertEqual(face_type["center"], [1, 2, 3])
        self.assertEqual(face_type["width"], 3)
        self.assertEqual(face_type["height"], 4)
        # the table carries the direction to point the billboard, resolved
        # from the face's normal (identical to it for anything but a face
        # pointing straight up or down - see _facing)
        self.assertEqual(face_type["facing"], [1, 0, 0])
        self.assertNotIn("normal", face_type)
        self.assertEqual(face_type["roll"], 90)
        self.assertEqual(face_type["tintindex"], 0)
        self.assertEqual(face_type["uv"], {"x": 1, "y": 2, "w": 3, "h": 4})


if __name__ == "__main__":
    unittest.main()


class HangingSignRekeyTest(unittest.TestCase):
    """blocksB2J lists one Bedrock permutation per Java state, so it names all
    four of a hanging sign's Bedrock states even though Bedrock only reads two
    of them at a time, and fills the rest in with values a live sign doesn't
    use. Rekeying the entries to name only the states that decide the model
    lets BlockModelLookup's partial match find them (see rekey_hanging_signs)."""

    # gsd is Java's 16-step rotation, 0 south turning clockwise; only its four
    # cardinals have a facing_direction, and the mapping data pairs everything
    # else with north
    CARDINALS = {"0": ("3", "south"), "4": ("4", "west"), "8": ("2", "north"), "12": ("5", "east")}

    def _b2j(self, block="acacia_hanging_sign"):
        b2j = {}
        for gsd in range(16):
            fd = self.CARDINALS.get(str(gsd), ("2",))[0]
            for attached_bit, attached in (("0", "false"), ("1", "true")):
                key = (f"minecraft:{block}[attached_bit={attached_bit},facing_direction={fd},"
                       f"ground_sign_direction={gsd},hanging=1]")
                b2j[key] = f"minecraft:{block}[attached={attached},rotation={gsd},waterlogged=false]"
        for gsd, (fd, facing) in self.CARDINALS.items():
            key = (f"minecraft:{block}[attached_bit=1,facing_direction={fd},"
                   f"ground_sign_direction={gsd},hanging=0]")
            b2j[key] = f"minecraft:{block.replace('_hanging', '_wall_hanging')}[facing={facing},waterlogged=false]"
        return b2j

    def test_a_wall_sign_is_keyed_on_its_facing_alone(self):
        # the mapping data only ever pairs a wall sign with attached_bit=1 and
        # a ground_sign_direction matching its facing; a live one carries
        # neither, so requiring them to match rejected every wall sign
        rekeyed = rekey_hanging_signs(self._b2j())
        self.assertEqual(
            rekeyed["minecraft:acacia_hanging_sign[facing_direction=3,hanging=0]"],
            "minecraft:acacia_wall_hanging_sign[facing=south,waterlogged=false]",
        )

    def test_an_attached_ceiling_sign_is_keyed_on_its_rotation(self):
        # attached_bit=1 is the case where Bedrock does read
        # ground_sign_direction, so all 16 rotations survive - it's
        # facing_direction that a live sign leaves at 0
        rekeyed = rekey_hanging_signs(self._b2j())
        self.assertEqual(
            rekeyed["minecraft:acacia_hanging_sign[attached_bit=1,ground_sign_direction=6,hanging=1]"],
            "minecraft:acacia_hanging_sign[attached=true,rotation=6,waterlogged=false]",
        )

    def test_a_free_ceiling_sign_takes_its_rotation_from_its_facing(self):
        # with attached_bit=0 Bedrock reads facing_direction instead, so the
        # sign only has the four cardinal rotations - and the mapping data's
        # wall entries are what say which rotation a facing means
        rekeyed = rekey_hanging_signs(self._b2j())
        self.assertEqual(
            rekeyed["minecraft:acacia_hanging_sign[attached_bit=0,facing_direction=2,hanging=1]"],
            "minecraft:acacia_hanging_sign[attached=false,rotation=8,waterlogged=false]",
        )

    def test_every_rekeyed_entry_names_only_the_states_bedrock_reads(self):
        rekeyed = rekey_hanging_signs(self._b2j())
        self.assertEqual(len(rekeyed), 24)  # 4 wall + 16 attached + 4 free
        for key in rekeyed:
            props = set(parse_java_state(key)[1])
            self.assertIn(props, [
                {"facing_direction", "hanging"},
                {"attached_bit", "ground_sign_direction", "hanging"},
                {"attached_bit", "facing_direction", "hanging"},
            ], key)

    def test_blocks_that_are_not_hanging_signs_pass_through_untouched(self):
        b2j = {"minecraft:stone[stone_type=stone]": "minecraft:stone"}
        self.assertEqual(rekey_hanging_signs(dict(b2j)), b2j)

    def test_a_wall_sign_facing_the_data_never_pairs_with_a_rotation_is_an_error(self):
        # the free-hanging keys are built from the wall entries' facings, so
        # data that stopped providing them must not silently lose signs
        b2j = {k: v for k, v in self._b2j().items() if "hanging=0" not in k}
        with self.assertRaises(ValueError):
            rekey_hanging_signs(b2j)


class BuildKeySpecsTest(unittest.TestCase):
    """The renderer used to build this index itself, on first use, by
    reparsing every key in blockModels - then scan a block's entries for the
    most specific one whose properties were a subset of the live states.
    build_key_specs settles all of that here, leaving the renderer a key to
    build and one lookup to do (see BlockModelLookup)."""

    def _lookup(self, specs, rekeyed, block_id, states):
        """What BlockModelLookup does with the emitted data: try each shape,
        most specific first, and take the first key that hits."""
        spec = specs.get(block_id)
        if spec is None:
            return None
        for shape in spec["props"]:
            if not all(name in states for name in shape):
                continue
            key = f"{block_id}[{','.join(f'{n}={states[n]}' for n in shape)}]"
            if key in rekeyed:
                return rekeyed[key]
        return None

    def test_a_property_every_entry_agrees_on_is_dropped_from_the_key(self):
        # update_bit is a Bedrock state Java has no equivalent for, so
        # blocksB2J maps one value of it and the model is the same either
        # way. It can't choose between entries, so it can't belong in the key.
        specs, rekeyed = build_key_specs({
            "minecraft:oak_leaves[persistent_bit=0,update_bit=0]": [1],
            "minecraft:oak_leaves[persistent_bit=1,update_bit=0]": [2],
        })
        self.assertEqual(specs["minecraft:oak_leaves"]["props"], [["persistent_bit"]])
        self.assertEqual(sorted(rekeyed), [
            "minecraft:oak_leaves[persistent_bit=0]",
            "minecraft:oak_leaves[persistent_bit=1]",
        ])

    def test_a_block_whose_properties_all_agree_is_keyed_on_none_of_them(self):
        specs, rekeyed = build_key_specs({"minecraft:stone[stone_type=stone]": [1]})
        self.assertEqual(specs["minecraft:stone"]["props"], [[]])
        self.assertEqual(rekeyed, {"minecraft:stone[]": [1]})

    def test_dropping_agreed_properties_never_merges_two_entries(self):
        # the guarantee the whole reduction rests on: two entries that differ
        # in a property make that property disagree, so it stays in the key
        specs, rekeyed = build_key_specs({
            "minecraft:x[a=0,b=0]": [1],
            "minecraft:x[a=1,b=0]": [2],
            "minecraft:x[a=2,b=0]": [3],
        })
        self.assertEqual(specs["minecraft:x"]["props"], [["a"]])
        self.assertEqual(len(rekeyed), 3)

    def test_two_entries_reducing_to_one_key_with_different_models_is_an_error(self):
        # can't arise from properties alone, but a future Bedrock version
        # reshaping the data must fail the bake rather than silently drop a
        # model the renderer would then never draw
        block_models = {
            "minecraft:x[a=0]": [1],
            "minecraft:x[a=0,b=0]": [2],
        }
        with self.assertRaises(ValueError):
            build_key_specs(block_models)

    # The one block whose entries don't all name the same properties (see
    # rekey_hanging_signs): hung under a block it is turned by
    # ground_sign_direction, hung off the side of one by facing_direction,
    # and a wall sign names neither attachment nor a rotation.
    def _hanging_sign_models(self):
        return {
            "minecraft:oak_hanging_sign[attached_bit=0,facing_direction=2,hanging=1]": [1],
            "minecraft:oak_hanging_sign[attached_bit=0,facing_direction=3,hanging=1]": [2],
            "minecraft:oak_hanging_sign[attached_bit=1,ground_sign_direction=0,hanging=1]": [3],
            "minecraft:oak_hanging_sign[attached_bit=1,ground_sign_direction=1,hanging=1]": [4],
            "minecraft:oak_hanging_sign[facing_direction=2,hanging=0]": [5],
            "minecraft:oak_hanging_sign[facing_direction=3,hanging=0]": [6],
        }

    def test_shapes_are_ordered_most_specific_first(self):
        # reproduces the old match's "most properties wins, ties broken
        # alphabetically" rule, which decided which entry a live permutation
        # settled on when more than one of them matched
        specs, _rekeyed = build_key_specs(self._hanging_sign_models())
        self.assertEqual(specs["minecraft:oak_hanging_sign"]["props"], [
            ["attached_bit", "facing_direction", "hanging"],
            ["attached_bit", "ground_sign_direction", "hanging"],
            ["facing_direction", "hanging"],
        ])

    def test_equal_length_shapes_are_ordered_alphabetically(self):
        # the old match broke same-size ties on the key, so the order two
        # shapes are tried in has to be settled by something, not by
        # whatever order the input dict happened to be in
        specs, _rekeyed = build_key_specs({
            "minecraft:x[a=0,z=0]": [1],
            "minecraft:x[a=1,z=1]": [2],
            "minecraft:x[b=0,y=0]": [3],
            "minecraft:x[b=1,y=1]": [4],
        })
        self.assertEqual(specs["minecraft:x"]["props"], [["a", "z"], ["b", "y"]])

    def test_property_names_within_a_shape_are_in_the_order_the_key_writes_them(self):
        specs, rekeyed = build_key_specs({
            "minecraft:x[b=0,a=0]": [1],
            "minecraft:x[b=1,a=1]": [2],
        })
        shape = specs["minecraft:x"]["props"][0]
        self.assertEqual(shape, ["a", "b"])
        for key in rekeyed:
            self.assertIn(key, ["minecraft:x[a=0,b=0]", "minecraft:x[a=1,b=1]"])

    def test_every_key_resolves_back_to_its_own_model(self):
        block_models = {
            "minecraft:oak_leaves[persistent_bit=0,update_bit=0]": [10],
            "minecraft:oak_leaves[persistent_bit=1,update_bit=0]": [11],
            "minecraft:stone[stone_type=stone]": [12],
            **self._hanging_sign_models(),
        }
        specs, rekeyed = build_key_specs(dict(block_models))
        for original, refs in block_models.items():
            block_id, states = parse_java_state(original)
            self.assertEqual(self._lookup(specs, rekeyed, block_id, states), refs, original)

    def test_states_bedrock_reports_that_the_data_ignores_do_not_affect_the_lookup(self):
        # the reason the old fallback existed at all: a live minecraft:stone
        # carries stone_type, which no key here mentions
        specs, rekeyed = build_key_specs({"minecraft:stone[stone_type=stone]": [1]})
        self.assertEqual(
            self._lookup(specs, rekeyed, "minecraft:stone", {"stone_type": "andesite"}), [1]
        )

    def test_a_value_no_entry_carries_resolves_to_no_model(self):
        # leaving the renderer to draw its missing cube, as it does today
        specs, rekeyed = build_key_specs({
            "minecraft:x[a=0]": [1],
            "minecraft:x[a=1]": [2],
        })
        self.assertIsNone(self._lookup(specs, rekeyed, "minecraft:x", {"a": "7"}))

    def test_an_unknown_block_id_has_no_spec(self):
        specs, rekeyed = build_key_specs({"minecraft:stone[stone_type=stone]": [1]})
        self.assertNotIn("minecraft:nonexistent", specs)
        self.assertIsNone(self._lookup(specs, rekeyed, "minecraft:nonexistent", {}))

    def test_a_permutation_missing_a_shapes_properties_falls_through_to_the_next(self):
        # a wall sign reports neither attachment nor a rotation, so neither
        # of the two longer shapes can be built and the last one has to be
        # reached - building a key naming a state the block hasn't got would
        # just miss, and the sign would draw as a missing cube
        specs, rekeyed = build_key_specs(self._hanging_sign_models())
        self.assertEqual(
            self._lookup(specs, rekeyed, "minecraft:oak_hanging_sign",
                         {"facing_direction": "2", "hanging": "0"}),
            [5],
        )
