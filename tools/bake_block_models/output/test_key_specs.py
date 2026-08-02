import unittest

from sources.b2j import parse_java_state
from output.key_specs import build_key_specs


class BuildKeySpecsTest(unittest.TestCase):
    """The renderer used to build this index itself, on first use, by
    reparsing every key in blockModels - then scan a block's entries for the
    most specific one whose properties were a subset of the live states.
    build_key_specs settles all of that here, leaving the renderer a key to
    build and one lookup to do (see BlockModelLookup)."""

    def _lookup(self, specs, rekeyed, block_id, states):
        """What BlockModelLookup does with the emitted data: try each shape,
        most specific first, and take the first key that hits."""
        spec = specs.get(block_id)
        if spec is None:
            return None
        for index, shape in enumerate(spec["props"]):
            if not all(name in states for name in shape):
                continue
            key = f"{block_id}[{index}|{','.join(states[n] for n in shape)}]"
            if key in rekeyed:
                return rekeyed[key]
        return None

    def test_a_property_every_entry_agrees_on_is_dropped_from_the_key(self):
        # update_bit is a Bedrock state Java has no equivalent for, so
        # blocksB2J maps one value of it and the model is the same either
        # way. It can't choose between entries, so it can't belong in the key.
        specs, rekeyed = build_key_specs({
            "minecraft:oak_leaves[persistent_bit=0,update_bit=0]": [1],
            "minecraft:oak_leaves[persistent_bit=1,update_bit=0]": [2],
        })
        self.assertEqual(specs["minecraft:oak_leaves"]["props"], [["persistent_bit"]])
        # the key names the shape it read and that shape's values, not the
        # property names - blockKeySpecs already carries those
        self.assertEqual(sorted(rekeyed), [
            "minecraft:oak_leaves[0|0]",
            "minecraft:oak_leaves[0|1]",
        ])

    def test_a_block_whose_properties_all_agree_is_keyed_on_none_of_them(self):
        specs, rekeyed = build_key_specs({"minecraft:stone[stone_type=stone]": [1]})
        self.assertEqual(specs["minecraft:stone"]["props"], [[]])
        self.assertEqual(rekeyed, {"minecraft:stone[0|]": [1]})

    def test_dropping_agreed_properties_never_merges_two_entries(self):
        # the guarantee the whole reduction rests on: two entries that differ
        # in a property make that property disagree, so it stays in the key
        specs, rekeyed = build_key_specs({
            "minecraft:x[a=0,b=0]": [1],
            "minecraft:x[a=1,b=0]": [2],
            "minecraft:x[a=2,b=0]": [3],
        })
        self.assertEqual(specs["minecraft:x"]["props"], [["a"]])
        self.assertEqual(len(rekeyed), 3)

    def test_two_entries_reducing_to_one_key_with_different_models_is_an_error(self):
        # can't arise from properties alone, but a future Bedrock version
        # reshaping the data must fail the bake rather than silently drop a
        # model the renderer would then never draw
        block_models = {
            "minecraft:x[a=0]": [1],
            "minecraft:x[a=0,b=0]": [2],
        }
        with self.assertRaises(ValueError):
            build_key_specs(block_models)

    # The one block whose entries don't all name the same properties (see
    # sources.fixups.rekey_hanging_signs): hung under a block it is turned by
    # ground_sign_direction, hung off the side of one by facing_direction,
    # and a wall sign names neither attachment nor a rotation.
    def _hanging_sign_models(self):
        return {
            "minecraft:oak_hanging_sign[attached_bit=0,facing_direction=2,hanging=1]": [1],
            "minecraft:oak_hanging_sign[attached_bit=0,facing_direction=3,hanging=1]": [2],
            "minecraft:oak_hanging_sign[attached_bit=1,ground_sign_direction=0,hanging=1]": [3],
            "minecraft:oak_hanging_sign[attached_bit=1,ground_sign_direction=1,hanging=1]": [4],
            "minecraft:oak_hanging_sign[facing_direction=2,hanging=0]": [5],
            "minecraft:oak_hanging_sign[facing_direction=3,hanging=0]": [6],
        }

    def test_shapes_are_ordered_most_specific_first(self):
        # reproduces the old match's "most properties wins, ties broken
        # alphabetically" rule, which decided which entry a live permutation
        # settled on when more than one of them matched
        specs, _rekeyed = build_key_specs(self._hanging_sign_models())
        self.assertEqual(specs["minecraft:oak_hanging_sign"]["props"], [
            ["attached_bit", "facing_direction", "hanging"],
            ["attached_bit", "ground_sign_direction", "hanging"],
            ["facing_direction", "hanging"],
        ])

    def test_equal_length_shapes_are_ordered_alphabetically(self):
        # the old match broke same-size ties on the key, so the order two
        # shapes are tried in has to be settled by something, not by
        # whatever order the input dict happened to be in
        specs, _rekeyed = build_key_specs({
            "minecraft:x[a=0,z=0]": [1],
            "minecraft:x[a=1,z=1]": [2],
            "minecraft:x[b=0,y=0]": [3],
            "minecraft:x[b=1,y=1]": [4],
        })
        self.assertEqual(specs["minecraft:x"]["props"], [["a", "z"], ["b", "y"]])

    def test_property_names_within_a_shape_are_in_the_order_the_key_writes_them(self):
        specs, rekeyed = build_key_specs({
            "minecraft:x[b=0,a=0]": [1],
            "minecraft:x[b=1,a=1]": [2],
        })
        shape = specs["minecraft:x"]["props"][0]
        self.assertEqual(shape, ["a", "b"])
        for key in rekeyed:
            self.assertIn(key, ["minecraft:x[0|0,0]", "minecraft:x[0|1,1]"])

    def test_every_key_resolves_back_to_its_own_model(self):
        block_models = {
            "minecraft:oak_leaves[persistent_bit=0,update_bit=0]": [10],
            "minecraft:oak_leaves[persistent_bit=1,update_bit=0]": [11],
            "minecraft:stone[stone_type=stone]": [12],
            **self._hanging_sign_models(),
        }
        specs, rekeyed = build_key_specs(dict(block_models))
        for original, refs in block_models.items():
            block_id, states = parse_java_state(original)
            self.assertEqual(self._lookup(specs, rekeyed, block_id, states), refs, original)

    def test_states_bedrock_reports_that_the_data_ignores_do_not_affect_the_lookup(self):
        # the reason the old fallback existed at all: a live minecraft:stone
        # carries stone_type, which no key here mentions
        specs, rekeyed = build_key_specs({"minecraft:stone[stone_type=stone]": [1]})
        self.assertEqual(
            self._lookup(specs, rekeyed, "minecraft:stone", {"stone_type": "andesite"}), [1]
        )

    def test_a_value_no_entry_carries_resolves_to_no_model(self):
        # leaving the renderer to draw its missing cube, as it does today
        specs, rekeyed = build_key_specs({
            "minecraft:x[a=0]": [1],
            "minecraft:x[a=1]": [2],
        })
        self.assertIsNone(self._lookup(specs, rekeyed, "minecraft:x", {"a": "7"}))

    def test_an_unknown_block_id_has_no_spec(self):
        specs, rekeyed = build_key_specs({"minecraft:stone[stone_type=stone]": [1]})
        self.assertNotIn("minecraft:nonexistent", specs)
        self.assertIsNone(self._lookup(specs, rekeyed, "minecraft:nonexistent", {}))

    def test_a_permutation_missing_a_shapes_properties_falls_through_to_the_next(self):
        # a wall sign reports neither attachment nor a rotation, so neither
        # of the two longer shapes can be built and the last one has to be
        # reached - building a key naming a state the block hasn't got would
        # just miss, and the sign would draw as a missing cube
        specs, rekeyed = build_key_specs(self._hanging_sign_models())
        self.assertEqual(
            self._lookup(specs, rekeyed, "minecraft:oak_hanging_sign",
                         {"facing_direction": "2", "hanging": "0"}),
            [5],
        )


if __name__ == "__main__":
    unittest.main()
