import unittest
from decimal import Decimal

from block_models import build_block_models
from fakes import FakeAtlas, FakeMcmeta
from stand_in_shapes import WHITE_CUBE_FACES


class ParticleTextureFallbackTest(unittest.TestCase):
    """A block whose model draws nothing at all (barrier, light, the fluids)
    is not broken data - Java just renders it some other way. Where the model
    names a texture we can honestly stand in with, draw a cube of it rather
    than the see-through blue 'we have no idea' cube."""

    def _mcmeta(self, particle, block="barrier"):
        return FakeMcmeta(
            blockstates={block: {"variants": {"": {"model": f"block/{block}"}}}},
            models={f"block/{block}": {"textures": {"particle": particle}}},
        )

    def _faces(self, particle, block="barrier"):
        atlas = FakeAtlas()
        b2j = {f"minecraft:{block}[]": f"minecraft:{block}"}
        faces = build_block_models(self._mcmeta(particle, block), b2j, atlas)[f"minecraft:{block}[]"]
        return faces, atlas

    def test_item_texture_becomes_a_full_cube_of_that_texture(self):
        faces, atlas = self._faces("item/barrier")
        self.assertEqual(len(faces), 6)
        self.assertEqual({face["texture"] for face in faces}, {"item/barrier"})
        self.assertIn("item/barrier", atlas.added)
        # it stood in for a block Java draws deliberately, so it isn't the
        # unresolved-data cube and must not be flagged as one
        for face in faces:
            self.assertFalse(face.get("missing", False))
        self.assertEqual({tuple(face["normal"]) for face in faces}, {
            (0, 1, 0), (0, -1, 0), (0, 0, -1), (0, 0, 1), (1, 0, 0), (-1, 0, 0),
        })

    def test_fluids_stand_in_with_their_still_texture(self):
        faces, _ = self._faces("block/water_still", block="water")
        self.assertEqual({face["texture"] for face in faces}, {"block/water_still"})

    def test_a_bubble_column_stands_in_with_the_bubble_particle(self):
        # its model is block/water, so the particle it names is water_still -
        # the bubbles are particles, not part of any model
        faces, atlas = self._faces("block/water_still", block="bubble_column")
        self.assertEqual({face["texture"] for face in faces}, {"particle/bubble"})
        self.assertIn("particle/bubble", atlas.added)

    def test_a_block_texture_on_anything_else_stays_a_missing_cube(self):
        # a skull's particle is block/soul_sand: standing in with it would
        # draw a soul sand cube and hide that the block entity is unmodelled
        faces, _ = self._faces("block/soul_sand", block="skeleton_skull")
        self.assertEqual(faces, WHITE_CUBE_FACES)

    def test_a_model_with_no_particle_at_all_stays_a_missing_cube(self):
        atlas = FakeAtlas()
        mcmeta = FakeMcmeta(
            blockstates={"barrier": {"variants": {"": {"model": "block/barrier"}}}},
            models={"block/barrier": {"textures": {}}},
        )
        block_models = build_block_models(mcmeta, {"minecraft:barrier[]": "minecraft:barrier"}, atlas)
        self.assertEqual(block_models["minecraft:barrier[]"], WHITE_CUBE_FACES)


class FluidDepthTest(unittest.TestCase):
    """A fluid's box gets shorter as its level rises: a source stands 4 pixels
    below the block top, the shallowest flow 1 pixel above the block floor.
    Java builds this in the fluid renderer rather than in a model, so it has
    to be reproduced here."""

    def _faces(self, block="water", level=None, texture="block/water_still"):
        atlas = FakeAtlas()
        mcmeta = FakeMcmeta(
            blockstates={block: {"variants": {"": {"model": f"block/{block}"}}}},
            models={f"block/{block}": {"textures": {"particle": texture}}},
        )
        properties = "" if level is None else f"[level={level}]"
        b2j = {"bedrock[]": f"minecraft:{block}{properties}"}
        return build_block_models(mcmeta, b2j, atlas)["bedrock[]"]

    def _top(self, faces):
        top, = [face for face in faces if tuple(face["normal"]) == (0, 1, 0)]
        return top

    def _sides(self, faces):
        return [face for face in faces if face["normal"][1] == 0]

    def test_a_source_stands_four_pixels_below_the_block_top(self):
        self.assertEqual(self._top(self._faces(level=0))["center"][1], 12)

    def test_the_shallowest_flow_stands_one_pixel_above_the_block_floor(self):
        self.assertEqual(self._top(self._faces(level=7))["center"][1], 1)

    def test_height_falls_with_every_step_of_level(self):
        tops = [self._top(self._faces(level=level))["center"][1] for level in range(8)]
        self.assertEqual(tops, sorted(tops, reverse=True))
        self.assertEqual(len(set(tops)), 8)

    def test_the_sides_span_the_box_and_sample_the_texture_under_its_surface(self):
        # a dropping surface must not stretch or slide the texture, so a short
        # side shows the strip that was already against the block floor
        for face in self._sides(self._faces(level=7)):
            with self.subTest(normal=tuple(face["normal"])):
                self.assertEqual(face["height"], 1)
                self.assertEqual(face["center"][1], Decimal("0.5"))
                self.assertEqual(face["uv"], [0, 15, 16, 16])
                self.assertEqual(face["width"], 16)

    def test_the_floor_stays_on_the_block_floor(self):
        bottom, = [face for face in self._faces(level=5) if tuple(face["normal"]) == (0, -1, 0)]
        self.assertEqual(bottom["center"], [8, 0, 8])
        self.assertEqual(bottom["uv"], [0, 0, 16, 16])

    def test_a_falling_fluid_fills_the_block(self):
        # levels 8-15 take their height from the fluid above rather than from
        # their own level, and a preview block has no neighbors to read
        for level in range(8, 16):
            with self.subTest(level=level):
                faces = self._faces(level=level)
                self.assertEqual(self._top(faces)["center"][1], 16)
                self.assertEqual({face["height"] for face in faces}, {16})

    def test_lava_shrinks_the_same_way(self):
        faces = self._faces(block="lava", level=0, texture="block/lava_still")
        self.assertEqual(self._top(faces)["center"][1], 12)

    def test_a_bubble_column_stays_a_full_cube(self):
        faces = self._faces(block="bubble_column")
        self.assertEqual(self._top(faces)["center"][1], 16)

    def test_a_light_blocks_level_is_brightness_not_depth(self):
        # minecraft:light[level=15] stands in with its item icon; read as a
        # depth it would leave the block lying in a puddle on the floor
        faces = self._faces(block="light", level=15, texture="item/light")
        self.assertEqual(self._top(faces)["center"][1], 16)
        self.assertEqual({face["height"] for face in faces}, {16})


if __name__ == "__main__":
    unittest.main()
