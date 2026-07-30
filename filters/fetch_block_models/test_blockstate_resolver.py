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


_FLAT_ELEMENT = [{"from": [0, 0, 0], "to": [16, 16, 16], "faces": {}}]  # raw model fixture
_FLAT_RESOLVED = [{"faces": {}}]  # what resolve_model turns a no-faces element into


class ResolveJavaStateTest(unittest.TestCase):
    def test_variant_with_no_properties(self):
        mcmeta = FakeMcmeta(
            blockstates={"stone": {"variants": {"": {"model": "block/stone"}}}},
            models={"block/stone": {"textures": {}, "elements": _FLAT_ELEMENT}},
        )
        elements = resolve_java_state(mcmeta, "minecraft:stone", {})
        self.assertEqual(elements, _FLAT_RESOLVED)

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

    def test_multipart_or_condition_matches_when_one_sub_condition_matches(self):
        mcmeta = FakeMcmeta(
            blockstates={"vine": {"multipart": [
                {"when": {"OR": [{"north": "true"}, {"south": "true"}]},
                 "apply": {"model": "block/vine"}},
            ]}},
            models={"block/vine": {"textures": {}, "elements": _FLAT_ELEMENT}},
        )
        elements = resolve_java_state(
            mcmeta, "minecraft:vine", {"north": "false", "south": "true"}
        )
        self.assertEqual(elements, _FLAT_RESOLVED)

    def test_multipart_or_condition_excluded_when_no_sub_condition_matches(self):
        mcmeta = FakeMcmeta(
            blockstates={"vine": {"multipart": [
                {"when": {"OR": [{"north": "true"}, {"south": "true"}]},
                 "apply": {"model": "block/vine"}},
            ]}},
            models={"block/vine": {"textures": {}, "elements": _FLAT_ELEMENT}},
        )
        elements = resolve_java_state(
            mcmeta, "minecraft:vine", {"north": "false", "south": "false"}
        )
        self.assertEqual(elements, [])

    def test_multipart_explicit_and_condition_matches_when_all_sub_conditions_match(self):
        mcmeta = FakeMcmeta(
            blockstates={"vine": {"multipart": [
                {"when": {"AND": [{"north": "true"}, {"south": "true"}]},
                 "apply": {"model": "block/vine"}},
            ]}},
            models={"block/vine": {"textures": {}, "elements": _FLAT_ELEMENT}},
        )
        elements = resolve_java_state(
            mcmeta, "minecraft:vine", {"north": "true", "south": "true"}
        )
        self.assertEqual(elements, _FLAT_RESOLVED)

    def test_multipart_explicit_and_condition_excluded_when_one_sub_condition_fails(self):
        mcmeta = FakeMcmeta(
            blockstates={"vine": {"multipart": [
                {"when": {"AND": [{"north": "true"}, {"south": "true"}]},
                 "apply": {"model": "block/vine"}},
            ]}},
            models={"block/vine": {"textures": {}, "elements": _FLAT_ELEMENT}},
        )
        elements = resolve_java_state(
            mcmeta, "minecraft:vine", {"north": "true", "south": "false"}
        )
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
        # the 90-degree y-rotation moves the "north" face's center/normal onto
        # the x=16 (east) plane, and its extent rotates the same way
        # (uv/texture/rotation/cullface/tintindex pass through unchanged);
        # verified against real minecraft:furnace data, whose facing=east
        # variant (y:90) must move its front face (modeled on "north") onto
        # the east (+x) plane
        self.assertEqual(
            elements[0]["faces"]["north"],
            {
                "center": [16, 8, 8], "extent": [0, 16, 16], "normal": [1, 0, 0],
                "uv": [0, 0, 16, 16], "uv_extent": [0, 16, 16],
                "texture": "block/oak_log", "rotation": 0,
                "cullface": "north", "tintindex": -1,
            },
        )

    def test_variant_matches_when_a_given_property_is_absent_from_every_key(self):
        # mirrors real minecraft:bell data: variant keys only ever mention
        # attachment/facing, never "powered" - the bedrock->java mapping
        # still supplies "powered" (from toggle_bit), which must not prevent
        # the match
        mcmeta = FakeMcmeta(
            blockstates={"bell": {"variants": {
                "attachment=floor,facing=north": {"model": "block/bell_floor"},
                "attachment=floor,facing=south": {"model": "block/bell_floor", "y": 180},
            }}},
            models={"block/bell_floor": {"textures": {}, "elements": _FLAT_ELEMENT}},
        )
        elements = resolve_java_state(
            mcmeta, "minecraft:bell", {"attachment": "floor", "facing": "north", "powered": "false"},
        )
        self.assertEqual(elements, _FLAT_RESOLVED)

    def test_returns_none_when_blockstate_missing(self):
        mcmeta = FakeMcmeta(blockstates={}, models={})
        self.assertIsNone(resolve_java_state(mcmeta, "minecraft:unknown_block", {}))

    def test_rotation_moves_face_center_and_normal(self):
        mcmeta = FakeMcmeta(
            blockstates={"oak_log": {"variants": {
                "axis=x": {"model": "block/half_slab", "y": 90},
            }}},
            models={"block/half_slab": {"textures": {}, "elements": [
                {"from": [0, 0, 0], "to": [16, 8, 16], "faces": {"up": {"texture": "block/x"}}},
            ]}},
        )
        elements = resolve_java_state(mcmeta, "minecraft:oak_log", {"axis": "x"})
        face = elements[0]["faces"]["up"]
        # a 90-degree y-rotation about the block center leaves a full-width,
        # half-height element's "up" face center/normal unchanged (it's
        # symmetric on x/z, and "up" doesn't move under a y-axis spin)
        self.assertEqual(face["center"], [8, 8, 8])
        self.assertEqual(face["normal"], [0, 1, 0])


if __name__ == "__main__":
    unittest.main()
