"""Builds packs/RP/textures/particle/vanilla_block_atlas.png,
packs/BP/scripts/blockAtlas.js, and packs/BP/scripts/blockModels.js from Java
block model/texture data (misode/mcmeta) and Bedrock<->Java state mapping
(PrismarineJS/minecraft-data), for the textured block preview renderer.

Run it directly, from anywhere, to regenerate those three files in place:

    python tools/bake_block_models/main.py

Needs Pillow (see requirements.txt) and pulls ~100MB over the network, so it
is a deliberate step to run when Minecraft updates rather than something a
build triggers. Regolith also runs it as the `fetch_block_models` filter on
the release profile; the only difference there is that ROOT_DIR points at the
project root, since a filter's working directory is regolith's temp export.
"""

import json
import os
from dataclasses import dataclass
from pathlib import Path

from PIL import Image

from atlas_uv import WHITE_TEXTURE, inset_by_half_texel, project_uv, white_swatch
from b2j_fixups import rekey_hanging_signs
from b2j_source import fetch_b2j, manifest_version
from block_models import build_block_models
from face_reduction import ReductionStats
from face_table import build_face_types_and_refs
from key_specs import build_key_specs
from mcmeta_source import McmetaSource
from neighbor_culling import mark_side_cover
from output import write_outputs
from texture_atlas import TextureAtlas

MANIFEST_PATH = ("packs", "BP", "manifest.json")
WHITE_TEXTURE_PATH = ("packs", "RP", "textures", "particle", "white.png")


@dataclass
class Bake:
    """Everything a run produces, ready to be written out."""
    atlas_image: Image.Image
    white_rect: dict
    face_types: list
    block_models: dict
    key_specs: dict


def root_dir():
    root = os.environ.get("ROOT_DIR")
    return Path(root) if root else Path(__file__).resolve().parents[2]


def load_manifest(root):
    with open(root.joinpath(*MANIFEST_PATH), encoding="utf-8") as f:
        return json.load(f)


def build(root):
    b2j = rekey_hanging_signs(fetch_b2j(manifest_version(load_manifest(root))))
    mcmeta = McmetaSource.download()

    atlas = TextureAtlas()
    atlas.add_image(
        WHITE_TEXTURE, white_swatch(Image.open(root.joinpath(*WHITE_TEXTURE_PATH)))
    )

    stats = ReductionStats()
    block_models = build_block_models(mcmeta, b2j, atlas, stats)
    _report(stats.summary())

    # while the faces still name their textures, which is what says whether a
    # block is see-through - project_uv drops the names a few lines down
    opaque_faces = mark_side_cover(block_models, atlas)
    _report(f"{opaque_faces} faces seal their side of the block opaquely, "
            f"and may hide a neighbor's")

    atlas_image, atlas_manifest = atlas.pack()
    # Everything that samples the swatch - the exported whiteUvRect and
    # project_uv's fallback for a texture that never made it into the atlas -
    # must stay inside it, so inset the rect once, here, where it's packed.
    white_rect = atlas_manifest[WHITE_TEXTURE] = inset_by_half_texel(
        atlas_manifest[WHITE_TEXTURE]
    )

    block_models = project_uv(block_models, atlas_manifest)
    face_types, block_models = build_face_types_and_refs(block_models)
    key_specs, block_models = build_key_specs(block_models)
    return Bake(atlas_image, white_rect, face_types, block_models, key_specs)


def _report(message):
    print(f"[fetch_block_models] {message}")


def main():
    root = root_dir()
    write_outputs(root, build(root))


if __name__ == "__main__":
    main()
