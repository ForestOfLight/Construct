"""Hardcoded geometry for Java block-entity-rendered blocks (chest, shulker
box, ...) whose mcmeta model has no static 'elements' at all - Java renders
them natively in code, not from data, so there's nothing to fetch. The shapes
in block_entity_models.json were derived from Blockbench .bbmodel exports of
the CEM Template Loader plugin's official templates (docs/chest.bbmodel),
converted by hand into this pipeline's elements/textures shape - the same
shape resolve_model would have produced from a real mcmeta model chain.

end_portal and end_gateway are the entries not traced from a real Java shape.
Java draws both with a bespoke starfield renderer and ships no geometry for
either (their models are nothing but a particle reference), so they can only
ever be stand-ins, sized the way Java draws the effect. The portal is a flat
sheet at the height its surface sits; the gateway is a full cube, because
Java draws a gateway across the whole block rather than on one plane.

Both borrow end stone for their texture. Neither block has an item form in
Java, so there is no item texture to fall back on the way barrier and the
light blocks do. Two more faithful sources do exist and were both weighed
and turned down: their models name block/obsidian as their particle, and
textures/entity/end_portal/end_portal.png is the starfield Java's shader
really samples - but that image is ~88% pure black, and a preview block is
meant to be identified at a glance, where near-solid black reads as a hole
in the build. End stone at least places them in the End."""

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
    "minecraft:shulker_box": {"shape": "shulker_box", "textures": {}},
    "minecraft:end_portal": {"shape": "end_portal", "textures": {}},
    "minecraft:end_gateway": {"shape": "end_gateway", "textures": {}},
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

    if "facing" in properties:
        y_rot = _FACING_TO_Y.get(properties["facing"], 0)
    elif "rotation" in properties:
        # standing banner: 16 steps of 22.5 degrees around y, rather than
        # the 4-way "facing" every other directional block in this
        # pipeline uses
        y_rot = int(properties["rotation"]) * 22.5
    else:
        y_rot = 0
    return rotate_elements(elements, 0, y_rot)
