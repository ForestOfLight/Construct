"""The colors Java multiplies a block's texture by, which we bake into the
atlas pixels because the renderer cannot tint a particle at draw time.

Two kinds. Most are a property of the texture itself - a greyscale grass or
leaf texture is always the same green - and live in DEFAULT_TINTS. Redstone
dust's is a property of the block *state* instead, one color per power level
off the same texture, so it travels in the texture name (see
atlas.packing.tinted) and gives each level its own atlas entry.
"""

# Maintained by hand, because a face's "tintindex" only says a block *may* be
# tinted: Java then looks the block up in its BlockColors registry and draws
# blocks with no entry there untinted. The two really do come apart - the
# stonecutter's saw faces carry tintindex 0 and are pure greyscale, but Java
# registers no color for stonecutter, so tinting on tintindex alone would
# turn its blade green.
#
# The textures needing an entry are the ones authored greyscale, since those
# are unusable without one.
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
    "block/attached_melon_stem": (225, 240, 93),
    "block/attached_pumpkin_stem": (225, 240, 93),
    "block/melon_stem": (225, 240, 93),
    "block/pumpkin_stem": (225, 240, 93),
    "block/water_still": (63, 118, 228),
    "block/water_flow": (63, 118, 228),
}

# Redstone dust's color per power level, 0-255. Java multiplies the wire's
# greyscale texture by this, so without it signal 0 and signal 15 come out
# identical. Bedrock's redstone_signal maps straight onto Java's power, so
# the level is always known.
#
# Hardcoded because the ramp is computed in RedStoneWireBlock's source and
# appears in no asset we fetch. Java's formula, for f = power / 15:
#   r = f * 0.6 + (0.4 if f > 0 else 0.3)
#   g = clamp(f * f * 0.7 - 0.5, 0, 1)
#   b = clamp(f * f * 0.6 - 0.7, 0, 1)
REDSTONE_POWER_TINTS = [
    (77, 0, 0),     # power 0
    (112, 0, 0),    # power 1
    (122, 0, 0),    # power 2
    (133, 0, 0),    # power 3
    (143, 0, 0),    # power 4
    (153, 0, 0),    # power 5
    (163, 0, 0),    # power 6
    (173, 0, 0),    # power 7
    (184, 0, 0),    # power 8
    (194, 0, 0),    # power 9
    (204, 0, 0),    # power 10
    (214, 0, 0),    # power 11
    (224, 0, 0),    # power 12
    (235, 7, 0),    # power 13
    (245, 28, 0),   # power 14
    (255, 51, 0),   # power 15
]


def state_tint(java_block_id, properties):
    """The color this particular block state's tinted faces take, or None if
    the block's color doesn't vary by state - the usual case, those being
    baked per texture from DEFAULT_TINTS."""
    if java_block_id == "minecraft:redstone_wire":
        return REDSTONE_POWER_TINTS[int(properties.get("power", 0))]
    return None
