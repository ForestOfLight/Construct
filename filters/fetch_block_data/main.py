"""Regolith filter: regenerate packs/BP/scripts/blocks.js from Mojang's
bedrock-samples blocks.json + sounds.json, in Construct's exact format.

Run it directly to replace blocks.js in place (no regolith export):

    python filters/fetch_block_data/main.py

The JS-module renderer it shares with tools/bake_block_models lives in
tools/lib, hence the sys.path line below.
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "tools" / "lib"))
from js_data import fetch, parse, render  # noqa: E402

BLOCKS_URL = "https://raw.githubusercontent.com/Mojang/bedrock-samples/main/resource_pack/blocks.json"
SOUNDS_URL = "https://raw.githubusercontent.com/Mojang/bedrock-samples/main/resource_pack/sounds.json"


def build():
    """Fetch upstream data and return the full blocks.js file contents."""
    blocks = parse(fetch(BLOCKS_URL))
    blocks.pop("format_version", None)

    sounds = parse(fetch(SOUNDS_URL))
    block_sounds = sounds["block_sounds"]

    return (
        "export const blocks = " + render(blocks) + ";\n\n"
        "export const block_sounds = " + render(block_sounds) + ";"
    )


def output_path():
    """packs/BP/scripts/blocks.js in the project source tree."""
    root = os.environ.get("ROOT_DIR")
    root = Path(root) if root else Path(__file__).resolve().parents[2]
    return root / "packs" / "BP" / "scripts" / "blocks.js"


def main():
    contents = build()
    dest = output_path()
    dest.write_text(contents, encoding="utf-8")  # no trailing newline, by design
    print(f"[fetch_block_data] wrote {dest} ({len(contents)} bytes)")


if __name__ == "__main__":
    main()
