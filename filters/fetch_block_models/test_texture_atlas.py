import io
import unittest

from PIL import Image

from texture_atlas import ATLAS_HEIGHT, ATLAS_WIDTH, TextureAtlas


class FakeMcmeta:
    def __init__(self, textures):
        self._textures = textures  # {'block/x': PIL.Image}

    def read_bytes(self, path):
        name = path[len("assets/minecraft/textures/"):-len(".png")]
        buf = io.BytesIO()
        self._textures[name].save(buf, format="PNG")
        return buf.getvalue()


def _solid(size, rgba):
    return Image.new("RGBA", size, rgba)


class TextureAtlasTest(unittest.TestCase):
    def test_pack_places_every_added_texture_without_overlap(self):
        mcmeta = FakeMcmeta({
            "block/stone": _solid((16, 16), (128, 128, 128, 255)),
            "block/dirt": _solid((16, 16), (110, 75, 40, 255)),
        })
        atlas = TextureAtlas()
        atlas.add(mcmeta, "block/stone")
        atlas.add(mcmeta, "block/dirt")
        _, manifest = atlas.pack()

        self.assertEqual(set(manifest.keys()), {"block/stone", "block/dirt"})
        stone, dirt = manifest["block/stone"], manifest["block/dirt"]
        no_overlap = (
            stone["x"] + stone["w"] <= dirt["x"] or dirt["x"] + dirt["w"] <= stone["x"]
            or stone["y"] + stone["h"] <= dirt["y"] or dirt["y"] + dirt["h"] <= stone["y"]
        )
        self.assertTrue(no_overlap)

    def test_animated_texture_crops_to_first_frame(self):
        # 16-wide, 32-tall = two 16x16 frames stacked; frame 0 is solid red,
        # frame 1 is solid blue.
        image = Image.new("RGBA", (16, 32))
        for y in range(16):
            for x in range(16):
                image.putpixel((x, y), (255, 0, 0, 255))
        for y in range(16, 32):
            for x in range(16):
                image.putpixel((x, y), (0, 0, 255, 255))
        mcmeta = FakeMcmeta({"block/lava_flow": image})

        atlas = TextureAtlas()
        atlas.add(mcmeta, "block/lava_flow")
        packed, manifest = atlas.pack()
        rect = manifest["block/lava_flow"]
        self.assertEqual((rect["w"], rect["h"]), (16, 16))
        self.assertEqual(packed.getpixel((rect["x"], rect["y"]))[:3], (255, 0, 0))

    def test_tint_is_baked_into_pixels_for_tintable_textures(self):
        mcmeta = FakeMcmeta({"block/grass_block_top": _solid((16, 16), (255, 255, 255, 255))})
        atlas = TextureAtlas()
        atlas.add(mcmeta, "block/grass_block_top")
        packed, manifest = atlas.pack()
        rect = manifest["block/grass_block_top"]
        pixel = packed.getpixel((rect["x"], rect["y"]))
        self.assertEqual(pixel[:3], (145, 189, 89))

    def test_add_image_inserts_a_texture_not_from_mcmeta(self):
        atlas = TextureAtlas()
        atlas.add_image("white", _solid((16, 16), (255, 255, 255, 255)))
        _, manifest = atlas.pack()
        self.assertIn("white", manifest)

    def test_add_is_idempotent_for_the_same_name(self):
        mcmeta = FakeMcmeta({"block/stone": _solid((16, 16), (128, 128, 128, 255))})
        atlas = TextureAtlas()
        atlas.add(mcmeta, "block/stone")
        atlas.add(mcmeta, "block/stone")
        _, manifest = atlas.pack()
        self.assertEqual(len(manifest), 1)

    def test_pack_wraps_to_a_new_row_when_the_current_row_is_full(self):
        # Each image is wider than half the atlas, so the second one cannot
        # fit next to the first on the same shelf and must wrap to a new row.
        width = (ATLAS_WIDTH // 2) + 100
        atlas = TextureAtlas()
        atlas.add_image("a", _solid((width, 16), (255, 0, 0, 255)))
        atlas.add_image("b", _solid((width, 16), (0, 255, 0, 255)))
        _, manifest = atlas.pack()

        a, b = manifest["a"], manifest["b"]
        self.assertEqual((a["x"], a["y"]), (0, 0))
        self.assertEqual((b["x"], b["y"]), (0, 16))

    def test_pack_raises_value_error_when_content_overflows_the_fixed_canvas(self):
        # Each image fills the full atlas width, so every image occupies its
        # own row; enough of them will exceed the fixed atlas height.
        atlas = TextureAtlas()
        rows_that_fit = ATLAS_HEIGHT // 600
        for i in range(rows_that_fit + 1):
            atlas.add_image(f"row{i}", _solid((ATLAS_WIDTH, 600), (0, 0, 0, 255)))

        with self.assertRaises(ValueError):
            atlas.pack()

    def test_pack_raises_value_error_when_a_single_texture_is_wider_than_the_atlas(self):
        atlas = TextureAtlas()
        atlas.add_image("too_wide", _solid((ATLAS_WIDTH + 176, 16), (255, 0, 0, 255)))

        with self.assertRaises(ValueError):
            atlas.pack()


if __name__ == "__main__":
    unittest.main()
