"""Moves faces from naming a texture and a slice of it in Java's 0-16 space
to naming a rectangle of atlas pixels."""

from decimal import Decimal

from PIL import Image

WHITE_TEXTURE = "white"

# The white swatch is the one texture stretched across a whole block face at
# full size - the missing-block cube and the plain outline cube sample
# nothing else - so the renderer magnifies it far harder than any real block
# texture. A single white texel could not survive that: filtering and
# mipmapping average a magnified quad against its neighbors, which for a lone
# texel are the transparent gaps of the atlas, so the cube's edges faded away
# and visibly stopped meeting (#18). A 16x16 footprint is a power of two, so
# halving it per mip level keeps averaging white with white.
_WHITE_SWATCH_SIZE = 16

# Sampled half a texel in from each edge, so the outermost points the
# renderer reads are swatch texel centers rather than the boundary the swatch
# shares with whatever the packer put beside it.
_HALF_TEXEL = Decimal("0.5")

_JAVA_UV_SPAN = Decimal(16)


def white_swatch(image):
    """Blows the pack's plain white texture up to the swatch footprint the
    atlas needs. NEAREST so the color stays exactly what the asset says."""
    return image.convert("RGBA").resize(
        (_WHITE_SWATCH_SIZE, _WHITE_SWATCH_SIZE), Image.NEAREST
    )


def inset_by_half_texel(rect):
    return {
        "x": rect["x"] + _HALF_TEXEL,
        "y": rect["y"] + _HALF_TEXEL,
        "w": rect["w"] - 2 * _HALF_TEXEL,
        "h": rect["h"] - 2 * _HALF_TEXEL,
    }


def project_uv(block_models, atlas_manifest):
    """Replaces each face's 'texture' name and Java-space 'uv' rect with the
    atlas-pixel rect it samples. Mutates and returns `block_models`.

    A face's own uv is often a slice of its texture rather than all of it - a
    fence post's narrow faces sample a thin strip - so the texture's whole
    rect would squash the entire texture into that smaller face.

    Width and height come straight off the raw uv numbers with no reordering:
    the quad's width was measured along the texture's u axis and its height
    along v (see geometry.billboard.face_size), so the spans always pair up the
    same way however the face has been rotated. Rotation shows up as the
    face's roll instead."""
    white_rect = atlas_manifest.get(WHITE_TEXTURE)
    for faces in block_models.values():
        for face in faces:
            texture = face.pop("texture")
            u0, v0, u1, v1 = (Decimal(c) for c in face.pop("uv"))
            rect = atlas_manifest.get(texture)
            if rect is None:
                # a face whose texture never made it into the atlas has
                # nothing to draw; flag it so the renderer shows it as
                # unresolved rather than silently drawing a blank white quad
                rect = white_rect
                face["missing"] = True
            face["uv"] = {
                "x": rect["x"] + (min(u0, u1) / _JAVA_UV_SPAN) * rect["w"],
                "y": rect["y"] + (min(v0, v1) / _JAVA_UV_SPAN) * rect["h"],
                "w": (abs(u1 - u0) / _JAVA_UV_SPAN) * rect["w"],
                "h": (abs(v1 - v0) / _JAVA_UV_SPAN) * rect["h"],
            }
    return block_models
