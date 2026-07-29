"""Regolith filter: regenerate packs/BP/scripts/blocks.js from Mojang's
bedrock-samples blocks.json + sounds.json, in Construct's exact format.

Run it directly to replace blocks.js in place (no regolith export):

    python3 filters/fetch_block_data/main.py
"""

import json
import os
import urllib.request
from decimal import Decimal
from pathlib import Path

BLOCKS_URL = "https://raw.githubusercontent.com/Mojang/bedrock-samples/main/resource_pack/blocks.json"
SOUNDS_URL = "https://raw.githubusercontent.com/Mojang/bedrock-samples/main/resource_pack/sounds.json"

INDENT = "   "  # three spaces per level


def fetch(url):
    """GET the raw text at `url`. Raises on any non-200 / network failure."""
    req = urllib.request.Request(url, headers={"User-Agent": "construct-regolith-filter"})
    with urllib.request.urlopen(req) as resp:
        return resp.read().decode("utf-8")


def parse(text):
    """Parse JSON, keeping number literals verbatim (0.80 stays 0.80)."""
    return json.loads(text, parse_float=Decimal)


def render(value, indent=0):
    """Serialize `value` in Construct's blocks.js style: 3-space indent,
    `"key" : value`, sorted keys, inline scalar arrays, verbatim numbers."""
    if isinstance(value, dict):
        if not value:
            return "{}"
        inner = INDENT * (indent + 1)
        items = [
            f'{inner}{json.dumps(k, ensure_ascii=False)} : {render(v, indent + 1)}'
            for k, v in sorted(value.items())
        ]
        return "{\n" + ",\n".join(items) + "\n" + INDENT * indent + "}"

    if isinstance(value, list):
        if not value:
            return "[]"
        if all(not isinstance(x, (dict, list)) for x in value):
            return "[ " + ", ".join(render(x, indent) for x in value) + " ]"
        inner = INDENT * (indent + 1)
        items = [f"{inner}{render(x, indent + 1)}" for x in value]
        return "[\n" + ",\n".join(items) + "\n" + INDENT * indent + "]"

    if isinstance(value, bool):  # must precede int/Decimal checks
        return "true" if value else "false"
    if isinstance(value, (Decimal, int)):
        return str(value)
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False)
    if value is None:
        return "null"
    raise TypeError(f"cannot render value of type {type(value).__name__}")


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
