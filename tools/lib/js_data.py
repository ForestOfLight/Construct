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


def render_number(value):
    """A number as short as JS can read it back unchanged: an integral value
    loses the decimal point it was carrying (0.0 -> 0, 180.0 -> 180), and
    everything else keeps every digit it came with. Only ever drops zeroes
    that were not telling us anything, so nothing rounds."""
    if isinstance(value, bool):
        raise TypeError("render_number does not take booleans")
    if isinstance(value, Decimal):
        if value == value.to_integral_value():
            # normalize() would give 1.8E+2 for 180.0
            return str(int(value))
        return str(value.normalize())
    if isinstance(value, int):
        return str(value)
    raise TypeError(f"cannot render {type(value).__name__} as a number")


def render_rows(values, per_row):
    """A flat list of numbers as a JS array literal, `per_row` of them per
    line. One record per line keeps a generated table of hundreds of
    thousands of numbers something a person can read and git can diff,
    without the field names and nesting that made it large."""
    if len(values) % per_row:
        raise ValueError(f"{len(values)} values do not divide into rows of {per_row}")
    lines = [
        INDENT + ", ".join(render_number(v) for v in values[i:i + per_row])
        for i in range(0, len(values), per_row)
    ]
    return "[\n" + ",\n".join(lines) + "\n]" if lines else "[]"


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
