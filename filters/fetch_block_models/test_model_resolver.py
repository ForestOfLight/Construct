import unittest

from model_resolver import resolve_model, resolve_model_particle


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
        self.assertEqual(face["extent"], [16, 0, 16])
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
        self.assertEqual(face["extent"], [8, 0, 8])
        self.assertEqual(face["texture"], "block/child_tex")

    def test_face_without_uv_samples_only_the_slice_its_element_covers(self):
        # Real minecraft:cake data: the model gives no uv at all, and Java
        # then derives one from the element's own bounds rather than using
        # the whole texture. Cake's box is 14 wide and 8 tall, so its side
        # face reaches u 1..15 and v 8..16 - the bottom 8 rows, since the
        # cake only occupies the bottom half of the block. Falling back to a
        # full 0-16 rect instead squeezes an entire 16x16 texture into that
        # face, which is the squashed cake side.
        mcmeta = FakeMcmeta({
            "block/cake": {
                "textures": {"side": "block/cake_side"},
                "elements": [{
                    "from": [1, 0, 1], "to": [15, 8, 15],
                    "faces": {"north": {"texture": "#side"}},
                }],
            },
        })
        face = resolve_model(mcmeta, "block/cake")[0]["faces"]["north"]
        self.assertEqual([float(c) for c in face["uv"]], [1, 8, 15, 16])

    def test_face_without_uv_on_a_full_cube_still_covers_the_whole_texture(self):
        # The derived default only differs from the whole texture when the
        # element isn't a full block - a full cube's bounds project onto the
        # complete 0-16 rect, so nothing changes for ordinary blocks.
        mcmeta = FakeMcmeta({
            "block/x": {
                "textures": {"all": "block/x"},
                "elements": [{
                    "from": [0, 0, 0], "to": [16, 16, 16],
                    "faces": {face: {"texture": "#all"} for face in
                              ("down", "up", "north", "south", "west", "east")},
                }],
            },
        })
        faces = resolve_model(mcmeta, "block/x")[0]["faces"]
        for name, face in faces.items():
            with self.subTest(face=name):
                self.assertEqual([float(c) for c in face["uv"]], [0, 0, 16, 16])

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
        # no per-face uv rotation to bake in, so the texture axes stay at the
        # north face's plain defaults: u runs -x, v runs -y
        self.assertEqual(face["uv_u"], [-1, 0, 0])
        self.assertEqual(face["uv_v"], [0, -1, 0])
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

    def test_extent_reflects_the_faces_own_flat_rect_dimensions(self):
        # Mirrors a fence post: a thin (4-wide-on-x/z), full-height (16-on-y)
        # column. World-space width/height are derived later (main.py's
        # _derive_width_height), from this raw per-axis extent - see
        # test_main.py for that derivation, including the case where a
        # blockstate rotation changes which axis ends up vertical.
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
        self.assertEqual(faces["west"]["extent"], [0, 16, 4])
        self.assertEqual(faces["north"]["extent"], [4, 16, 0])

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
        # the extent's magnitude is preserved by rotation (a rigid transform),
        # just redistributed across X/Z now that it points diagonally -
        # see test_main.py for confirmation that _derive_width_height
        # recovers the original 14.4/16 width/height from this
        import math
        self.assertEqual(face["extent"][1], 16)  # height (Y) is untouched by a Y-axis rotation
        self.assertAlmostEqual(float(face["extent"][0]), 14.4 * math.sqrt(2) / 2, places=5)
        self.assertAlmostEqual(float(face["extent"][2]), -14.4 * math.sqrt(2) / 2, places=5)
        # the normal, originally due north (0,0,-1), is now rotated 45 degrees
        # anticlockwise seen from above, the way an element's rotation turns
        # (see rotation.element_angle) - to the northwest, not the northeast.
        # The cross model itself can't tell: its two quads are perpendicular,
        # so turning the pair either way leaves the same X shape.
        self.assertAlmostEqual(float(face["normal"][0]), -math.sqrt(2) / 2, places=5)
        self.assertEqual(face["normal"][1], 0)
        self.assertAlmostEqual(float(face["normal"][2]), -math.sqrt(2) / 2, places=5)


