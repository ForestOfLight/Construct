"""Regolith filter: builds packs/RP/textures/particle/vanilla_block_atlas.png,
packs/BP/scripts/blockAtlas.js, and packs/BP/scripts/blockModels.js from Java
block model/texture data (misode/mcmeta) and Bedrock<->Java state mapping
(PrismarineJS/minecraft-data), for the textured block preview renderer.

Run it directly to regenerate these files in place (no regolith export):

    python filters/fetch_block_models/main.py
"""

import json
import os
import sys
from decimal import Decimal
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "lib"))
from js_data import render  # noqa: E402

from b2j_source import fetch_b2j, manifest_version, parse_java_state
from blockstate_resolver import resolve_java_state
from mcmeta_source import McmetaSource
from texture_atlas import TextureAtlas

WHITE_TEXTURE = "white"
_FULL_UV = [0, 0, 16, 16]
WHITE_CUBE_FACES = [
    {"center": [8, 16, 8], "width": 16, "height": 16, "normal": [0, 1, 0], "texture": WHITE_TEXTURE, "uv": _FULL_UV, "rotation": 0, "tintindex": -1},
    {"center": [8, 0, 8], "width": 16, "height": 16, "normal": [0, -1, 0], "texture": WHITE_TEXTURE, "uv": _FULL_UV, "rotation": 0, "tintindex": -1},
    {"center": [8, 8, 0], "width": 16, "height": 16, "normal": [0, 0, -1], "texture": WHITE_TEXTURE, "uv": _FULL_UV, "rotation": 0, "tintindex": -1},
    {"center": [8, 8, 16], "width": 16, "height": 16, "normal": [0, 0, 1], "texture": WHITE_TEXTURE, "uv": _FULL_UV, "rotation": 0, "tintindex": -1},
    {"center": [16, 8, 8], "width": 16, "height": 16, "normal": [1, 0, 0], "texture": WHITE_TEXTURE, "uv": _FULL_UV, "rotation": 0, "tintindex": -1},
    {"center": [0, 8, 8], "width": 16, "height": 16, "normal": [-1, 0, 0], "texture": WHITE_TEXTURE, "uv": _FULL_UV, "rotation": 0, "tintindex": -1},
]


def root_dir():
    root = os.environ.get("ROOT_DIR")
    return Path(root) if root else Path(__file__).resolve().parents[2]


def load_manifest(root):
    with open(root / "packs" / "BP" / "manifest.json", encoding="utf-8") as f:
        return json.load(f)


def build_block_models(mcmeta, b2j, atlas):
    """Returns {bedrock_state_str: [face, ...]}, faces still carrying a
    'texture' name (not yet projected into atlas-pixel UV)."""
    block_models = {}
    for bedrock_state, java_state in b2j.items():
        java_block_id, properties = parse_java_state(java_state)
        elements = resolve_java_state(mcmeta, java_block_id, properties)
        if not elements:
            block_models[bedrock_state] = [dict(face) for face in WHITE_CUBE_FACES]
            continue
        faces = []
        for element in elements:
            for face in element["faces"].values():
                atlas.add(mcmeta, face["texture"])
                faces.append({
                    "center": face["center"],
                    "width": face["width"],
                    "height": face["height"],
                    "normal": face["normal"],
                    "texture": face["texture"],
                    "uv": face["uv"],
                    "rotation": face["rotation"],
                    "tintindex": face["tintindex"],
                })
        block_models[bedrock_state] = faces
    return block_models


