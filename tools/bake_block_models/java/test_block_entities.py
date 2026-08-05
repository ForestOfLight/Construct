import unittest

from java.block_entities import resolve_block_entity


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

    def test_copper_chests_use_the_chest_shape_at_each_oxidation_stage(self):
        # Java draws these with the same chest renderer and ships one chest
        # texture per stage, so the only thing that varies is which
        for block, texture in (
            ("copper_chest", "entity/chest/copper"),
            ("exposed_copper_chest", "entity/chest/copper_exposed"),
            ("weathered_copper_chest", "entity/chest/copper_weathered"),
            ("oxidized_copper_chest", "entity/chest/copper_oxidized"),
        ):
            with self.subTest(block=block):
                elements = resolve_block_entity(f"minecraft:{block}", {"facing": "north"})
                self.assertEqual(len(elements), 3)
                textures = {face["texture"] for el in elements for face in el["faces"].values()}
                self.assertEqual(textures, {texture})

    def test_waxing_a_copper_chest_does_not_change_how_it_looks(self):
        # wax only stops it oxidizing further; Java draws a waxed chest with
        # the texture for the stage it is waxed at
        for block, texture in (
            ("waxed_copper_chest", "entity/chest/copper"),
            ("waxed_exposed_copper_chest", "entity/chest/copper_exposed"),
            ("waxed_weathered_copper_chest", "entity/chest/copper_weathered"),
            ("waxed_oxidized_copper_chest", "entity/chest/copper_oxidized"),
        ):
            with self.subTest(block=block):
                elements = resolve_block_entity(f"minecraft:{block}", {"facing": "north"})
                textures = {face["texture"] for el in elements for face in el["faces"].values()}
                self.assertEqual(textures, {texture})

    def test_a_copper_chest_turns_with_its_facing_like_any_other(self):
        east = resolve_block_entity("minecraft:copper_chest", {"facing": "east"})
        self.assertEqual(east[2]["faces"]["north"]["normal"], [1, 0, 0])

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


class ChestFaceUvTest(unittest.TestCase):
    """The chest shape was converted by hand from a CEM template's box-uv
    unwrap, and the unwrap's slots are named in Java's entity model space,
    which is flipped in Y and Z against the block space this pipeline works
    in. Three boxes came across with those slots taken at face value."""

    def _faces(self, element):
        chest = resolve_block_entity("minecraft:chest", {"facing": "north"})
        return {name: (
            [float(c) for c in face["uv"]], face["flip"],
        ) for name, face in chest[element]["faces"].items()}

    def test_the_base_takes_its_top_and_bottom_the_right_way_up(self):
        faces = self._faces(0)
        self.assertEqual(faces["up"], ([5.5, 4.75, 9.0, 8.25], "fx"))
        self.assertEqual(faces["down"], ([9.0, 7.75, 12.5, 11.25], "fxfy"))

    def test_the_lid_takes_its_top_and_bottom_the_right_way_up(self):
        faces = self._faces(1)
        self.assertEqual(faces["up"], ([5.5, 0.0, 9.0, 3.5], "fx"))
        self.assertEqual(faces["down"], ([9.0, 12.5, 12.5, 16.0], "fxfy"))

    def test_the_base_takes_its_front_from_the_back_of_the_unwrap(self):
        # the two width-w side slots are the front and back, and Z is the
        # other axis the entity space flips
        faces = self._faces(0)
        self.assertEqual(faces["north"], ([2.0, 5.25, 5.5, 7.75], "fxfy"))
        self.assertEqual(faces["south"], ([9.0, 5.25, 12.5, 7.75], "fxfy"))

    def test_the_lid_takes_its_front_from_the_back_of_the_unwrap(self):
        faces = self._faces(1)
        self.assertEqual(faces["north"], ([2.0, 11.25, 5.5, 12.5], "fxfy"))
        self.assertEqual(faces["south"], ([9.0, 11.25, 12.5, 12.5], "fxfy"))

    def test_every_upright_face_is_mirrored_both_ways(self):
        # entity space is this pipeline's block space turned about, so an
        # upright face keeps its slot but reads it upside down and back to
        # front - the top and bottom faces just swap slots instead
        base, lid, lock = self._faces(0), self._faces(1), self._faces(2)
        self.assertEqual(base["east"], ([12.5, 5.25, 16.0, 7.75], "fxfy"))
        self.assertEqual(base["west"], ([5.5, 5.25, 9.0, 7.75], "fxfy"))
        self.assertEqual(lid["east"], ([12.5, 11.25, 16.0, 12.5], "fxfy"))
        self.assertEqual(lid["west"], ([5.5, 11.25, 9.0, 12.5], "fxfy"))
        for name in ("north", "east", "south", "west"):
            self.assertEqual(lock[name][1], "fxfy", name)

    def test_no_face_asks_for_the_same_mirror_twice(self):
        # a mirror pair is spelled one way only, so the atlas keeps one copy
        # of it rather than one per spelling
        for element in range(3):
            for name, (_uv, flip) in self._faces(element).items():
                with self.subTest(element=element, face=name):
                    self.assertIn(flip, ("", "fx", "fy", "fxfy"))

    def test_the_lock_trades_top_and_bottom_slots_without_mirroring_them(self):
        # the lock takes the same slots the other boxes do, but its box is
        # unwrapped mirrored in x against theirs, so its horizontal faces
        # come out the other way round - confirmed against the render, which
        # is the only evidence there can be: every region of this box's
        # unwrap is symmetric, in all seven chest textures
        faces = self._faces(2)
        self.assertEqual(faces["up"], ([0.75, 0.0, 1.25, 0.25], ""))
        self.assertEqual(faces["down"], ([0.25, 15.75, 0.75, 16.0], "fy"))

    def test_all_three_boxes_flip_their_upright_faces_the_same_way(self):
        # one coordinate flip covers the whole shape
        for element in range(3):
            faces = self._faces(element)
            with self.subTest(element=element):
                for name in ("north", "east", "south", "west"):
                    self.assertEqual(faces[name][1], "fxfy", name)



if __name__ == "__main__":
    unittest.main()
