import unittest
from decimal import Decimal

from PIL import Image

from atlas.uv import inset_by_half_texel, project_uv, white_swatch


class WhiteSwatchTest(unittest.TestCase):
    def test_swatch_is_a_solid_block_of_texels_not_a_lone_one(self):
        # a lone texel has nothing but the atlas's transparent gaps around it,
        # and the renderer's filtering averages a magnified quad's edges with
        # whatever neighbors it finds - which faded the missing-block cube's
        # face edges out until they no longer met (#18)
        swatch = white_swatch(Image.new("RGBA", (1, 1), (255, 255, 255, 255)))
        self.assertGreaterEqual(min(swatch.size), 16)
        colors = swatch.convert("RGBA").getcolors()
        self.assertEqual(colors, [(swatch.width * swatch.height, (255, 255, 255, 255))])

    def test_swatch_size_is_a_power_of_two_so_its_mips_stay_solid(self):
        # every mip level halves the swatch; an odd size would start averaging
        # in the neighboring texture instead of only white
        size = white_swatch(Image.new("RGBA", (1, 1), (255, 255, 255, 255))).width
        self.assertEqual(size & (size - 1), 0)

    def test_inset_rect_samples_strictly_inside_the_swatch(self):
        # half a texel in on every side, so the outermost points sampled are
        # swatch texel centers rather than the boundary it shares with
        # whatever got packed next to it
        rect = inset_by_half_texel({"x": 576, "y": 544, "w": 16, "h": 16})
        self.assertEqual(rect, {
            "x": Decimal("576.5"), "y": Decimal("544.5"),
            "w": Decimal("15"), "h": Decimal("15"),
        })
        for value in rect.values():
            self.assertNotIsInstance(value, float)


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
        # (see geometry/test_billboard.py) - so the rect never needs transposing
        # here, and reordering it would be what breaks the pairing.
        block_models = {"k": [self._face("block/oak_button", uv=[5, 6, 11, 10])]}
        atlas_manifest = {"block/oak_button": {"x": 0, "y": 0, "w": 16, "h": 16}}
        result = project_uv(block_models, atlas_manifest)
        self.assertEqual(result["k"][0]["uv"]["w"], 6)
        self.assertEqual(result["k"][0]["uv"]["h"], 4)


if __name__ == "__main__":
    unittest.main()
