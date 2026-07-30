import unittest

from model_resolver import resolve_model


class FakeMcmeta:
    def __init__(self, models):
        self._models = models  # {'block/x': {...}}

    def read_json(self, path):
        # path looks like 'assets/minecraft/models/block/x.json'
        model_id = path[len("assets/minecraft/models/"):-len(".json")]
        return self._models[model_id]


class ResolveModelTest(unittest.TestCase):
    def test_inherits_elements_from_parent_when_child_has_none(self):
        mcmeta = FakeMcmeta({
            "block/cube_all": {
                "textures": {"particle": "#all"},
                "elements": [{
                    "from": [0, 0, 0], "to": [16, 16, 16],
                    "faces": {
                        "up": {"texture": "#all", "uv": [0, 0, 16, 16]},
                    },
                }],
            },
            "block/stone": {
                "parent": "block/cube_all",
                "textures": {"all": "block/stone"},
            },
        })
        elements = resolve_model(mcmeta, "block/stone")
        self.assertEqual(len(elements), 1)
        face = elements[0]["faces"]["up"]
        self.assertEqual(face["center"], [8, 16, 8])
        self.assertEqual(face["width"], 16)
        self.assertEqual(face["height"], 16)
        self.assertEqual(face["normal"], [0, 1, 0])
        self.assertEqual(face["texture"], "block/stone")

    def test_child_elements_override_parent_elements(self):
        mcmeta = FakeMcmeta({
            "block/parent": {
                "textures": {},
                "elements": [{"from": [0, 0, 0], "to": [16, 16, 16], "faces": {}}],
            },
            "block/child": {
                "parent": "block/parent",
                "textures": {"all": "block/child_tex"},
                "elements": [{
                    "from": [4, 0, 4], "to": [12, 8, 12],
                    "faces": {"up": {"texture": "#all", "uv": [0, 0, 8, 8]}},
                }],
            },
        })
        elements = resolve_model(mcmeta, "block/child")
        self.assertEqual(len(elements), 1)
        face = elements[0]["faces"]["up"]
        self.assertEqual(face["center"], [8, 8, 8])
        self.assertEqual(face["width"], 8)
        self.assertEqual(face["height"], 8)
        self.assertEqual(face["texture"], "block/child_tex")

    def test_face_defaults_for_missing_optional_fields(self):
        mcmeta = FakeMcmeta({
            "block/x": {
                "textures": {"all": "block/x"},
                "elements": [{
                    "from": [0, 0, 0], "to": [16, 16, 16],
                    "faces": {"north": {"texture": "#all"}},
                }],
            },
        })
        face = resolve_model(mcmeta, "block/x")[0]["faces"]["north"]
        self.assertEqual(face["uv"], [0, 0, 16, 16])
        self.assertEqual(face["rotation"], 0)
        self.assertIsNone(face["cullface"])
        self.assertEqual(face["tintindex"], -1)

    def test_resolves_multi_hop_texture_variable_chain(self):
        mcmeta = FakeMcmeta({
            "block/x": {
                "textures": {"particle": "#all", "all": "block/stone"},
                "elements": [{
                    "from": [0, 0, 0], "to": [16, 16, 16],
                    "faces": {"up": {"texture": "#particle"}},
                }],
            },
        })
        face = resolve_model(mcmeta, "block/x")[0]["faces"]["up"]
        self.assertEqual(face["texture"], "block/stone")

    def test_strips_namespace_prefix_from_resolved_literal_texture(self):
        mcmeta = FakeMcmeta({
            "block/x": {
                "textures": {"all": "minecraft:block/stone"},
                "elements": [{
                    "from": [0, 0, 0], "to": [16, 16, 16],
                    "faces": {
                        "up": {"texture": "#all"},
                        "down": {"texture": "minecraft:block/stone"},
                    },
                }],
            },
        })
        faces = resolve_model(mcmeta, "block/x")[0]["faces"]
        self.assertEqual(faces["up"]["texture"], "block/stone")
        self.assertEqual(faces["down"]["texture"], "block/stone")

    def test_extracts_sprite_path_from_dict_shaped_texture_reference(self):
        mcmeta = FakeMcmeta({
            "block/x": {
                "textures": {
                    "all": {
                        "force_translucent": True,
                        "sprite": "minecraft:block/glass",
                    },
                },
                "elements": [{
                    "from": [0, 0, 0], "to": [16, 16, 16],
                    "faces": {"up": {"texture": "#all"}},
                }],
            },
        })
        face = resolve_model(mcmeta, "block/x")[0]["faces"]["up"]
        self.assertEqual(face["texture"], "block/glass")

    def test_resolves_bare_texture_variable_without_hash_prefix(self):
        # Real-world Mojang data quirk (e.g. minecraft:heavy_core): textures
        # dict defines "all", but the face references it as "all" instead of
        # the spec-correct "#all".
        mcmeta = FakeMcmeta({
            "block/x": {
                "textures": {"all": "block/heavy_core"},
                "elements": [{
                    "from": [0, 0, 0], "to": [16, 16, 16],
                    "faces": {"up": {"texture": "all"}},
                }],
            },
        })
        face = resolve_model(mcmeta, "block/x")[0]["faces"]["up"]
        self.assertEqual(face["texture"], "block/heavy_core")

    def test_raises_on_unresolved_texture_variable(self):
        mcmeta = FakeMcmeta({
            "block/x": {
                "textures": {},
                "elements": [{
                    "from": [0, 0, 0], "to": [16, 16, 16],
                    "faces": {"up": {"texture": "#missing"}},
                }],
            },
        })
        with self.assertRaises(KeyError):
            resolve_model(mcmeta, "block/x")

    def test_each_face_gets_its_own_plane_not_the_whole_element_box(self):
        mcmeta = FakeMcmeta({
            "block/x": {
                "textures": {"all": "block/stone"},
                "elements": [{
                    "from": [0, 0, 0], "to": [16, 16, 16],
                    "faces": {
                        "up": {"texture": "#all"}, "down": {"texture": "#all"},
                        "north": {"texture": "#all"}, "south": {"texture": "#all"},
                        "west": {"texture": "#all"}, "east": {"texture": "#all"},
                    },
                }],
            },
        })
        faces = resolve_model(mcmeta, "block/x")[0]["faces"]
        self.assertEqual(faces["up"]["center"], [8, 16, 8])
        self.assertEqual(faces["up"]["normal"], [0, 1, 0])
        self.assertEqual(faces["down"]["center"], [8, 0, 8])
        self.assertEqual(faces["down"]["normal"], [0, -1, 0])
        self.assertEqual(faces["north"]["center"], [8, 8, 0])
        self.assertEqual(faces["north"]["normal"], [0, 0, -1])
        self.assertEqual(faces["south"]["center"], [8, 8, 16])
        self.assertEqual(faces["south"]["normal"], [0, 0, 1])
        self.assertEqual(faces["west"]["center"], [0, 8, 8])
        self.assertEqual(faces["west"]["normal"], [-1, 0, 0])
        self.assertEqual(faces["east"]["center"], [16, 8, 8])
        self.assertEqual(faces["east"]["normal"], [1, 0, 0])

    def test_side_face_width_is_horizontal_and_height_is_vertical(self):
        # Mirrors a fence post: a thin (6-wide-on-x/z), full-height (16-on-y)
        # column. Its east/west faces (normal along X) span Y (vertical) and
        # Z (horizontal) - width must read the horizontal axis (Z) and height
        # the vertical one (Y), or a narrow-but-tall face renders as a
        # wide-but-short one (rotated 90 degrees).
        mcmeta = FakeMcmeta({
            "block/x": {
                "textures": {"all": "block/oak_planks"},
                "elements": [{
                    "from": [6, 0, 6], "to": [10, 16, 10],
                    "faces": {"west": {"texture": "#all"}, "north": {"texture": "#all"}},
                }],
            },
        })
        faces = resolve_model(mcmeta, "block/x")[0]["faces"]
        self.assertEqual(faces["west"]["width"], 4)  # horizontal (Z) extent
        self.assertEqual(faces["west"]["height"], 16)  # vertical (Y) extent
        self.assertEqual(faces["north"]["width"], 4)  # horizontal (X) extent
        self.assertEqual(faces["north"]["height"], 16)  # vertical (Y) extent

    def test_element_rotation_turns_a_diagonal_cross_quad_to_a_45_degree_normal(self):
        # Mirrors minecraft:block/cross (used by short_grass etc): a vertical
        # quad rotated 45 degrees around the block center so two of them form
        # an "X" shape, instead of staying axis-aligned.
        from decimal import Decimal
        mcmeta = FakeMcmeta({
            "block/x": {
                "textures": {"all": "block/short_grass"},
                "elements": [{
                    # real pipeline data is parsed with parse_float=Decimal
                    # (see mcmeta_source.py), so 15.2 - 0.8 is exact
                    "from": [Decimal("0.8"), 0, 8], "to": [Decimal("15.2"), 16, 8],
                    "rotation": {"origin": [8, 8, 8], "axis": "y", "angle": 45, "rescale": True},
                    "faces": {"north": {"texture": "#all"}},
                }],
            },
        })
        face = resolve_model(mcmeta, "block/x")[0]["faces"]["north"]
        # center stays at the block's horizontal middle (rotation origin == face center)
        self.assertEqual(face["center"], [8, 8, 8])
        # width/height are unaffected by rotation (it's a rigid transform)
        self.assertEqual(face["width"], Decimal("14.4"))
        self.assertEqual(face["height"], 16)
        # the normal, originally due north (0,0,-1), is now rotated 45 degrees
        import math
        self.assertAlmostEqual(float(face["normal"][0]), math.sqrt(2) / 2, places=5)
        self.assertEqual(face["normal"][1], 0)
        self.assertAlmostEqual(float(face["normal"][2]), -math.sqrt(2) / 2, places=5)


if __name__ == "__main__":
    unittest.main()
