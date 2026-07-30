import math
import unittest
from decimal import Decimal

from main import (
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
    def test_vertical_normal_reads_x_and_z_directly(self):
        width, height = _derive_width_height([16, 0, 4], [0, 1, 0])
        self.assertEqual(width, 16)
        self.assertEqual(height, 4)

    def test_horizontal_normal_reads_the_other_horizontal_axis_and_y(self):
        width, height = _derive_width_height([0, 16, 4], [-1, 0, 0])  # west face
        self.assertEqual(width, 4)
        self.assertEqual(height, 16)

    def test_permuted_extent_after_an_x_axis_blockstate_rotation(self):
        # Mirrors minecraft:piston_head facing=down (x:90): a face that
        # started as the arm's "up" face (vertical normal, width=4 on X,
        # height=16 on Z) rotates to a horizontal normal, and x:90 swaps
        # the Y/Z extents - Y ends up holding the old Z length (16) and Z
        # ends up holding the old Y length (0, since "up" was degenerate on Y).
        # The final face is horizontal-normal (south), so width should read
        # the surviving horizontal (X) extent and height should read Y.
        extent = [4, 16, 0]  # already rotated: x unaffected, y<-old z, z<-old y
        normal = [0, 0, 1]  # rotated from (0,1,0) "up" to south-facing
        width, height = _derive_width_height(extent, normal)
        self.assertEqual(width, 4)
        self.assertEqual(height, 16)

    def test_diagonal_extent_recombines_via_pythagoras(self):
        # Mirrors a cross-plant quad (e.g. short_grass) rotated 45 degrees
        # around Y: the original single horizontal length (14.4) gets split
        # across X and Z, but the true width is still 14.4 - not the raw X
        # or Z component alone.
        half = Decimal(14.4) * Decimal(math.sqrt(2) / 2)
        width, height = _derive_width_height([half, 16, half], [Decimal("0.707107"), 0, Decimal("-0.707107")])
        self.assertAlmostEqual(float(width), 14.4, places=3)
        self.assertEqual(height, 16)


class ProjectUvTest(unittest.TestCase):
    def _face(self, texture, uv=None):
        uv = uv or [0, 0, 16, 16]
        u0, v0, u1, v1 = uv
        return {
            "texture": texture, "uv": uv,
            # matches _FACE_UV_AXES's "up"/"down" mapping (u->x, v->z), since
            # every face here uses the fixed vertical normal below
            "uv_extent": [u1 - u0, 0, v1 - v0],
            "center": [8, 16, 8], "width": 16, "height": 16, "normal": [0, 1, 0],
        }

    def test_replaces_texture_name_with_atlas_pixel_rect(self):
        block_models = {"k": [self._face("block/stone")]}
        atlas_manifest = {"block/stone": {"x": 10, "y": 20, "w": 16, "h": 16}}
        result = project_uv(block_models, atlas_manifest)
        self.assertEqual(result["k"][0]["uv"], {"x": 10, "y": 20, "w": 16, "h": 16})
        self.assertNotIn("texture", result["k"][0])
        # a plain-int uv_extent (e.g. WHITE_CUBE_FACES's literal [16, 0, 16])
        # must not produce a native float - js_data.render() can't serialize
        # one, and int/16 in Python 3 is a float even when evenly divisible
        for value in result["k"][0]["uv"].values():
            self.assertNotIsInstance(value, float)

    def test_missing_texture_falls_back_to_white_rect(self):
        block_models = {"k": [self._face("block/nonexistent")]}
        atlas_manifest = {"white": {"x": 0, "y": 0, "w": 16, "h": 16}}
        result = project_uv(block_models, atlas_manifest)
        self.assertEqual(result["k"][0]["uv"], {"x": 0, "y": 0, "w": 16, "h": 16})

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

    def test_uv_rect_dimensions_follow_the_rotated_uv_extent_not_the_raw_uv(self):
        # Mirrors an oak_button rotated to mount on a wall (x:90): the raw
        # java uv is [5, 6, 11, 10] (6 wide, 4 tall), but after the same
        # rotation that swapped the geometry's width/height, uv_extent
        # reflects the new pairing (4 wide, 6 tall) - the projected rect's
        # w/h must follow uv_extent, not be recomputed from the untouched
        # raw uv numbers (which would give the transposed, wrong aspect).
        face = self._face("block/oak_button", uv=[5, 6, 11, 10])
        face["uv_extent"] = [4, 6, 0]  # already rotated: swapped vs. the raw uv's (6, 4)
        face["normal"] = [0, 0, 1]  # no longer vertical after rotation
        block_models = {"k": [face]}
        atlas_manifest = {"block/oak_button": {"x": 0, "y": 0, "w": 16, "h": 16}}
        result = project_uv(block_models, atlas_manifest)
        self.assertEqual(result["k"][0]["uv"]["w"], 4)
        self.assertEqual(result["k"][0]["uv"]["h"], 6)


class BuildFaceTypesAndRefsTest(unittest.TestCase):
    def _face(self, center, width=16, height=16, normal=None, rotation=0, tintindex=-1, uv=None):
        return {
            "center": center, "width": width, "height": height, "normal": normal or [0, 1, 0],
            "rotation": rotation, "tintindex": tintindex, "uv": uv or {"x": 0, "y": 0, "w": 16, "h": 16},
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

    def test_face_types_table_reproduces_original_face_descriptor(self):
        block_models = {
            "a": [self._face(
                [1, 2, 3], width=3, height=4, normal=[1, 0, 0], rotation=90, tintindex=0,
                uv={"x": 1, "y": 2, "w": 3, "h": 4},
            )],
        }
        face_types, result = build_face_types_and_refs(block_models)
        face_type = face_types[result["a"][0]]
        self.assertEqual(face_type["center"], [1, 2, 3])
        self.assertEqual(face_type["width"], 3)
        self.assertEqual(face_type["height"], 4)
        self.assertEqual(face_type["normal"], [1, 0, 0])
        self.assertEqual(face_type["rotation"], 90)
        self.assertEqual(face_type["tintindex"], 0)
        self.assertEqual(face_type["uv"], {"x": 1, "y": 2, "w": 3, "h": 4})


if __name__ == "__main__":
    unittest.main()
