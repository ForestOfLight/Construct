import unittest

from b2j_fixups import rekey_hanging_signs
from b2j_source import parse_java_state


class HangingSignRekeyTest(unittest.TestCase):
    """blocksB2J lists one Bedrock permutation per Java state, so it names all
    four of a hanging sign's Bedrock states even though Bedrock only reads two
    of them at a time, and fills the rest in with values a live sign doesn't
    use. Rekeying the entries to name only the states that decide the model
    lets the renderer's partial match find them."""

    # gsd is Java's 16-step rotation, 0 south turning clockwise; only its four
    # cardinals have a facing_direction, and the mapping data pairs everything
    # else with north
    CARDINALS = {"0": ("3", "south"), "4": ("4", "west"), "8": ("2", "north"), "12": ("5", "east")}

    def _b2j(self, block="acacia_hanging_sign"):
        b2j = {}
        for gsd in range(16):
            fd = self.CARDINALS.get(str(gsd), ("2",))[0]
            for attached_bit, attached in (("0", "false"), ("1", "true")):
                key = (f"minecraft:{block}[attached_bit={attached_bit},facing_direction={fd},"
                       f"ground_sign_direction={gsd},hanging=1]")
                b2j[key] = f"minecraft:{block}[attached={attached},rotation={gsd},waterlogged=false]"
        for gsd, (fd, facing) in self.CARDINALS.items():
            key = (f"minecraft:{block}[attached_bit=1,facing_direction={fd},"
                   f"ground_sign_direction={gsd},hanging=0]")
            b2j[key] = f"minecraft:{block.replace('_hanging', '_wall_hanging')}[facing={facing},waterlogged=false]"
        return b2j

    def test_a_wall_sign_is_keyed_on_its_facing_alone(self):
        # the mapping data only ever pairs a wall sign with attached_bit=1 and
        # a ground_sign_direction matching its facing; a live one carries
        # neither, so requiring them to match rejected every wall sign
        rekeyed = rekey_hanging_signs(self._b2j())
        self.assertEqual(
            rekeyed["minecraft:acacia_hanging_sign[facing_direction=3,hanging=0]"],
            "minecraft:acacia_wall_hanging_sign[facing=south,waterlogged=false]",
        )

    def test_an_attached_ceiling_sign_is_keyed_on_its_rotation(self):
        # attached_bit=1 is the case where Bedrock does read
        # ground_sign_direction, so all 16 rotations survive - it's
        # facing_direction that a live sign leaves at 0
        rekeyed = rekey_hanging_signs(self._b2j())
        self.assertEqual(
            rekeyed["minecraft:acacia_hanging_sign[attached_bit=1,ground_sign_direction=6,hanging=1]"],
            "minecraft:acacia_hanging_sign[attached=true,rotation=6,waterlogged=false]",
        )

    def test_a_free_ceiling_sign_takes_its_rotation_from_its_facing(self):
        # with attached_bit=0 Bedrock reads facing_direction instead, so the
        # sign only has the four cardinal rotations - and the mapping data's
        # wall entries are what say which rotation a facing means
        rekeyed = rekey_hanging_signs(self._b2j())
        self.assertEqual(
            rekeyed["minecraft:acacia_hanging_sign[attached_bit=0,facing_direction=2,hanging=1]"],
            "minecraft:acacia_hanging_sign[attached=false,rotation=8,waterlogged=false]",
        )

    def test_every_rekeyed_entry_names_only_the_states_bedrock_reads(self):
        rekeyed = rekey_hanging_signs(self._b2j())
        self.assertEqual(len(rekeyed), 24)  # 4 wall + 16 attached + 4 free
        for key in rekeyed:
            props = set(parse_java_state(key)[1])
            self.assertIn(props, [
                {"facing_direction", "hanging"},
                {"attached_bit", "ground_sign_direction", "hanging"},
                {"attached_bit", "facing_direction", "hanging"},
            ], key)

    def test_blocks_that_are_not_hanging_signs_pass_through_untouched(self):
        b2j = {"minecraft:stone[stone_type=stone]": "minecraft:stone"}
        self.assertEqual(rekey_hanging_signs(dict(b2j)), b2j)

    def test_a_wall_sign_facing_the_data_never_pairs_with_a_rotation_is_an_error(self):
        # the free-hanging keys are built from the wall entries' facings, so
        # data that stopped providing them must not silently lose signs
        b2j = {k: v for k, v in self._b2j().items() if "hanging=0" not in k}
        with self.assertRaises(ValueError):
            rekey_hanging_signs(b2j)


if __name__ == "__main__":
    unittest.main()
