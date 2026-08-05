import unittest

from sources.b2j import manifest_version, parse_java_state


class ManifestVersionTest(unittest.TestCase):
    def test_builds_dotted_version_from_min_engine_version(self):
        manifest = {"header": {"min_engine_version": [1, 26, 30]}}
        self.assertEqual(manifest_version(manifest), "1.26.30")


class ParseJavaStateTest(unittest.TestCase):
    def test_parses_block_with_properties(self):
        block_id, props = parse_java_state("minecraft:oak_log[axis=x]")
        self.assertEqual(block_id, "minecraft:oak_log")
        self.assertEqual(props, {"axis": "x"})

    def test_parses_block_with_multiple_properties(self):
        block_id, props = parse_java_state("minecraft:dispenser[facing=north,triggered=true]")
        self.assertEqual(block_id, "minecraft:dispenser")
        self.assertEqual(props, {"facing": "north", "triggered": "true"})

    def test_parses_block_with_no_properties(self):
        block_id, props = parse_java_state("minecraft:stone")
        self.assertEqual(block_id, "minecraft:stone")
        self.assertEqual(props, {})

    def test_parses_block_with_empty_bracket(self):
        block_id, props = parse_java_state("minecraft:stone[]")
        self.assertEqual(block_id, "minecraft:stone")
        self.assertEqual(props, {})


if __name__ == "__main__":
    unittest.main()
