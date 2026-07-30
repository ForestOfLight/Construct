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
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "lib"))
from js_data import render  # noqa: E402

from b2j_source import fetch_b2j, manifest_version, parse_java_state
from blockstate_resolver import resolve_java_state
from mcmeta_source import McmetaSource
from texture_atlas import TextureAtlas

WHITE_TEXTURE = "white"
WHITE_CUBE_FACES = [
    {"from": [0, 16, 0], "to": [16, 16, 16], "axis": "xz", "texture": WHITE_TEXTURE, "rotation": 0, "tintindex": -1},
    {"from": [0, 0, 0], "to": [16, 0, 16], "axis": "xz", "texture": WHITE_TEXTURE, "rotation": 0, "tintindex": -1},
    {"from": [0, 0, 0], "to": [16, 16, 0], "axis": "xy", "texture": WHITE_TEXTURE, "rotation": 0, "tintindex": -1},
    {"from": [0, 0, 16], "to": [16, 16, 16], "axis": "xy", "texture": WHITE_TEXTURE, "rotation": 0, "tintindex": -1},
    {"from": [16, 0, 0], "to": [16, 16, 16], "axis": "yz", "texture": WHITE_TEXTURE, "rotation": 0, "tintindex": -1},
    {"from": [0, 0, 0], "to": [0, 16, 16], "axis": "yz", "texture": WHITE_TEXTURE, "rotation": 0, "tintindex": -1},
]

def _axis_from_rect(from_pt, to_pt):
    """Derives which plane a face's flat rect lies on from its own geometry
    (rather than trusting the original Java face name), since block rotation
    can move a face onto a different axis than its name suggests."""
    if from_pt[0] == to_pt[0]:
        return "yz"
    if from_pt[1] == to_pt[1]:
        return "xz"
    return "xy"


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
                    "from": face["from"],
                    "to": face["to"],
                    "axis": _axis_from_rect(face["from"], face["to"]),
                    "texture": face["texture"],
                    "rotation": face["rotation"],
                    "tintindex": face["tintindex"],
                })
        block_models[bedrock_state] = faces
    return block_models


def project_uv(block_models, atlas_manifest):
    """Replaces each face's 'texture' name with its final atlas-pixel 'uv' rect."""
    white_rect = atlas_manifest.get(WHITE_TEXTURE)
    for faces in block_models.values():
        for face in faces:
            texture = face.pop("texture")
            rect = atlas_manifest.get(texture, white_rect)
            face["uv"] = {"x": rect["x"], "y": rect["y"], "w": rect["w"], "h": rect["h"]}
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
                tuple(face["from"]), tuple(face["to"]), face["axis"],
                face["rotation"], face["tintindex"],
                uv["x"], uv["y"], uv["w"], uv["h"],
            )
            if key not in face_type_index:
                face_type_index[key] = len(face_types)
                face_types.append({
                    "from": face["from"],
                    "to": face["to"],
                    "axis": face["axis"],
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
    block_models = project_uv(block_models, atlas_manifest)
    face_types, block_models = build_face_types_and_refs(block_models)
    return atlas_image, face_types, block_models


def write_outputs(root, atlas_image, face_types, block_models):
    atlas_path = root / "packs" / "RP" / "textures" / "particle" / "vanilla_block_atlas.png"
    atlas_image.save(atlas_path)

    atlas_js_path = root / "packs" / "BP" / "scripts" / "blockAtlas.js"
    atlas_js_contents = (
        f"export const atlasWidth = {atlas_image.width};\n"
        f"export const atlasHeight = {atlas_image.height};"
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
    atlas_image, face_types, block_models = build(root)
    write_outputs(root, atlas_image, face_types, block_models)


if __name__ == "__main__":
    main()
