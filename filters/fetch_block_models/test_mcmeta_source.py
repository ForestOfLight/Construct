import io
import unittest
import zipfile

from mcmeta_source import McmetaSource


def _make_zip(files):
    """files: {path_without_root: bytes}. Wraps each under 'mcmeta-assets/'."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for path, data in files.items():
            zf.writestr("mcmeta-assets/" + path, data)
    return buf.getvalue()


class McmetaSourceTest(unittest.TestCase):
    def setUp(self):
        self.source = McmetaSource(_make_zip({
            "assets/minecraft/blockstates/stone.json": b'{"variants":{"":{"model":"block/stone"}}}',
            "assets/minecraft/models/block/stone.json": b'{"textures":{"all":"block/stone"}}',
            "assets/minecraft/textures/block/stone.png": b"\x89PNG-fake-bytes",
        }))

    def test_read_json_parses_content(self):
        data = self.source.read_json("assets/minecraft/blockstates/stone.json")
        self.assertEqual(data["variants"][""]["model"], "block/stone")

    def test_read_bytes_returns_raw_content(self):
        self.assertEqual(
            self.source.read_bytes("assets/minecraft/textures/block/stone.png"),
            b"\x89PNG-fake-bytes",
        )

    def test_exists_true_for_present_path(self):
        self.assertTrue(self.source.exists("assets/minecraft/blockstates/stone.json"))

    def test_exists_false_for_missing_path(self):
        self.assertFalse(self.source.exists("assets/minecraft/blockstates/missing.json"))


if __name__ == "__main__":
    unittest.main()
