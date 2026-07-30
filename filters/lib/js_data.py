"""Shared helpers for Construct's data-fetching Regolith filters: fetching
JSON over HTTP and serializing it into Construct's `export const x = {...};`
JS module style (3-space indent, sorted keys, inline scalar arrays, verbatim
number literals)."""

import json
import urllib.request
from decimal import Decimal

INDENT = "   "  # three spaces per level


def fetch(url):
    """GET the raw text at `url`. Raises on any non-200 / network failure."""
    req = urllib.request.Request(url, headers={"User-Agent": "construct-regolith-filter"})
    with urllib.request.urlopen(req) as resp:
        return resp.read().decode("utf-8")


def fetch_bytes(url):
    """GET the raw bytes at `url`. Raises on any non-200 / network failure."""
    req = urllib.request.Request(url, headers={"User-Agent": "construct-regolith-filter"})
    with urllib.request.urlopen(req) as resp:
        return resp.read()


def parse(text):
    """Parse JSON, keeping number literals verbatim (0.80 stays 0.80)."""
    return json.loads(text, parse_float=Decimal)


def render(value, indent=0):
    """Serialize `value` in Construct's data-module style: 3-space indent,
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
