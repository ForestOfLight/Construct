"""Hardcoded geometry for Java block-entity-rendered blocks (chest, banner,
...) whose mcmeta model has no static 'elements' at all - Java renders them
natively in code, not from data, so there's nothing to fetch. The shapes in
block_entity_models.json were derived from Blockbench .bbmodel exports of
the CEM Template Loader plugin's official templates (docs/chest.bbmodel,
docs/banner.bbmodel), converted by hand into this pipeline's elements/
textures shape - the same shape resolve_model would have produced from a
real mcmeta model chain."""

import json
from pathlib import Path

from blockstate_resolver import rotate_elements
from model_resolver import resolve_elements

_SHAPES_PATH = Path(__file__).resolve().parent / "block_entity_models.json"
_shapes = None

# Standard facing->y-rotation convention (matches every other directional
# block in this pipeline, e.g. furnace: facing=east needs y=90 to move its
# modeled-north face onto the east plane).
_FACING_TO_Y = {"north": 0, "east": 90, "south": 180, "west": 270}

# java_block_id -> {"shape": key into block_entity_models.json, "textures":
# overrides merged over the shape's own default "textures" dict}
_BLOCK_ENTITY_MAPPING = {
    "minecraft:chest": {"shape": "chest", "textures": {}},
    "minecraft:trapped_chest": {"shape": "chest", "textures": {"main": "entity/chest/trapped"}},
    "minecraft:ender_chest": {"shape": "chest", "textures": {"main": "entity/chest/ender"}},
}


def _load_shapes():
    global _shapes
    if _shapes is None:
        with open(_SHAPES_PATH, encoding="utf-8") as f:
            _shapes = json.load(f)
    return _shapes


def resolve_block_entity(java_block_id, properties):
    """Returns a resolved elements list (same shape as blockstate_resolver.
    resolve_java_state) for a known hardcoded block-entity shape, oriented
    by the block's 'facing' property if it has one. Returns None if
    java_block_id isn't one of the hardcoded shapes."""
    config = _BLOCK_ENTITY_MAPPING.get(java_block_id)
    if config is None:
        return None

    shape = _load_shapes()[config["shape"]]
    textures = {**shape["textures"], **config["textures"]}
    elements = resolve_elements(shape["elements"], textures)

    y_rot = _FACING_TO_Y.get(properties.get("facing"), 0)
    return rotate_elements(elements, 0, y_rot)
