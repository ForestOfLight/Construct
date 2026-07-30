"""Packs literal Java block textures into one atlas image, baking in default
tint colors for grass/leaves/etc., and produces a UV-rect manifest."""

import io

from PIL import Image

TEXTURE_PATH_TMPL = "assets/minecraft/textures/{name}.png"

# Default biome tint colors baked directly into the atlas pixels (RGB 0-255).
DEFAULT_TINTS = {
    "block/grass_block_top": (145, 189, 89),
    "block/tall_grass_top": (145, 189, 89),
    "block/tall_grass_bottom": (145, 189, 89),
    "block/fern": (145, 189, 89),
    "block/oak_leaves": (119, 171, 47),
    "block/spruce_leaves": (97, 153, 97),
    "block/birch_leaves": (128, 167, 85),
    "block/jungle_leaves": (119, 171, 47),
    "block/acacia_leaves": (119, 171, 47),
    "block/dark_oak_leaves": (119, 171, 47),
    "block/mangrove_leaves": (119, 171, 47),
    "block/azalea_leaves": (119, 171, 47),
    "block/flowering_azalea_leaves": (119, 171, 47),
    "block/vine": (119, 171, 47),
    "block/lily_pad": (32, 128, 46),
    "block/redstone_dust_line0": (255, 0, 0),
    "block/redstone_dust_line1": (255, 0, 0),
    "block/redstone_dust_overlay": (255, 0, 0),
    "block/redstone_dust_dot": (255, 0, 0),
    "block/attached_melon_stem": (225, 240, 93),
    "block/attached_pumpkin_stem": (225, 240, 93),
    "block/melon_stem": (225, 240, 93),
    "block/pumpkin_stem": (225, 240, 93),
    "block/water_still": (63, 118, 228),
    "block/water_flow": (63, 118, 228),
}

# The atlas canvas is a fixed size regardless of how much content is packed
# into it (unused space stays transparent). This is deliberate: the particle
# JSON files that sample this atlas (Task 11) must hardcode texture_width/
# texture_height as literal numbers (Bedrock particles don't accept Molang
# expressions for those two fields — confirmed in Task 1's spike test), and a
# fixed canvas size means those literals never need to change when the atlas
# is regenerated with different content.
ATLAS_WIDTH = 1024
ATLAS_HEIGHT = 1024


class TextureAtlas:
    def __init__(self):
        self._images = {}  # literal name -> PIL.Image (RGBA, cropped, tinted)

    def add(self, mcmeta, name):
        if name in self._images:
            return
        raw = mcmeta.read_bytes(TEXTURE_PATH_TMPL.format(name=name))
        image = Image.open(io.BytesIO(raw)).convert("RGBA")
        width, height = image.size
        if height > width:  # animated: frames stacked vertically, take frame 0
            image = image.crop((0, 0, width, width))
        if name in DEFAULT_TINTS:
            image = _apply_tint(image, DEFAULT_TINTS[name])
        self._images[name] = image

    def add_image(self, name, image):
        """Inserts a texture that isn't sourced from mcmeta (e.g. the
        existing plain white fallback texture)."""
        if name in self._images:
            return
        self._images[name] = image.convert("RGBA")

    def pack(self):
        """Shelf-packs all added textures onto a fixed ATLAS_WIDTH x
        ATLAS_HEIGHT canvas. Returns (atlas_image, manifest) where manifest
        maps texture name -> {'x','y','w','h'}. Raises ValueError if the
        packed content doesn't fit."""
        entries = sorted(self._images.items(), key=lambda kv: -kv[1].height)
        shelf_x, shelf_y, shelf_height = 0, 0, 0
        manifest = {}
        placements = []
        for name, image in entries:
            w, h = image.size
            if shelf_x + w > ATLAS_WIDTH:
                shelf_x = 0
                shelf_y += shelf_height
                shelf_height = 0
            if shelf_y + h > ATLAS_HEIGHT:
                raise ValueError(
                    f"texture atlas overflowed its fixed {ATLAS_WIDTH}x{ATLAS_HEIGHT} "
                    f"canvas while placing '{name}' — increase ATLAS_HEIGHT"
                )
            placements.append((image, shelf_x, shelf_y))
            manifest[name] = {"x": shelf_x, "y": shelf_y, "w": w, "h": h}
            shelf_x += w
            shelf_height = max(shelf_height, h)

        atlas = Image.new("RGBA", (ATLAS_WIDTH, ATLAS_HEIGHT))
        for image, x, y in placements:
            atlas.paste(image, (x, y))
        return atlas, manifest


def _apply_tint(image, rgb):
    r, g, b = rgb
    tinted = image.copy()
    pixels = tinted.load()
    for py in range(tinted.height):
        for px in range(tinted.width):
            pr, pg, pb, pa = pixels[px, py]
            pixels[px, py] = (pr * r // 255, pg * g // 255, pb * b // 255, pa)
    return tinted
