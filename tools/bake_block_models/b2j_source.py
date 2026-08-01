"""Fetches the Bedrock<->Java block-state mapping from PrismarineJS/minecraft-data,
for whichever Bedrock version this pack's manifest targets."""

import json
import urllib.request

B2J_URL_TMPL = "https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/bedrock/{version}/blocksB2J.json"


def manifest_version(manifest):
    """manifest is the parsed packs/BP/manifest.json. Returns e.g. '1.26.30'."""
    major, minor, patch = manifest["header"]["min_engine_version"]
    return f"{major}.{minor}.{patch}"


def fetch_b2j(version):
    """Returns the {bedrock_state_str: java_state_str} dict for `version`."""
    url = B2J_URL_TMPL.format(version=version)
    req = urllib.request.Request(url, headers={"User-Agent": "construct-regolith-filter"})
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)


def parse_java_state(java_state_str):
    """'minecraft:oak_log[axis=x]' -> ('minecraft:oak_log', {'axis': 'x'})."""
    if "[" not in java_state_str:
        return java_state_str, {}
    block_id, rest = java_state_str.split("[", 1)
    props_str = rest.rstrip("]")
    properties = {}
    if props_str:
        for pair in props_str.split(","):
            key, value = pair.split("=", 1)
            properties[key] = value
    return block_id, properties
