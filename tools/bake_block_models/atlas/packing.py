"""Packs the literal Java block textures a bake needs into one atlas image,
baking in the tints Java would apply at draw time, and reports where each one
landed."""

import io

from PIL import Image

from atlas.tints import DEFAULT_TINTS

TEXTURE_PATH_TMPL = "assets/minecraft/textures/{name}.png"

# The canvas is a fixed size regardless of how much is packed into it (unused
# space stays transparent), because the particle JSON files that sample this
# atlas must hardcode texture_width/texture_height as literal numbers -
# Bedrock particles don't accept Molang expressions for those two fields.
ATLAS_WIDTH = 1024
ATLAS_HEIGHT = 1024

# A texture name is built as "base|flip@tint", each part optional. None of
# "|", "^" or "@" can appear in a real mcmeta texture name, so the encoding
# stays unambiguous.
#
# A flip asks for a mirrored copy, for hardcoded block-entity shapes whose
# source data auto-unwraps a face's uv mirrored relative to the others (see
# java.models.resolve_elements). A composite is layers drawn in order,
# lowest first, where a model draws one element exactly over another and the
# renderer has no draw order to reproduce that with (see
# blocks.face_reduction.merge_coincident_faces). An explicit tint is one the block's
# state decides rather than the texture, and applies per layer of a
# composite, so redstone's untinted overlay isn't dragged along with the line
# underneath it.
_FLIP_TRANSFORMS = {"fx": Image.FLIP_LEFT_RIGHT, "fy": Image.FLIP_TOP_BOTTOM}
_FLIP_SEP = "|"
_COMPOSITE_SEP = "^"
_TINT_SEP = "@"


def compose_textures(*names):
    """Builds the composited name for `names` drawn in order, lowest first."""
    return _COMPOSITE_SEP.join(names)


def tinted(name, rgb):
    """Builds the name for `name` drawn tinted `rgb` (an 0-255 triple)."""
    return "{}{}{:02x}{:02x}{:02x}".format(name, _TINT_SEP, *rgb)


def flipped(name, flip):
    """Builds the name for `name` mirrored as `flip` says ("fx", "fy" or
    "fxfy"); an empty flip leaves the name alone."""
    return f"{name}{_FLIP_SEP}{flip}" if flip else name


class TextureAtlas:
    def __init__(self):
        self._images = {}

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

    def add_image(self, name, image):
        """Inserts a texture that isn't sourced from mcmeta, such as the
        pack's own plain white fallback."""
        if name in self._images:
            return
        self._images[name] = image.convert("RGBA")

    def is_opaque(self, name):
        """Whether every texel of an added texture is fully opaque, which is
        what decides whether a block can hide its neighbors' faces: a full
        side of glass is the same shape as one of stone, and only the alpha
        channel tells them apart. A single see-through texel disqualifies a
        texture, since the face behind it would show through exactly there.

        An unknown name is not opaque. A missed cull costs a particle that
        didn't need drawing; a wrong cull is a hole in the model."""
        image = self._images.get(name)
        if image is None:
            return False
        return image.getextrema()[3][0] == 255

    def pack(self):
        """Shelf-packs every added texture onto the fixed canvas. Returns
        (atlas_image, manifest), where manifest maps texture name ->
        {'x','y','w','h'}. Raises ValueError if the content doesn't fit."""
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

    def _load(self, mcmeta, name):
        # The redstone dot's down face is the case that needs both: its uv is
        # written back-to-front, and it takes the power tint.
        name, tint = _split_tint(name)
        base_name, flip = _split_flip(name)
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


def _split_tint(name):
    """'block/x@ff3300' -> ('block/x', (255, 51, 0)); a plain name keeps a
    tint of None so the caller can fall back to DEFAULT_TINTS."""
    if _TINT_SEP not in name:
        return name, None
    base_name, hex_rgb = name.split(_TINT_SEP, 1)
    return base_name, tuple(int(hex_rgb[i:i + 2], 16) for i in (0, 2, 4))


def _split_flip(name):
    """'block/x|fxfy' -> ('block/x', 'fxfy')."""
    if _FLIP_SEP not in name:
        return name, ""
    return name.split(_FLIP_SEP, 1)


def _apply_tint(image, rgb):
    r, g, b = rgb
    result = image.copy()
    pixels = result.load()
    for py in range(result.height):
        for px in range(result.width):
            pr, pg, pb, pa = pixels[px, py]
            pixels[px, py] = (pr * r // 255, pg * g // 255, pb * b // 255, pa)
    return result