def project_uv(block_models, atlas_manifest):
    """Replaces each face's 'texture' name and Java-space (0-16) 'uv'
    sub-rect with its final atlas-pixel 'uv' rect. A face's own uv is often
    smaller than the whole texture (e.g. a fence post's narrow faces only
    sample a thin strip) - using the whole texture's rect regardless would
    squish the entire texture into that smaller face."""
    white_rect = atlas_manifest.get(WHITE_TEXTURE)
    for faces in block_models.values():
        for face in faces:
            texture = face.pop("texture")
            u0, v0, u1, v1 = (Decimal(c) for c in face.pop("uv"))
            rect = atlas_manifest.get(texture, white_rect)
            face["uv"] = {
                "x": rect["x"] + (u0 / 16) * rect["w"],
                "y": rect["y"] + (v0 / 16) * rect["h"],
                "w": ((u1 - u0) / 16) * rect["w"],
                "h": ((v1 - v0) / 16) * rect["h"],
            }
    return block_models


def build_face_types_and_refs(block_models):
    """Deduplicates each face's full descriptor (shape + uv together) into a
    shared face-type table, replacing each block's face list with a flat list
    of integer indices into that table. Mutates and returns block_models;
    also returns the shared face_types list. Call this AFTER project_uv
    (faces must already have 'uv' set, not 'texture')."""
    face_type_index = {}
    face_types = []
    for bedrock_state, faces in block_models.items():
        refs = []
        for face in faces:
            uv = face["uv"]
            key = (
                tuple(face["center"]), face["width"], face["height"], tuple(face["normal"]),
                face["rotation"], face["tintindex"],
                uv["x"], uv["y"], uv["w"], uv["h"],
            )
            if key not in face_type_index:
                face_type_index[key] = len(face_types)
                face_types.append({
                    "center": face["center"],
                    "width": face["width"],
                    "height": face["height"],
                    "normal": face["normal"],
                    "rotation": face["rotation"],
                    "tintindex": face["tintindex"],
                    "uv": uv,
                })
            refs.append(face_type_index[key])
        block_models[bedrock_state] = refs
    return face_types, block_models


def build(root):
    manifest = load_manifest(root)
    version = manifest_version(manifest)
    b2j = fetch_b2j(version)
    mcmeta = McmetaSource.download()

    atlas = TextureAtlas()
    white_path = root / "packs" / "RP" / "textures" / "particle" / "white.png"
    atlas.add_image(WHITE_TEXTURE, Image.open(white_path))

    block_models = build_block_models(mcmeta, b2j, atlas)
    atlas_image, atlas_manifest = atlas.pack()
    white_rect = atlas_manifest[WHITE_TEXTURE]
    block_models = project_uv(block_models, atlas_manifest)
    face_types, block_models = build_face_types_and_refs(block_models)
    return atlas_image, white_rect, face_types, block_models


def write_outputs(root, atlas_image, white_rect, face_types, block_models):
    atlas_path = root / "packs" / "RP" / "textures" / "particle" / "vanilla_block_atlas.png"
    atlas_image.save(atlas_path)

    atlas_js_path = root / "packs" / "BP" / "scripts" / "blockAtlas.js"
    atlas_js_contents = (
        f"export const atlasWidth = {atlas_image.width};\n"
        f"export const atlasHeight = {atlas_image.height};\n\n"
        # so runtime fallback geometry (e.g. BlockModelLookup's WHITE_CUBE_FACES)
        # can point at the real white swatch instead of a hardcoded pixel guess
        "export const whiteUvRect = " + render({
            "x": white_rect["x"], "y": white_rect["y"], "w": white_rect["w"], "h": white_rect["h"],
        }) + ";"
    )
    atlas_js_path.write_text(atlas_js_contents, encoding="utf-8")

    models_js_path = root / "packs" / "BP" / "scripts" / "blockModels.js"
    models_js_contents = (
        "export const blockFaceTypes = " + render(face_types) + ";\n\n"
        "export const blockModels = " + render(block_models) + ";"
    )
    models_js_path.write_text(models_js_contents, encoding="utf-8")

    print(f"[fetch_block_models] wrote {atlas_path}, {atlas_js_path}, {models_js_path}")


def main():
    root = root_dir()
    atlas_image, white_rect, face_types, block_models = build(root)
    write_outputs(root, atlas_image, white_rect, face_types, block_models)


if __name__ == "__main__":
    main()
