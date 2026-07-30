import unittest

from block_entity_models import resolve_block_entity


class ResolveBlockEntityTest(unittest.TestCase):
    def test_returns_none_for_an_unmapped_block(self):
        self.assertIsNone(resolve_block_entity("minecraft:stone", {}))

    def test_chest_resolves_to_the_hardcoded_shape(self):
        elements = resolve_block_entity("minecraft:chest", {"facing": "north"})
        self.assertEqual(len(elements), 3)  # base, lid, knob

    def test_chest_faces_use_the_normal_chest_texture(self):
        elements = resolve_block_entity("minecraft:chest", {"facing": "north"})
        textures = {face["texture"] for el in elements for face in el["faces"].values()}
        self.assertEqual(textures, {"entity/chest/normal"})

    def test_trapped_chest_uses_the_trapped_texture(self):
        elements = resolve_block_entity("minecraft:trapped_chest", {"facing": "north"})
        textures = {face["texture"] for el in elements for face in el["faces"].values()}
        self.assertEqual(textures, {"entity/chest/trapped"})

    def test_ender_chest_uses_the_ender_texture(self):
        elements = resolve_block_entity("minecraft:ender_chest", {"facing": "north"})
        textures = {face["texture"] for el in elements for face in el["faces"].values()}
        self.assertEqual(textures, {"entity/chest/ender"})

    def test_banner_is_not_a_hardcoded_shape(self):
        # banner color lives in block-entity NBT, not the blockstate, so
        # the bedrock<->java mapping can't pick a real per-color texture -
        # left unmapped for now so it falls back to the plain white unknown
        # cube instead of an arbitrary fixed color
        self.assertIsNone(resolve_block_entity("minecraft:black_banner", {"rotation": "0"}))
        self.assertIsNone(resolve_block_entity("minecraft:black_wall_banner", {"facing": "north"}))

    def test_facing_east_rotates_the_knob_off_the_unrotated_north_face(self):
        # unrotated (facing=north), the knob protrudes on the "north" face
        # slot (normal [0,0,-1], matching every other directional block's
        # facing=north default in this pipeline)
        north = resolve_block_entity("minecraft:chest", {"facing": "north"})
        knob_north = north[2]
        self.assertEqual(knob_north["faces"]["north"]["normal"], [0, 0, -1])

        # facing=east (y=90) must rotate that same protruding face's normal
        # onto the east (+x) plane, exactly like furnace's facing=east (the
        # face dict key itself doesn't change, only the geometry inside it)
        east = resolve_block_entity("minecraft:chest", {"facing": "east"})
        knob_east = east[2]
        self.assertEqual(knob_east["faces"]["north"]["normal"], [1, 0, 0])


if __name__ == "__main__":
    unittest.main()
