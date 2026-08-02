"""Packs literal Java block textures into one atlas image, baking in default
tint colors for grass/leaves/etc., and produces a UV-rect manifest."""

import io

from PIL import Image

TEXTURE_PATH_TMPL = "assets/minecraft/textures/{name}.png"

# Default biome tint colors baked directly into the atlas pixels (RGB 0-255).
#
# This table has to be maintained by hand, because a face's "tintindex" only
# says a block *may* be tinted - Java then looks the block up in its
# BlockColors registry, and blocks with no entry there are drawn untinted.
# The two really do come apart: the stonecutter's saw faces carry
# tintindex 0 and are pure greyscale, but Java registers no color for
# stonecutter and draws them grey, so tinting everything with a tintindex
# would turn its blade green.
#
# The textures that need an entry are the ones authored greyscale, since
# those are unusable without one - that's what left grass block sides,
# short grass and large ferns rendering grey.
DEFAULT_TINTS = {
    "block/grass_block_top": (145, 189, 89),
    # the grass fringe drawn over the dirt on a grass block's four sides -
    # the dirt underneath is a separate, already-colored texture, which is
    # why only the fringe came out grey
    "block/grass_block_side_overlay": (145, 189, 89),
    "block/tall_grass_top": (145, 189, 89),
    "block/tall_grass_bottom": (145, 189, 89),
    "block/short_grass": (145, 189, 89),
    "block/fern": (145, 189, 89),
    "block/large_fern_top": (145, 189, 89),
    "block/large_fern_bottom": (145, 189, 89),
    "block/bush": (145, 189, 89),
    "block/pink_petals_stem": (145, 189, 89),
    "block/wildflowers_stem": (145, 189, 89),
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
    # redstone dust is absent here on purpose: its color is Java's power
    # ramp, which varies per block state rather than per texture, so it
    # travels in the texture name instead (see `tinted` and main.py's
    # REDSTONE_POWER_TINTS). Its overlay layer carries no tintindex at all
    # and so is drawn untinted, which one entry here could not express.
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


# Suffix appended to a texture name (e.g. "entity/chest/normal|fxfy") to
# request a mirrored copy - used for hardcoded block-entity shapes whose
# source data auto-unwraps a face's uv mirrored relative to the others
# (see model_resolver.resolve_elements's 'flip' field). Real mcmeta texture
# names never contain "|", so this is unambiguous.
_FLIP_TRANSFORMS = {"fx": Image.FLIP_LEFT_RIGHT, "fy": Image.FLIP_TOP_BOTTOM}

# Separator joining the layers of a composited texture, lowest first (e.g.
# "block/grass_block_side^block/grass_block_side_overlay"). Used where a
# model draws one element exactly over another and the renderer has no draw
# order to reproduce that with - see main.py's _merge_coincident_faces. Real
# mcmeta texture names never contain "^", so this stays unambiguous.
_COMPOSITE_SEP = "^"

# Separator introducing an explicit "RRGGBB" tint on a texture name (e.g.
# "block/redstone_dust_dot@ff3300"). DEFAULT_TINTS can only say "this
# texture is always this color", which is no use for a tint the block's own
# state decides - redstone dust is one color per power level, drawn from the
# same texture. Carrying the color in the name gives each level its own
# atlas entry, and applies per layer of a composite, so the dot model's
# untinted overlay isn't dragged along with the line underneath it. Real
# mcmeta texture names never contain "@", so this stays unambiguous.
_TINT_SEP = "@"


def compose_textures(*names):
    """Builds the composited name for `names` drawn in order, lowest first."""
    return _COMPOSITE_SEP.join(names)


def tinted(name, rgb):
    """Builds the name for `name` drawn tinted `rgb` (an 0-255 triple)."""
    return "{}{}{:02x}{:02x}{:02x}".format(name, _TINT_SEP, *rgb)


class TextureAtlas:
    def __init__(self):
        self._images = {}  # literal name -> PIL.Image (RGBA, cropped, tinted)

    def add(self, mcmeta, name):
        if name in self._images:
            return
        layers = [self._load(mcmeta, layer) for layer in name.split(_COMPOSITE_SEP)]
        image = layers[0]
        for layer in layers[1:]:
            if layer.size != image.size:
                # a layer authored at a different resolution to the one it
                # covers still has to line up pixel for pixel once composited
                layer = layer.resize(image.size, Image.NEAREST)
            image = Image.alpha_composite(image, layer)
        self._images[name] = image

    def _load(self, mcmeta, name):
        # Built as base|flip@tint (see main.py), so the tint comes off first.
        # The redstone dot's down face is both: its uv is written back-to-
        # front, and it takes the power tint.
        name, tint = _split_tint(name)
        base_name, flip = name.split("|", 1) if "|" in name else (name, "")
        raw = mcmeta.read_bytes(TEXTURE_PATH_TMPL.format(name=base_name))
        image = Image.open(io.BytesIO(raw)).convert("RGBA")
        width, height = image.size
        if height > width:  # animated: frames stacked vertically, take frame 0
            image = image.crop((0, 0, width, width))
        # an explicit tint is the caller's per-state decision, so it wins
        # over whatever the always-this-color table says
        if tint is None:
            tint = DEFAULT_TINTS.get(base_name)
        if tint is not None:
            image = _apply_tint(image, tint)
        for i in range(0, len(flip), 2):
            image = image.transpose(_FLIP_TRANSFORMS[flip[i:i + 2]])
        return image

    def is_opaque(self, name):
        """Whether every texel of an added texture is fully opaque.

        This is what decides whether a block can hide the faces of its
        neighbors (see main.py's mark_side_cover): a full side of glass
        or leaves is the same shape as one of stone, and only the alpha
        channel tells them apart. A single see-through texel is enough to
        disqualify a texture - the face behind it would show through exactly
        there - so this is an all-or-nothing test rather than a threshold.

        An unknown name is not opaque. That direction is the safe one: the
        cost of missing a cull is a particle that didn't need drawing, where
        the cost of a wrong cull is a hole in the model."""
        image = self._images.get(name)
        if image is None:
            return False
        return image.getextrema()[3][0] == 255

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
            if w > ATLAS_WIDTH or h > ATLAS_HEIGHT:
                raise ValueError(
                    f"texture '{name}' ({w}x{h}) is larger than the atlas canvas"
                )
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


def _split_tint(name):
    """'block/x@ff3300' -> ('block/x', (255, 51, 0)); a plain name keeps a
    tint of None so the caller can fall back to DEFAULT_TINTS."""
    if _TINT_SEP not in name:
        return name, None
    base_name, hex_rgb = name.split(_TINT_SEP, 1)
    return base_name, tuple(int(hex_rgb[i:i + 2], 16) for i in (0, 2, 4))


def _apply_tint(image, rgb):
    r, g, b = rgb
    tinted = image.copy()
    pixels = tinted.load()
    for py in range(tinted.height):
        for px in range(tinted.width):
            pr, pg, pb, pa = pixels[px, py]
            pixels[px, py] = (pr * r // 255, pg * g // 255, pb * b // 255, pa)
    return tinted
