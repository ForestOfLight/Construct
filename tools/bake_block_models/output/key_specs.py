"""Rekeys the baked models on only the properties that actually choose
between a block's entries, and emits the recipe the renderer needs to rebuild
those keys from a live Bedrock permutation.

This replaces what BlockModelLookup used to work out at runtime: it built an
index over every key on first use - reparsing all of them mid-gameplay - then
scanned a block's entries for the most specific one whose properties were a
subset of the live states. Every input to that decision is known here, so a
lookup that was a scan becomes a single hash hit.
"""


def build_key_specs(block_models):
    """Returns ({block_id: spec}, {reduced_key: refs}).

    A property all of a block's entries give the same value for cannot choose
    between them, so it was already ignored when matching; dropping it from
    the key cannot merge two entries either, since two entries differing in a
    property make that property disagree and so keep it. That leaves the
    reduced key carrying exactly what the old match tested. The collision
    check below is what holds that argument up if a future Bedrock version
    reshapes the data.

    A spec carries one field, `props`: the property-name shapes to try, most
    specific first - the old "most properties wins, ties broken
    alphabetically" rule. Nearly every block has exactly one shape; hanging
    signs are the exception, reading a different pair of states depending on
    whether they are attached.

    Note this deliberately carries nothing about the value GAPS blocksB2J
    leaves where Bedrock counts in finer steps than Java does (a pressure
    plate's 0 and 15, a beetroot's 0,3,4,7). Snapping a live value onto the
    nearest mapped one was reverted in 0fac4f9, so a value in between matches
    no key and renders as the missing cube. If that fix comes back, it
    belongs here as a per-property table of mapped values rather than as a
    runtime scan."""
    specs = {}
    rekeyed = {}
    for block_id, entries in _entries_by_block_id(block_models).items():
        discriminating = _discriminating_properties(entries)
        shaped_entries = [
            (bedrock_state, properties, refs, _shape_of(properties, discriminating))
            for bedrock_state, properties, refs in entries
        ]
        shapes = _ordered_shapes(shaped_entries)
        for bedrock_state, properties, refs, shape in shaped_entries:
            reduced = _format_state_key(
                block_id, properties, shape, shapes.index(shape)
            )
            if rekeyed.get(reduced, refs) != refs:
                raise ValueError(
                    f"{bedrock_state} and another entry both reduce to {reduced} "
                    f"but resolve to different models - dropping the properties "
                    f"they agree on is only safe while it keeps keys unique"
                )
            rekeyed[reduced] = refs
        specs[block_id] = {"props": shapes}
    return specs, rekeyed


def _entries_by_block_id(block_models):
    entries_by_id = {}
    for bedrock_state, refs in block_models.items():
        block_id, properties = _parse_state_key(bedrock_state)
        entries_by_id.setdefault(block_id, []).append((bedrock_state, properties, refs))
    return entries_by_id


def _discriminating_properties(entries):
    """The property names the block's entries disagree on - the only ones
    that can choose between them."""
    values_seen = {}
    for _bedrock_state, properties, _refs in entries:
        for name, value in properties.items():
            values_seen.setdefault(name, set()).add(value)
    return {name for name, values in values_seen.items() if len(values) > 1}


def _ordered_shapes(shaped_entries):
    """The distinct property shapes in use, most specific first.

    Settled before any key is written, because a key names its shape by
    position and that position has to be the one the renderer will look up."""
    shapes = []
    for _bedrock_state, _properties, _refs, shape in shaped_entries:
        if shape not in shapes:
            shapes.append(shape)
    shapes.sort(key=lambda shape: (-len(shape), shape))
    return shapes


def _shape_of(properties, discriminating):
    return sorted(name for name in properties if name in discriminating)


def _parse_state_key(bedrock_state):
    """Splits "minecraft:x[a=1,b=2]" into ("minecraft:x", {"a": "1", "b":
    "2"}). Values stay strings - they are compared against, never arithmetic
    on, and the renderer builds the same strings back out of a live
    permutation."""
    bracket = bedrock_state.index("[")
    properties = {}
    inner = bedrock_state[bracket + 1:-1]
    if inner:
        for pair in inner.split(","):
            name, value = pair.split("=", 1)
            properties[name] = value
    return bedrock_state[:bracket], properties


def _format_state_key(block_id, properties, names, shape_index):
    """The reduced key an entry is stored under: the block id, which of the
    block's property shapes this is, and that shape's values in its own order
    - "minecraft:acacia_door[0|0,east,0,0]".

    The names are left out because blockKeySpecs already carries them, in
    this order, and repeating them on every key cost ~840KB of the generated
    module plus a string concatenation per property on every lookup.

    The shape index is what keeps the names droppable. Two of a hanging
    sign's shapes are [attached_bit, facing_direction, hanging] and
    [attached_bit, ground_sign_direction, hanging]: same length, different
    meaning, and with the names gone both write "[0,3,1]". The renderer has
    the index to hand - it is the shape it is already looping over."""
    values = ",".join(properties[name] for name in names)
    return f"{block_id}[{shape_index}|{values}]"