class ReversedUvTest(unittest.TestCase):
    """Java writes a mirrored face by reversing its uv rect: its vertices
    take (u0,v0) (u0,v1) (u1,v1) (u1,v0) in a fixed geometric order, so
    swapping a pair reflects the texture across that axis. The observer's
    top face is written [0,16,16,0] for exactly that reason."""

    def _face(self, uv):
        mcmeta = FakeMcmeta({"block/x": {"textures": {}, "elements": [{
            "from": [0, 0, 0], "to": [16, 16, 16],
            "faces": {"up": {"uv": uv, "texture": "block/t"}},
        }]}})
        return resolve_model(mcmeta, "block/x")[0]["faces"]["up"]

    def test_a_forward_rect_is_left_alone(self):
        face = self._face([0, 0, 16, 16])
        self.assertEqual(face["flip"], "")
        self.assertEqual([float(c) for c in face["uv"]], [0, 0, 16, 16])

    def test_a_v_reversed_rect_asks_for_a_vertically_mirrored_texture(self):
        face = self._face([0, 16, 16, 0])
        self.assertEqual(face["flip"], "fy")
        # the same region, addressed in the mirrored copy's coordinates
        self.assertEqual([float(c) for c in face["uv"]], [0, 0, 16, 16])

    def test_a_u_reversed_rect_asks_for_a_horizontally_mirrored_texture(self):
        face = self._face([16, 0, 0, 16])
        self.assertEqual(face["flip"], "fx")
        self.assertEqual([float(c) for c in face["uv"]], [0, 0, 16, 16])

    def test_a_rect_reversed_both_ways_asks_for_both_mirrors(self):
        face = self._face([16, 16, 0, 0])
        self.assertEqual(face["flip"], "fxfy")

    def test_a_partial_rect_keeps_pointing_at_its_own_region(self):
        # mirroring the whole texture moves the region too: rows 4-12 of a
        # 16-tall texture mirror to rows 4-12, but rows 2-6 mirror to 10-14
        face = self._face([0, 6, 16, 2])
        self.assertEqual(face["flip"], "fy")
        self.assertEqual([float(c) for c in face["uv"]], [0, 10, 16, 14])


class ResolveModelParticleTest(unittest.TestCase):
    def test_reads_the_particle_slot_of_an_elementless_model(self):
        # barrier's whole block model: no elements, just a pointer at the
        # texture Java shows for it
        mcmeta = FakeMcmeta({
            "block/barrier": {"textures": {"particle": "minecraft:item/barrier"}},
        })
        self.assertEqual(resolve_model_particle(mcmeta, "block/barrier"), "item/barrier")

    def test_follows_a_variable_reference_and_the_parent_chain(self):
        mcmeta = FakeMcmeta({
            "block/cube_all": {"textures": {"particle": "#all"}},
            "block/stone": {"parent": "block/cube_all", "textures": {"all": "block/stone"}},
        })
        self.assertEqual(resolve_model_particle(mcmeta, "block/stone"), "block/stone")

    def test_model_without_a_particle_slot_has_none(self):
        mcmeta = FakeMcmeta({"block/stone": {"textures": {"all": "block/stone"}}})
        self.assertIsNone(resolve_model_particle(mcmeta, "block/stone"))


if __name__ == "__main__":
    unittest.main()


class ElementRotationDirectionTest(unittest.TestCase):
    """A Java element's "rotation" turns right-handed about its axis, which
    for y is the opposite way round from the blockstate-level "y" that
    rotate_vector encodes. Both cases below come from the hanging sign
    templates, the models where getting it backwards is visible."""

    def test_a_chain_rotated_45_degrees_lands_at_the_end_of_the_sign_board(self):
        # block/template_hanging_sign_rot_0's first chain quad: it sits
        # diagonally off the block's centre line and the +45 turn has to bring
        # it to the left end of the board (x=3), into the board's own plane
        # (z=8) - turned the other way it lands at the middle of the block's
        # north edge instead, which is what put the chains 90 degrees out.
        from decimal import Decimal
        mcmeta = FakeMcmeta({
            "block/x": {
                "textures": {"all": "block/oak_hanging_sign"},
                "elements": [{
                    "from": [Decimal("2.96447"), 10, Decimal("4.46447")],
                    "to": [Decimal("5.96447"), 16, Decimal("4.46447")],
                    "rotation": {"origin": [8, 0, 8], "axis": "y", "angle": 45},
                    "faces": {"north": {"texture": "#all"}},
                }],
            },
        })
        face = resolve_model(mcmeta, "block/x")[0]["faces"]["north"]
        self.assertAlmostEqual(float(face["center"][0]), 3, places=4)
        self.assertAlmostEqual(float(face["center"][2]), 8, places=4)

    def test_a_south_face_rotated_minus_45_degrees_ends_up_facing_southwest(self):
        # block/template_attached_hanging_sign_rot_2 is what Java draws for
        # rotation=2, which is 45 degrees clockwise from south, and it gets
        # there by turning the board -45 degrees about y
        import math
        mcmeta = FakeMcmeta({
            "block/x": {
                "textures": {"all": "block/oak_hanging_sign"},
                "elements": [{
                    "from": [1, 0, 7], "to": [15, 10, 9],
                    "rotation": {"origin": [8, 0, 8], "axis": "y", "angle": -45},
                    "faces": {"south": {"texture": "#all"}},
                }],
            },
        })
        normal = resolve_model(mcmeta, "block/x")[0]["faces"]["south"]["normal"]
        self.assertAlmostEqual(float(normal[0]), -math.sqrt(2) / 2, places=5)
        self.assertEqual(normal[1], 0)
        self.assertAlmostEqual(float(normal[2]), math.sqrt(2) / 2, places=5)
