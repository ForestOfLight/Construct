"""Writes the three files a bake produces: the atlas image, and the two
generated JS modules the renderer imports."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "lib"))
from js_data import render, render_rows  # noqa: E402

from face_table import FACE_ROW_WIDTH, flatten_face_types  # noqa: E402

ATLAS_IMAGE_PATH = ("packs", "RP", "textures", "particle", "vanilla_block_atlas.png")
ATLAS_MODULE_PATH = ("packs", "BP", "scripts", "blockAtlas.js")
MODELS_MODULE_PATH = ("packs", "BP", "scripts", "blockModels.js")


def write_outputs(root, bake):
    atlas_path = root.joinpath(*ATLAS_IMAGE_PATH)
    atlas_module_path = root.joinpath(*ATLAS_MODULE_PATH)
    models_module_path = root.joinpath(*MODELS_MODULE_PATH)

    bake.atlas_image.save(atlas_path)
    atlas_module_path.write_text(_atlas_module(bake), encoding="utf-8")
    models_module_path.write_text(_models_module(bake), encoding="utf-8")

    print(f"[fetch_block_models] wrote {atlas_path}, {atlas_module_path}, "
          f"{models_module_path}")


def _atlas_module(bake):
    rect = bake.white_rect
    return (
        f"export const atlasWidth = {bake.atlas_image.width};\n"
        f"export const atlasHeight = {bake.atlas_image.height};\n\n"
        # so runtime fallback geometry (BlockModelLookup's WHITE_CUBE_FACES)
        # can point at the real white swatch instead of a hardcoded guess
        "export const whiteUvRect = " + render({
            "x": rect["x"], "y": rect["y"], "w": rect["w"], "h": rect["h"],
        }) + ";"
    )


def _models_module(bake):
    face_rows, missing_faces = flatten_face_types(bake.face_types)
    return (
        # one face per line, FACE_ROW_WIDTH bare numbers laid out as
        # face_table.FACE_ROW_FIELDS says
        "export const blockFaceData = " + render_rows(face_rows, FACE_ROW_WIDTH) + ";\n\n"
        # the faces standing for something the pipeline could not resolve,
        # drawn in the unresolved color - too few to be worth a column
        "export const blockMissingFaces = " + render(missing_faces) + ";\n\n"
        # keyed on only the properties that choose between a block's models,
        # so the renderer needs blockKeySpecs to build a key that hits
        "export const blockModels = " + render(bake.block_models) + ";\n\n"
        "export const blockKeySpecs = " + render(bake.key_specs) + ";"
    )
