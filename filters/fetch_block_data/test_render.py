"""Golden tests for the fetch_block_data renderer.

Each expected string is a verbatim slice of the current packs/BP/scripts/blocks.js,
so passing proves the renderer reproduces Construct's exact formatting.
"""

import json
import unittest
from decimal import Decimal

from main import parse, render


class RenderTest(unittest.TestCase):
    def test_flat_object_sorts_keys_with_three_space_indent(self):
        obj = {"textures": "acacia_planks", "sound": "wood"}
        expected = (
            "{\n"
            '   "sound" : "wood",\n'
            '   "textures" : "acacia_planks"\n'
            "}"
        )
        self.assertEqual(render(obj, 0), expected)

    def test_block_entry_with_nested_object_booleans_and_trailing_zero(self):
        # Verbatim from blocks.js: the acacia_leaves value object, rendered at
        # indent level 1 (its keys sit at 6 spaces, isotropic's at 9).
        entry = parse(
            '{"ambient_occlusion_exponent":0.80,'
            '"carried_textures":"acacia_leaves_carried",'
            '"isotropic":{"up":true,"down":true},'
            '"sound":"grass","textures":"acacia_leaves"}'
        )
        expected = (
            "{\n"
            '      "ambient_occlusion_exponent" : 0.80,\n'
            '      "carried_textures" : "acacia_leaves_carried",\n'
            '      "isotropic" : {\n'
            '         "down" : true,\n'
            '         "up" : true\n'
            "      },\n"
            '      "sound" : "grass",\n'
            '      "textures" : "acacia_leaves"\n'
            "   }"
        )
        self.assertEqual(render(entry, 1), expected)

    def test_inline_scalar_array_and_empty_string_value(self):
        # Verbatim shape from block_sounds "hit" events with a pitch range.
        entry = parse('{"default":"","pitch":[0.50,1.20],"volume":1.0}')
        expected = (
            "{\n"
            '   "default" : "",\n'
            '   "pitch" : [ 0.50, 1.20 ],\n'
            '   "volume" : 1.0\n'
            "}"
        )
        self.assertEqual(render(entry, 0), expected)

    def test_trailing_zero_number_literals_preserved(self):
        entry = parse('{"a":0.550,"b":1.0,"c":0.050,"d":1.20}')
        expected = (
            "{\n"
            '   "a" : 0.550,\n'
            '   "b" : 1.0,\n'
            '   "c" : 0.050,\n'
            '   "d" : 1.20\n'
            "}"
        )
        self.assertEqual(render(entry, 0), expected)

    def test_empty_object_and_array(self):
        self.assertEqual(render({}, 0), "{}")
        self.assertEqual(render([], 0), "[]")

    def test_parse_preserves_number_text_via_decimal(self):
        parsed = parse('{"x":0.80}')
        self.assertIsInstance(parsed["x"], Decimal)
        self.assertEqual(str(parsed["x"]), "0.80")


if __name__ == "__main__":
    unittest.main()
