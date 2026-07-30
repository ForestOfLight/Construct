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
        # the x=16 (east) plane, and its extent and texture axes rotate the
        # same way (uv/texture/cullface/tintindex pass through unchanged).
        # The rotated axes land exactly on the canonical basis of the face it
        # became: u = -z, v = -y is what an unrotated "east" face already
        # uses, which is the answer a block turned to face east should give.
        # Verified
        # against real minecraft:furnace data, whose facing=east variant
        # (y:90) must move its front face (modeled on "north") onto the east
        # (+x) plane
        face = elements[0]["faces"]["north"]
        self.assertEqual([float(c) for c in face["center"]], [16, 8, 8])
        self.assertEqual([float(c) for c in face["extent"]], [0, 16, 16])
        self.assertEqual([float(c) for c in face["normal"]], [1, 0, 0])
        self.assertEqual([float(c) for c in face["uv_u"]], [0, 0, -1])
        self.assertEqual([float(c) for c in face["uv_v"]], [0, -1, 0])
        self.assertEqual(face["uv"], [0, 0, 16, 16])
        self.assertEqual(face["texture"], "block/oak_log")
        self.assertEqual(face["cullface"], "north")
        self.assertEqual(face["tintindex"], -1)
        self.assertEqual(face["flip"], "")

    def test_uvlock_variant_leaves_the_texture_world_aligned(self):
        # mirrors real minecraft:oak_stairs data: its non-default-facing
        # variants set uvlock:true, meaning the texture must NOT turn with
        # the block, staying put relative to the world however the block is
        # oriented. The up face's u therefore still points +x afterwards
        # rather than following the y:90 round to +z, so the face measures
        # its width along the same world axis the raw uv's 8-wide span was
        # authored against.
        mcmeta = FakeMcmeta(
            blockstates={"oak_stairs": {"variants": {
                "facing=south": {"model": "block/oak_stairs_top", "y": 90, "uvlock": True},
            }}},
            models={"block/oak_stairs_top": {"textures": {}, "elements": [
                {"from": [8, 8, 0], "to": [16, 16, 16], "faces": {
                    "up": {"uv": [8, 0, 16, 16], "texture": "block/oak_planks"},
                }},
            ]}},
        )
        elements = resolve_java_state(mcmeta, "minecraft:oak_stairs", {"facing": "south"})
        face = elements[0]["faces"]["up"]
        self.assertEqual(face["uv_u"], [1, 0, 0])
        self.assertEqual(face["uv_v"], [0, 0, 1])

    def test_uvlock_keeps_a_reoriented_faces_texture_axes_in_its_own_plane(self):
        # World-aligning a uvlocked texture must not be done by simply
        # leaving the old axes where they were: a face that gets turned onto
        # a new plane takes its texture with it, and axes left behind end up
        # pointing straight out of the face instead of across it. A west
        # face turned by y:90 ends up facing north, and its u ran +z - the
        # very axis the face now faces along. Measuring the face's width
        # along that (see main.py's _derive_width_height) would give zero and
        # drop the face from the render entirely, which is what happened to
        # every side face of every rotated stair.
        mcmeta = FakeMcmeta(
            blockstates={"oak_stairs": {"variants": {
                "facing=north": {"model": "block/oak_stairs_side", "y": 90, "uvlock": True},
            }}},
            models={"block/oak_stairs_side": {"textures": {}, "elements": [
                {"from": [0, 0, 0], "to": [16, 8, 16], "faces": {
                    "west": {"uv": [0, 8, 16, 16], "texture": "block/oak_planks"},
                }},
            ]}},
        )
        elements = resolve_java_state(mcmeta, "minecraft:oak_stairs", {"facing": "north"})
        face = elements[0]["faces"]["west"]
        normal = [float(c) for c in face["normal"]]
        self.assertEqual(normal, [0, 0, -1])  # west turned north
        for axis in ("uv_u", "uv_v"):
            with self.subTest(axis=axis):
                across_the_face = sum(float(a) * b for a, b in zip(face[axis], normal))
                self.assertEqual(across_the_face, 0)
        # and world-aligned: exactly the frame a north face is authored with
        self.assertEqual([float(c) for c in face["uv_u"]], [-1, 0, 0])
        self.assertEqual([float(c) for c in face["uv_v"]], [0, -1, 0])

    def test_uvlock_turns_the_uv_rect_with_the_frame_so_the_texture_isnt_stretched(self):
        # Same real oak_stairs shape as above. Its top step's up face is
        # authored 8 wide x 16 tall (uv [8,0,16,16], the texture's right
        # half) for a step lying along x. A quarter turn leaves the step
        # lying along z instead - 16 wide x 8 tall - so the rect has to turn
        # with it. World-aligning only the frame and leaving the rect as
        # authored gives a 16x8 quad sampling an 8x16 rect: the stretched
        # stair top face.
        #
        # The rect must also land on the half of the texture the step now
        # occupies. After y:90 the step sits at z 8..16, so the rect is
        # v 8..16 - offset tracking world position is what "uvlocked" means.
        mcmeta = FakeMcmeta(
            blockstates={"oak_stairs": {"variants": {
                "facing=south": {"model": "block/oak_stairs_top", "y": 90, "uvlock": True},
            }}},
            models={"block/oak_stairs_top": {"textures": {}, "elements": [
                {"from": [8, 8, 0], "to": [16, 16, 16], "faces": {
                    "up": {"uv": [8, 0, 16, 16], "texture": "block/oak_planks"},
                }},
            ]}},
        )
        elements = resolve_java_state(mcmeta, "minecraft:oak_stairs", {"facing": "south"})
        face = elements[0]["faces"]["up"]
        self.assertEqual([float(c) for c in face["uv"]], [0, 8, 16, 16])

    def test_uvlock_leaves_a_half_turn_rect_alone_apart_from_its_offset(self):
        # A 180-degree uvlock can't transpose anything (width and height come
        # back to themselves), but the rect still has to move to the half of
        # the texture the element ended up over - here x 8..16 turns to
        # x 0..8, so the right half of the texture becomes the left half.
        mcmeta = FakeMcmeta(
            blockstates={"oak_stairs": {"variants": {
                "facing=west": {"model": "block/oak_stairs_top", "y": 180, "uvlock": True},
            }}},
            models={"block/oak_stairs_top": {"textures": {}, "elements": [
                {"from": [8, 8, 0], "to": [16, 16, 16], "faces": {
                    "up": {"uv": [8, 0, 16, 16], "texture": "block/oak_planks"},
                }},
            ]}},
        )
        elements = resolve_java_state(mcmeta, "minecraft:oak_stairs", {"facing": "west"})
        face = elements[0]["faces"]["up"]
        self.assertEqual([float(c) for c in face["uv"]], [0, 0, 8, 16])

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
