import unittest

from main import build_block_models, project_uv, _face_axis, WHITE_CUBE_FACES


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
    def test_resolvable_block_produces_faces_with_axis(self):
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
        self.assertEqual(faces[0]["axis"], "xz")
        self.assertIn("block/stone", atlas.added)

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
        self.assertEqual([f["axis"] for f in faces], ["xz", "xz", "xy", "xy", "yz", "yz"])
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
        self.assertEqual(faces[0]["axis"], "xy")


class ProjectUvTest(unittest.TestCase):
    def test_replaces_texture_name_with_atlas_pixel_rect(self):
        block_models = {"k": [{"texture": "block/stone", "from": [0, 0, 0], "to": [16, 16, 16], "axis": "xz"}]}
        atlas_manifest = {"block/stone": {"x": 10, "y": 20, "w": 16, "h": 16}}
        result = project_uv(block_models, atlas_manifest)
        self.assertEqual(result["k"][0]["uv"], {"x": 10, "y": 20, "w": 16, "h": 16})
        self.assertNotIn("texture", result["k"][0])

    def test_missing_texture_falls_back_to_white_rect(self):
        block_models = {"k": [{"texture": "block/nonexistent", "from": [0, 0, 0], "to": [16, 16, 16], "axis": "xz"}]}
        atlas_manifest = {"white": {"x": 0, "y": 0, "w": 16, "h": 16}}
        result = project_uv(block_models, atlas_manifest)
        self.assertEqual(result["k"][0]["uv"], {"x": 0, "y": 0, "w": 16, "h": 16})

    def test_multiple_faces_across_multiple_blocks_each_project_independently(self):
        block_models = {
            "a": [
                {"texture": "block/stone", "from": [0, 0, 0], "to": [16, 16, 16], "axis": "xz"},
                {"texture": "block/dirt", "from": [0, 0, 0], "to": [16, 16, 16], "axis": "xy"},
            ],
            "b": [
                {"texture": "block/dirt", "from": [0, 0, 0], "to": [16, 16, 16], "axis": "yz"},
            ],
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


class FaceAxisTest(unittest.TestCase):
    def test_maps_each_face_name_to_its_plane(self):
        self.assertEqual(_face_axis("up"), "xz")
        self.assertEqual(_face_axis("down"), "xz")
        self.assertEqual(_face_axis("north"), "xy")
        self.assertEqual(_face_axis("south"), "xy")
        self.assertEqual(_face_axis("east"), "yz")
        self.assertEqual(_face_axis("west"), "yz")


if __name__ == "__main__":
    unittest.main()
