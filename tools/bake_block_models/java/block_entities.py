"""Hardcoded geometry for Java block-entity-rendered blocks (chest, shulker
box, ...) whose mcmeta model has no static 'elements' at all - Java renders
them natively in code, so there is nothing to fetch. The shapes in
block_entity_shapes.json were derived from Blockbench .bbmodel exports of the
CEM Template Loader plugin's official templates (docs/chest.bbmodel),
converted by hand into the elements/textures shape resolve_model produces.

end_portal and end_gateway are the entries not traced from a real Java shape.
Java draws both with a bespoke starfield renderer and ships no geometry for
either, so they can only ever be stand-ins, sized the way Java draws the
effect: the portal a flat sheet at the height its surface sits, the gateway a
full cube, since Java draws a gateway across the whole block.

Both borrow end stone for their texture. Neither block has an item form to
fall back on the way barrier and the light blocks do, and the two more
faithful sources were both weighed and turned down: their models name
block/obsidian as their particle, and the starfield Java's shader really
samples is ~88% pure black, which reads as a hole in the build on a preview
block meant to be identified at a glance. End stone at least places them in
the End."""

import json
from pathlib import Path

from java.blockstates import rotate_elements
from java.models import resolve_elements

_SHAPES_PATH = Path(__file__).resolve().parent / "block_entity_shapes.json"
_shapes = None

_FACING_TO_Y = {"north": 0, "east": 90, "south": 180, "west": 270}

# java_block_id -> {"shape": key into block_entity_shapes.json, "textures":
# overrides merged over the shape's own default "textures" dict}
_BLOCK_ENTITY_MAPPING = {
    "minecraft:chest": {"shape": "chest", "textures": {}},
    "minecraft:trapped_chest": {"shape": "chest", "textures": {"main": "entity/chest/trapped"}},
    "minecraft:ender_chest": {"shape": "chest", "textures": {"main": "entity/chest/ender"}},
    "minecraft:shulker_box": {"shape": "shulker_box", "textures": {}},
    "minecraft:end_portal": {"shape": "end_portal", "textures": {}},
    "minecraft:end_gateway": {"shape": "end_gateway", "textures": {}},
}
# Copper chests are the same chest renderer with one texture per oxidation
# stage. Waxing only stops a chest oxidizing further, so a waxed chest is
# drawn exactly like the stage it was waxed at - hence both ids per texture.
_COPPER_CHEST_TEXTURES = {
    "copper_chest": "entity/chest/copper",
    "exposed_copper_chest": "entity/chest/copper_exposed",
    "weathered_copper_chest": "entity/chest/copper_weathered",
    "oxidized_copper_chest": "entity/chest/copper_oxidized",
}
for _chest, _texture in _COPPER_CHEST_TEXTURES.items():
    for _id in (_chest, f"waxed_{_chest}"):
        _BLOCK_ENTITY_MAPPING[f"minecraft:{_id}"] = {
            "shape": "chest", "textures": {"main": _texture},
        }

_DYE_COLORS = [
    "white", "orange", "magenta", "light_blue", "yellow", "lime", "pink", "gray",
    "light_gray", "cyan", "purple", "blue", "brown", "green", "red", "black",
]
for _color in _DYE_COLORS:
    _BLOCK_ENTITY_MAPPING[f"minecraft:{_color}_shulker_box"] = {
        "shape": "shulker_box", "textures": {"main": f"entity/shulker/shulker_{_color}"},
    }


def _load_shapes():
    global _shapes
    if _shapes is None:
        with open(_SHAPES_PATH, encoding="utf-8") as f:
            _shapes = json.load(f)
    return _shapes


def resolve_block_entity(java_block_id, properties):
    """A resolved elements list for a known hardcoded block-entity shape,
    turned to face the way the block's own properties say. None if
    java_block_id isn't one of the hardcoded shapes."""
    config = _BLOCK_ENTITY_MAPPING.get(java_block_id)
    if config is None:
        return None
    shape = _load_shapes()[config["shape"]]
    textures = {**shape["textures"], **config["textures"]}
    elements = resolve_elements(shape["elements"], textures)
    return rotate_elements(elements, 0, _y_rotation(properties))


def _y_rotation(properties):
    if "facing" in properties:
        return _FACING_TO_Y.get(properties["facing"], 0)
    if "rotation" in properties:
        # a standing banner turns in 16 steps of 22.5 degrees, rather than
        # by the 4-way "facing" every other directional block here uses
        return int(properties["rotation"]) * 22.5
    return 0
