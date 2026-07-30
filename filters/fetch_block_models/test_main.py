import math
import unittest
from decimal import Decimal

from main import (
    _derive_roll,
    _merge_coincident_faces,
    _derive_width_height,
    build_block_models,
    build_face_types_and_refs,
    project_uv,
    WHITE_CUBE_FACES,
)


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
        self.assertEqual(face_type["normal"], [1, 0, 0])
        self.assertEqual(face_type["roll"], 90)
        self.assertEqual(face_type["tintindex"], 0)
        self.assertEqual(face_type["uv"], {"x": 1, "y": 2, "w": 3, "h": 4})


if __name__ == "__main__":
    unittest.main()
