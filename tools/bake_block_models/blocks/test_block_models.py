import unittest

from blocks.block_models import build_block_models
from blocks.fakes import FakeAtlas, FakeMcmeta
from blocks.stand_ins import WHITE_CUBE_FACES
from atlas.packing import tinted
from atlas.tints import REDSTONE_POWER_TINTS


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

    def test_zero_area_faces_are_dropped_along_with_their_textures(self):
        # a flat plane (a rail, a redstone wire) still lists the four faces
        # standing on its zero-thickness edges; they cover no pixels, so they
        # have no business in the baked table or in the atlas
        mcmeta = FakeMcmeta(
            blockstates={"rail": {"variants": {"": {"model": "block/rail"}}}},
            models={"block/rail": {"textures": {}, "elements": [{
                "from": [0, 0, 0], "to": [16, 0, 16],
                "faces": {
                    "up": {"texture": "block/rail"},
                    "north": {"texture": "block/rail_edge"},
                    "east": {"texture": "block/rail_edge"},
                },
            }]}},
        )
        atlas = FakeAtlas()
        b2j = {"minecraft:rail[]": "minecraft:rail"}
        block_models = build_block_models(mcmeta, b2j, atlas)
        faces = block_models["minecraft:rail[]"]
        self.assertEqual(len(faces), 1)
        self.assertEqual(faces[0]["normal"], [0, 1, 0])
        self.assertEqual(atlas.added, ["block/rail"])

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


if __name__ == "__main__":
    unittest.main()
