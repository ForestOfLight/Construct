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
        self.assertEqual(elements[0]["from"], [0, 0, 0])
        self.assertEqual(elements[0]["to"], [16, 16, 16])
        self.assertEqual(elements[0]["faces"]["up"]["texture"], "block/stone")

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
        self.assertEqual(elements[0]["from"], [4, 0, 4])
        self.assertEqual(elements[0]["faces"]["up"]["texture"], "block/child_tex")

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


if __name__ == "__main__":
    unittest.main()
