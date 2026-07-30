import unittest

from blockstate_resolver import resolve_java_state


class FakeMcmeta:
    def __init__(self, blockstates, models):
        self._blockstates = blockstates  # {'stone': {...}}
        self._models = models  # {'block/x': {...}}

    def exists(self, path):
        name = path[len("assets/minecraft/blockstates/"):-len(".json")]
        return name in self._blockstates

    def read_json(self, path):
        if path.startswith("assets/minecraft/blockstates/"):
            name = path[len("assets/minecraft/blockstates/"):-len(".json")]
            return self._blockstates[name]
        model_id = path[len("assets/minecraft/models/"):-len(".json")]
        return self._models[model_id]


_FLAT_ELEMENT = [{"from": [0, 0, 0], "to": [16, 16, 16], "faces": {}}]


class ResolveJavaStateTest(unittest.TestCase):
    def test_variant_with_no_properties(self):
        mcmeta = FakeMcmeta(
            blockstates={"stone": {"variants": {"": {"model": "block/stone"}}}},
            models={"block/stone": {"textures": {}, "elements": _FLAT_ELEMENT}},
        )
        elements = resolve_java_state(mcmeta, "minecraft:stone", {})
        self.assertEqual(elements, _FLAT_ELEMENT)

    def test_variant_matches_exact_sorted_property_key(self):
        mcmeta = FakeMcmeta(
            blockstates={"oak_log": {"variants": {
                "axis=x": {"model": "block/oak_log_horizontal", "x": 90, "y": 90},
                "axis=y": {"model": "block/oak_log"},
            }}},
            models={
                "block/oak_log": {"textures": {}, "elements": _FLAT_ELEMENT},
                "block/oak_log_horizontal": {"textures": {}, "elements": _FLAT_ELEMENT},
            },
        )
        elements = resolve_java_state(mcmeta, "minecraft:oak_log", {"axis": "y"})
        self.assertEqual(len(elements), 1)

    def test_multipart_and_condition_matches(self):
        mcmeta = FakeMcmeta(
            blockstates={"redstone_wire": {"multipart": [
                {"apply": {"model": "block/redstone_dust_dot"}},
                {"when": {"north": "side"}, "apply": {"model": "block/redstone_dust_side"}},
            ]}},
            models={
                "block/redstone_dust_dot": {"textures": {}, "elements": [{"from": [0, 0, 0], "to": [1, 1, 1], "faces": {}}]},
                "block/redstone_dust_side": {"textures": {}, "elements": [{"from": [0, 0, 0], "to": [2, 2, 2], "faces": {}}]},
            },
        )
        elements = resolve_java_state(mcmeta, "minecraft:redstone_wire", {"north": "side"})
        # base part (no "when") always applies, plus the matching "north" part
        self.assertEqual(len(elements), 2)

    def test_multipart_condition_not_matching_is_excluded(self):
        mcmeta = FakeMcmeta(
            blockstates={"redstone_wire": {"multipart": [
                {"when": {"north": "side"}, "apply": {"model": "block/redstone_dust_side"}},
            ]}},
            models={
                "block/redstone_dust_side": {"textures": {}, "elements": _FLAT_ELEMENT},
            },
        )
        elements = resolve_java_state(mcmeta, "minecraft:redstone_wire", {"north": "none"})
        self.assertEqual(elements, [])

    def test_multipart_merges_multi_element_models_from_multiple_parts(self):
        mcmeta = FakeMcmeta(
            blockstates={"fence": {"multipart": [
                {"apply": {"model": "block/fence_post"}},
                {"when": {"north": "true"}, "apply": {"model": "block/fence_side"}},
            ]}},
            models={
                "block/fence_post": {"textures": {}, "elements": [
                    {"from": [0, 0, 0], "to": [1, 1, 1], "faces": {}},
                    {"from": [2, 2, 2], "to": [3, 3, 3], "faces": {}},
                ]},
                "block/fence_side": {"textures": {}, "elements": [
                    {"from": [4, 4, 4], "to": [5, 5, 5], "faces": {}},
                ]},
            },
        )
        elements = resolve_java_state(mcmeta, "minecraft:fence", {"north": "true"})
        # 2 elements from the always-applied part + 1 from the matching part
        self.assertEqual(len(elements), 3)

    def test_rotation_preserves_face_data(self):
        mcmeta = FakeMcmeta(
            blockstates={"oak_log": {"variants": {
                "axis=x": {"model": "block/oak_log_horizontal", "y": 90},
            }}},
            models={"block/oak_log_horizontal": {"textures": {}, "elements": [
                {"from": [0, 0, 0], "to": [16, 16, 16], "faces": {
                    "north": {"uv": [0, 0, 16, 16], "texture": "block/oak_log", "rotation": 0, "cullface": "north", "tintindex": -1},
                }},
            ]}},
        )
        elements = resolve_java_state(mcmeta, "minecraft:oak_log", {"axis": "x"})
        self.assertEqual(
            elements[0]["faces"]["north"],
            {"uv": [0, 0, 16, 16], "texture": "block/oak_log", "rotation": 0, "cullface": "north", "tintindex": -1},
        )

    def test_returns_none_when_blockstate_missing(self):
        mcmeta = FakeMcmeta(blockstates={}, models={})
        self.assertIsNone(resolve_java_state(mcmeta, "minecraft:unknown_block", {}))

    def test_rotation_moves_element_corners(self):
        mcmeta = FakeMcmeta(
            blockstates={"oak_log": {"variants": {
                "axis=x": {"model": "block/half_slab", "y": 90},
            }}},
            models={"block/half_slab": {"textures": {}, "elements": [
                {"from": [0, 0, 0], "to": [16, 8, 16], "faces": {}},
            ]}},
        )
        elements = resolve_java_state(mcmeta, "minecraft:oak_log", {"axis": "x"})
        # a 90-degree y-rotation about the block center leaves a full-width,
        # half-height element's from/to unchanged (it's symmetric on x/z)
        self.assertEqual(elements[0]["from"], [0, 0, 0])
        self.assertEqual(elements[0]["to"], [16, 8, 16])


if __name__ == "__main__":
    unittest.main()
