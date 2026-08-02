"""Corrections to the fetched Bedrock->Java state mapping.

blocksB2J.json is built for Java coverage - one Bedrock permutation per Java
state - which is not quite the same question as "what does this Bedrock block
look like". Each fixup here is a place where taking it literally draws the
wrong block, and each is keyed to a specific quirk of that data rather than
being a general rule.
"""

from b2j_source import parse_java_state

_HANGING_SIGN_SUFFIX = "_hanging_sign"

# Stair "shape" (straight/inner_*/outer_*) is a Java render-time value
# computed from neighboring blocks, not real placed state. Bedrock's stair
# states carry no such property, so blocksB2J fills it with an arbitrary
# placeholder ("outer_right") on every plain stair state, which resolves to
# the corner model - a quarter-width top step - for every stair block.
# "straight" is the correct model for an isolated preview block with no
# neighbor context.
_STAIR_SHAPES = {"inner_left", "inner_right", "outer_left", "outer_right", "straight"}
_STRAIGHT_STAIR = "straight"

# Java splits a potted plant into a block id per plant (potted_dandelion,
# potted_cactus, ...) while Bedrock keeps every pot as one flower_pot block
# with the plant in the block entity. With exactly one Bedrock state to map,
# blocksB2J has to pick one of Java's ~40 potted ids and picks an arbitrary
# one, drawing that flower into every pot in a preview. Bedrock's permutation
# carries no plant for us to read back, so an empty pot is the only honest
# shape: right for an empty pot, and an understatement rather than a wrong
# flower for a planted one.
_JAVA_STATE_OVERRIDES = {
    "minecraft:flower_pot": ("minecraft:flower_pot", {}),
}


def corrected_java_state(bedrock_state, java_state):
    """The Java block id and properties to actually resolve `bedrock_state`
    against, as ("minecraft:x", {...})."""
    bedrock_id = bedrock_state.split("[", 1)[0]
    override = _JAVA_STATE_OVERRIDES.get(bedrock_id)
    if override:
        return override[0], dict(override[1])
    java_block_id, properties = parse_java_state(java_state)
    if properties.get("shape") in _STAIR_SHAPES:
        properties["shape"] = _STRAIGHT_STAIR
    return java_block_id, properties


def rekey_hanging_signs(b2j):
    """Rewrites the hanging-sign entries of `b2j` to name only the Bedrock
    states a live sign actually reads, leaving every other entry alone.

    Bedrock keeps a hanging sign's direction in two different states and
    reads whichever its mounting calls for: ground_sign_direction when it
    hangs from a ceiling by chains (attached_bit=1), facing_direction
    otherwise - both when it hangs free (hanging=1) and when it is fixed to
    the side of a block (hanging=0). The state it isn't reading stays 0.

    blocksB2J names all four states on every entry and fills the unread ones
    with whatever the Java->Bedrock direction produces, none of which is what
    a live sign carries. Since a lookup requires every state the data
    discriminates on to match, all 384 permutations of all 12 sign types fell
    through to the missing-block cube. Dropping the unread states from the
    key lets a partial match find them whatever those states hold."""
    passed_through, signs = {}, {}
    for bedrock_state, java_state in b2j.items():
        bedrock_id = bedrock_state.split("[", 1)[0]
        if bedrock_id.endswith(_HANGING_SIGN_SUFFIX):
            signs.setdefault(bedrock_id, {})[bedrock_state] = java_state
        else:
            passed_through[bedrock_state] = java_state
    for bedrock_id, entries in signs.items():
        passed_through.update(_rekey_one_hanging_sign(bedrock_id, entries))
    return passed_through


def _rekey_one_hanging_sign(bedrock_id, entries):
    wall = {}      # facing_direction -> java state
    rotation = {}  # facing_direction -> the ground_sign_direction facing that way
    attached = {}  # ground_sign_direction -> java state
    free = {}      # ground_sign_direction -> java state
    for bedrock_state, java_state in entries.items():
        _, properties = parse_java_state(bedrock_state)
        facing = properties["facing_direction"]
        ground = properties["ground_sign_direction"]
        if properties["hanging"] == "0":
            wall[facing] = java_state
            # a wall sign faces a compass direction and hangs at a rotation
            # meaning the same thing, which is the only place the data says
            # which rotation a facing_direction stands for
            rotation[facing] = ground
        elif properties["attached_bit"] == "1":
            attached[ground] = java_state
        else:
            free[ground] = java_state

    if not rotation:
        raise ValueError(f"{bedrock_id}: no wall-mounted states to read facings from")

    rekeyed = {}
    for facing, java_state in wall.items():
        rekeyed[f"{bedrock_id}[facing_direction={facing},hanging=0]"] = java_state
    for ground, java_state in attached.items():
        rekeyed[f"{bedrock_id}[attached_bit=1,ground_sign_direction={ground},hanging=1]"] = java_state
    for facing, ground in rotation.items():
        if ground not in free:
            raise ValueError(
                f"{bedrock_id}: no unattached hanging state at rotation {ground}, "
                f"so facing_direction={facing} has no model to point at"
            )
        rekeyed[f"{bedrock_id}[attached_bit=0,facing_direction={facing},hanging=1]"] = free[ground]
    return rekeyed
