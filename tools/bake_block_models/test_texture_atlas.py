import io
import unittest

from PIL import Image

from texture_atlas import (
    ATLAS_HEIGHT,
    ATLAS_WIDTH,
    compose_textures,
    tinted,
    TextureAtlas,
)


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
    def test_composite_name_layers_its_textures_lowest_first(self):
        # Mirrors a grass block: an opaque base with a partly transparent
        # overlay laid over it. Where the overlay is solid it wins; where
        # it's transparent the base shows through.
        overlay = Image.new("RGBA", (2, 1), (0, 255, 0, 255))
        overlay.putpixel((1, 0), (0, 0, 0, 0))  # transparent right half
        mcmeta = FakeMcmeta({
            "block/base": _solid((2, 1), (120, 80, 40, 255)),
            "block/overlay": overlay,
        })
        name = compose_textures("block/base", "block/overlay")

        atlas = TextureAtlas()
        atlas.add(mcmeta, name)
        image, manifest = atlas.pack()

        rect = manifest[name]
        self.assertEqual(image.getpixel((rect["x"], rect["y"])), (0, 255, 0, 255))
        self.assertEqual(image.getpixel((rect["x"] + 1, rect["y"])), (120, 80, 40, 255))

    def test_composite_resizes_a_layer_authored_at_another_resolution(self):
        # the layers still have to line up pixel for pixel once combined
        mcmeta = FakeMcmeta({
            "block/base": _solid((4, 4), (10, 10, 10, 255)),
            "block/overlay": _solid((2, 2), (0, 0, 255, 255)),
        })
        name = compose_textures("block/base", "block/overlay")

        atlas = TextureAtlas()
        atlas.add(mcmeta, name)
        _image, manifest = atlas.pack()

        self.assertEqual((manifest[name]["w"], manifest[name]["h"]), (4, 4))

    def test_flip_suffix_stores_a_separate_mirrored_copy(self):
        # a 2x1 texture, distinct pixels so a horizontal flip is detectable
        mcmeta = FakeMcmeta({
            "entity/x": Image.new("RGBA", (2, 1)),
        })
        mcmeta._textures["entity/x"].putpixel((0, 0), (255, 0, 0, 255))
        mcmeta._textures["entity/x"].putpixel((1, 0), (0, 255, 0, 255))

        atlas = TextureAtlas()
        atlas.add(mcmeta, "entity/x")
        atlas.add(mcmeta, "entity/x|fx")
        image, manifest = atlas.pack()

        self.assertEqual(set(manifest.keys()), {"entity/x", "entity/x|fx"})
        normal_rect = manifest["entity/x"]
        flipped_rect = manifest["entity/x|fx"]
        self.assertEqual(image.getpixel((normal_rect["x"], normal_rect["y"])), (255, 0, 0, 255))
        self.assertEqual(image.getpixel((flipped_rect["x"], flipped_rect["y"])), (0, 255, 0, 255))

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

    def test_name_carrying_an_explicit_tint_bakes_that_tint(self):
        # for tints the block's own state decides (redstone's power ramp),
        # which DEFAULT_TINTS can't express - it keys off the texture alone
        mcmeta = FakeMcmeta({"block/redstone_dust_dot": _solid((16, 16), (255, 255, 255, 255))})
        atlas = TextureAtlas()
        name = tinted("block/redstone_dust_dot", (255, 51, 0))
        atlas.add(mcmeta, name)
        packed, manifest = atlas.pack()
        rect = manifest[name]
        self.assertEqual(packed.getpixel((rect["x"], rect["y"]))[:3], (255, 51, 0))

    def test_the_same_texture_at_two_tints_packs_as_two_entries(self):
        mcmeta = FakeMcmeta({"block/redstone_dust_dot": _solid((16, 16), (255, 255, 255, 255))})
        atlas = TextureAtlas()
        unpowered = tinted("block/redstone_dust_dot", (77, 0, 0))
        powered = tinted("block/redstone_dust_dot", (255, 51, 0))
        atlas.add(mcmeta, unpowered)
        atlas.add(mcmeta, powered)
        packed, manifest = atlas.pack()
        self.assertEqual(len(manifest), 2)
        self.assertEqual(packed.getpixel((manifest[unpowered]["x"], manifest[unpowered]["y"]))[:3], (77, 0, 0))
        self.assertEqual(packed.getpixel((manifest[powered]["x"], manifest[powered]["y"]))[:3], (255, 51, 0))

    def test_an_explicit_tint_applies_to_its_own_layer_of_a_composite(self):
        # the dot model lays an untinted overlay over the tinted line, so a
        # composite's layers can't share one tint
        mcmeta = FakeMcmeta({
            "block/redstone_dust_dot": _solid((16, 16), (255, 255, 255, 255)),
            "block/redstone_dust_overlay": _solid((16, 16), (0, 0, 0, 0)),
        })
        atlas = TextureAtlas()
        name = compose_textures(
            tinted("block/redstone_dust_dot", (255, 51, 0)), "block/redstone_dust_overlay"
        )
        atlas.add(mcmeta, name)
        packed, manifest = atlas.pack()
        rect = manifest[name]
        self.assertEqual(packed.getpixel((rect["x"], rect["y"]))[:3], (255, 51, 0))

    def test_a_name_can_carry_both_a_mirror_and_a_tint(self):
        # the redstone dot's down face is exactly this: a uv rect written
        # back-to-front, on a face that also takes the power tint
        left = Image.new("RGBA", (2, 1), (255, 255, 255, 255))
        left.putpixel((0, 0), (128, 128, 128, 255))
        mcmeta = FakeMcmeta({"block/redstone_dust_dot": left})
        atlas = TextureAtlas()
        name = tinted("block/redstone_dust_dot|fx", (255, 51, 0))
        atlas.add(mcmeta, name)
        packed, manifest = atlas.pack()
        rect = manifest[name]
        # mirrored, so the white texel is now on the left, and tinted
        self.assertEqual(packed.getpixel((rect["x"], rect["y"]))[:3], (255, 51, 0))
        self.assertEqual(packed.getpixel((rect["x"] + 1, rect["y"]))[:3], (128, 25, 0))

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
