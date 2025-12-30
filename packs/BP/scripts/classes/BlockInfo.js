import { GameMode, system, world } from '@minecraft/server';
import { Raycaster } from '../classes/Raycaster';
import { fetchMatchingItemSlot } from '../utils';
let State_values = {
    active: {
        true: "construct.statevalue.active.true",
        false: "construct.statevalue.active.false"
    },
    age: {},
    age_bit: {
        true: "construct.statevalue.age_bit.true",
        false: "construct.statevalue.age_bit.false"
    },
    allow_underwater_bit: {
        true: "construct.statevalue.allow_underwater_bit.true",
        false: "construct.statevalue.allow_underwater_bit.false"
    },
    attached_bit: {
        true: "construct.statevalue.attached_bit.true",
        false: "construct.statevalue.attached_bit.false"
    },
    attachment: {
        standing: "construct.statevalue.attachment.standing",
        hanging: "construct.statevalue.attachment.hanging",
        side: "construct.statevalue.attachment.side",
        multiple: "construct.statevalue.attachment.multiple"
    },
    bamboo_leaf_size: {
        no_leaves: "construct.statevalue.bamboo_leaf_size.no_leaves",
        small_leaves: "construct.statevalue.bamboo_leaf_size.small_leaves",
        large_leaves: "construct.statevalue.bamboo_leaf_size.large_leaves"
    },
    bamboo_stalk_thickness: {
        thin: "construct.statevalue.bamboo_stalk_thickness.thin",
        thick: "construct.statevalue.bamboo_stalk_thickness.thick"
    },
    big_dripleaf_tilt: {
        none: "construct.statevalue.big_dripleaf_tilt.none",
        unstable: "construct.statevalue.big_dripleaf_tilt.unstable",
        partial_tilt: "construct.statevalue.big_dripleaf_tilt.partial_tilt",
        full_tilt: "construct.statevalue.big_dripleaf_tilt.full_tilt"
    },
    bite_counter: {},
    books_stored: {
        0: `
000
000`,
        1: `
100
000`,
        2: `
010
000`,
        3: `
110
000`,
        4: `
001
000`,
        5: `
101
000`,
        6: `
011
000`,
        7: `
111
000`,
        8: `
000
100`,
        9: `
100
100`,
        10: `
010
100`,
        11: `
110
100`,
        12: `
001
100`,
        13: `
101
100`,
        14: `
011
100`,
        15: `
111
100`,
        16: `
000
010`,
        17: `
100
010`,
        18: `
010
010`,
        19: `
110
010`,
        20: `
001
010`,
        21: `
101
010`,
        22: `
011
010`,
        23: `
111
010`,
        24: `
000
110`,
        25: `
100
110`,
        26: `
010
110`,
        27: `
110
110`,
        28: `
001
110`,
        29: `
101
110`,
        30: `
011
110`,
        31: `
111
110`,
        32: `
000
001`,
        33: `
100
001`,
        34: `
010
001`,
        35: `
110
001`,
        36: `
001
001`,
        37: `
101
001`,
        38: `
011
001`,
        39: `
111
001`,
        40: `
000
101`,
        41: `
100
101`,
        42: `
010
101`,
        43: `
110
101`,
        44: `
001
101`,
        45: `
101
101`,
        46: `
011
101`,
        47: `
111
101`,
        48: `
000
011`,
        49: `
100
011`,
        50: `
010
011`,
        51: `
110
011`,
        52: `
001
011`,
        53: `
101
011`,
        54: `
011
011`,
        55: `
111
011`,
        56: `
000
111`,
        57: `
100
111`,
        58: `
010
111`,
        59: `
110
111`,
        60: `
001
111`,
        61: `
101
111`,
        62: `
011
111`,
        63: `
111
111`
    },
    brewing_stand_slot_a_bit: {
        true: "construct.statevalue.brewing_stand_slot_a_bit.true",
        false: "construct.statevalue.brewing_stand_slot_a_bit.false"
    },
    brewing_stand_slot_b_bit: {
        true: "construct.statevalue.brewing_stand_slot_b_bit.true",
        false: "construct.statevalue.brewing_stand_slot_b_bit.false"
    },
    brewing_stand_slot_c_bit: {
        true: "construct.statevalue.brewing_stand_slot_c_bit.true",
        false: "construct.statevalue.brewing_stand_slot_c_bit.false"
    },
    button_pressed_bit: {
        true: "construct.statevalue.button_pressed_bit.true",
        false: "construct.statevalue.button_pressed_bit.false"
    },
    candles: {
        "0": "construct.statevalue.candles.0",
        "1": "construct.statevalue.candles.1",
        "2": "construct.statevalue.candles.2",
        "3": "construct.statevalue.candles.3"
    },
    cauldron_liquid: {
        water: "construct.statevalue.cauldron_liquid.water",
        lava: "construct.statevalue.cauldron_liquid.lava",
        powder_snow: "construct.statevalue.cauldron_liquid.powder_snow"
    },
    cluster_count: {
        "0": "construct.statevalue.cluster_count.0",
        "1": "construct.statevalue.cluster_count.1",
        "2": "construct.statevalue.cluster_count.2",
        "3": "construct.statevalue.cluster_count.3",
        "4": "construct.statevalue.cluster_count.4",
        "5": "construct.statevalue.cluster_count.5",
        "6": "construct.statevalue.cluster_count.6",
        "7": "construct.statevalue.cluster_count.7",
        "8": "construct.statevalue.cluster_count.8",
        "9": "construct.statevalue.cluster_count.9",
        "10": "construct.statevalue.cluster_count.10"
    },
    color: {
        white: "construct.statevalue.color.white",
        orange: "construct.statevalue.color.orange",
        magenta: "construct.statevalue.color.magenta",
        light_blue: "construct.statevalue.color.light_blue",
        yellow: "construct.statevalue.color.yellow",
        lime: "construct.statevalue.color.lime",
        pink: "construct.statevalue.color.pink",
        gray: "construct.statevalue.color.gray",
        silver: "construct.statevalue.color.silver",
        cyan: "construct.statevalue.color.cyan",
        purple: "construct.statevalue.color.purple",
        blue: "construct.statevalue.color.blue",
        brown: "construct.statevalue.color.brown",
        green: "construct.statevalue.color.green",
        red: "construct.statevalue.color.red",
        black: "construct.statevalue.color.black"
    },
    color_bit: {
        true: "construct.statevalue.color_bit.true",
        false: "construct.statevalue.color_bit.false"
    },
    conditional_bit: {
        true: "construct.statevalue.conditional_bit.true",
        false: "construct.statevalue.conditional_bit.false"
    },
    coral_direction: {
        2: "construct.statevalue.coral_direction.2",
        3: "construct.statevalue.coral_direction.3",
        1: "construct.statevalue.coral_direction.1",
        0: "construct.statevalue.coral_direction.0"
    },
    coral_hang_type_bit: {
        true: "construct.statevalue.coral_hang_type_bit.true",
        false: "construct.statevalue.coral_hang_type_bit.false"
    },
    covered_bit: {
        true: "construct.statevalue.covered_bit.true",
        false: "construct.statevalue.covered_bit.false"
    },
    cracked_state: {
        no_cracks: "construct.statevalue.cracked_state.no_cracks",
        cracked: "construct.statevalue.cracked_state.cracked",
        max_cracked: "construct.statevalue.cracked_state.max_cracked"
    },
    crafting: {
        true: "construct.statevalue.crafting.true",
        false: "construct.statevalue.crafting.false"
    },
    damage: {
        undamaged: "construct.statevalue.damage.undamaged",
        slightly_damaged: "construct.statevalue.damage.slightly_damaged",
        very_damaged: "construct.statevalue.damage.very_damaged",
        broken: "construct.statevalue.damage.broken"
    },
    dead_bit: {
        true: "construct.statevalue.dead_bit.true",
        false: "construct.statevalue.dead_bit.false"
    },
    direction: {
        0: "construct.statevalue.direction.0",
        2: "construct.statevalue.direction.2",
        3: "construct.statevalue.direction.3",
        1: "construct.statevalue.direction.1"
    },
    dirt_type: {
        normal: "construct.statevalue.dirt_type.normal",
        coarse: "construct.statevalue.dirt_type.coarse"
    },
    disarmed_bit: {
        true: "construct.statevalue.disarmed_bit.true",
        false: "construct.statevalue.disarmed_bit.false"
    },
    door_hinge_bit: {
        true: "construct.statevalue.door_hinge_bit.true",
        false: "construct.statevalue.door_hinge_bit.false"
    },
    drag_down: {
        true: "construct.statevalue.drag_down.true",
        false: "construct.statevalue.drag_down.false"
    },
    dripstone_thickness: {
        tip: "construct.statevalue.dripstone_thickness.tip",
        frustum: "construct.statevalue.dripstone_thickness.frustum",
        base: "construct.statevalue.dripstone_thickness.base",
        middle: "construct.statevalue.dripstone_thickness.middle",
        merge: "construct.statevalue.dripstone_thickness.merge"
    },
    end_portal_eye_bit: {
        true: "construct.statevalue.end_portal_eye_bit.true",
        false: "construct.statevalue.end_portal_eye_bit.false"
    },
    explode_bit: {
        true: "construct.statevalue.explode_bit.true",
        false: "construct.statevalue.explode_bit.false"
    },
    facing_direction: {
        "0": "construct.statevalue.facing_direction.0",
        "1": "construct.statevalue.facing_direction.1",
        "2": "construct.statevalue.facing_direction.2",
        "3": "construct.statevalue.facing_direction.3",
        "4": "construct.statevalue.facing_direction.4",
        "5": "construct.statevalue.facing_direction.5"
    },
    fill_level: {},
    ground_sign_direction: {
        0: "construct.statevalue.ground_sign_direction.0",
        1: "construct.statevalue.ground_sign_direction.1",
        2: "construct.statevalue.ground_sign_direction.2",
        3: "construct.statevalue.ground_sign_direction.3",
        4: "construct.statevalue.ground_sign_direction.4",
        5: "construct.statevalue.ground_sign_direction.5",
        6: "construct.statevalue.ground_sign_direction.6",
        7: "construct.statevalue.ground_sign_direction.7",
        8: "construct.statevalue.ground_sign_direction.8",
        9: "construct.statevalue.ground_sign_direction.9",
        10: "construct.statevalue.ground_sign_direction.10",
        11: "construct.statevalue.ground_sign_direction.11",
        12: "construct.statevalue.ground_sign_direction.12",
        13: "construct.statevalue.ground_sign_direction.13",
        14: "construct.statevalue.ground_sign_direction.14",
        15: "construct.statevalue.ground_sign_direction.15"
    },
    growth: {},
    hanging: {
        true: "construct.statevalue.hanging.true",
        false: "construct.statevalue.hanging.false"
    },
    head_piece_bit: {
        true: "construct.statevalue.head_piece_bit.true",
        false: "construct.statevalue.head_piece_bit.false"
    },
    height: {},
    huge_mushroom_bits: {
        "0": "construct.statevalue.huge_mushroom_bits.0",
        "1": "construct.statevalue.huge_mushroom_bits.1",
        "2": "construct.statevalue.huge_mushroom_bits.2",
        "3": "construct.statevalue.huge_mushroom_bits.3",
        "4": "construct.statevalue.huge_mushroom_bits.4",
        "5": "construct.statevalue.huge_mushroom_bits.5",
        "6": "construct.statevalue.huge_mushroom_bits.6",
        "7": "construct.statevalue.huge_mushroom_bits.7",
        "8": "construct.statevalue.huge_mushroom_bits.8",
        "9": "construct.statevalue.huge_mushroom_bits.9",
        "10": "construct.statevalue.huge_mushroom_bits.10",
        "11": "construct.statevalue.huge_mushroom_bits.11",
        "12": "construct.statevalue.huge_mushroom_bits.12",
        "13": "construct.statevalue.huge_mushroom_bits.13",
        "14": "construct.statevalue.huge_mushroom_bits.14",
        "15": "construct.statevalue.huge_mushroom_bits.15"
    },
    in_wall_bit: {
        true: "construct.statevalue.in_wall_bit.true",
        false: "construct.statevalue.in_wall_bit.false"
    },
    infiniburn_bit: {
        true: "construct.statevalue.infiniburn_bit.true",
        false: "construct.statevalue.infiniburn_bit.false"
    },
    item_frame_map_bit: {
        true: "construct.statevalue.item_frame_map_bit.true",
        false: "construct.statevalue.item_frame_map_bit.false"
    },
    item_frame_photo_bit: {
        true: "construct.statevalue.item_frame_photo_bit.true",
        false: "construct.statevalue.item_frame_photo_bit.false"
    },
    liquid_depth: {},
    lit: {
        true: "construct.statevalue.lit.true",
        false: "construct.statevalue.lit.false"
    },
    moisturized_amount: {},
    natural: {
        true: "construct.statevalue.natural.true",
        false: "construct.statevalue.natural.false"
    },
    no_drop_bit: {
        true: "construct.statevalue.no_drop_bit.true",
        false: "construct.statevalue.no_drop_bit.false"
    },
    occupied_bit: {
        true: "construct.statevalue.occupied_bit.true",
        false: "construct.statevalue.occupied_bit.false"
    },
    ominous: {
        true: "construct.statevalue.ominous.true",
        false: "construct.statevalue.ominous.false"
    },
    open_bit: {
        true: "construct.statevalue.open_bit.true",
        false: "construct.statevalue.open_bit.false"
    },
    orientation: {
        0: "construct.statevalue.orientation.0",
        1: "construct.statevalue.orientation.1",
        2: "construct.statevalue.orientation.2",
        3: "construct.statevalue.orientation.3",
        4: "construct.statevalue.orientation.4",
        5: "construct.statevalue.orientation.5",
        6: "construct.statevalue.orientation.6",
        7: "construct.statevalue.orientation.7",
        8: "construct.statevalue.orientation.8",
        9: "construct.statevalue.orientation.9",
        10: "construct.statevalue.orientation.10",
        11: "construct.statevalue.orientation.11",
        12: "construct.statevalue.orientation.12",
        13: "construct.statevalue.orientation.13",
        14: "construct.statevalue.orientation.14",
        15: "construct.statevalue.orientation.15"
    },
    output_lit_bit: {
        true: "construct.statevalue.output_lit_bit.true",
        false: "construct.statevalue.output_lit_bit.false"
    },
    output_subtract_bit: {
        true: "construct.statevalue.output_subtract_bit.true",
        false: "construct.statevalue.output_subtract_bit.false"
    },
    pale_moss_carpet_side_east: {
        none: "construct.statevalue.pale_moss_carpet_side_east.none",
        short: "construct.statevalue.pale_moss_carpet_side_east.short",
        tall: "construct.statevalue.pale_moss_carpet_side_east.tall"
    },
    pale_moss_carpet_side_north: {
        none: "construct.statevalue.pale_moss_carpet_side_north.none",
        short: "construct.statevalue.pale_moss_carpet_side_north.short",
        tall: "construct.statevalue.pale_moss_carpet_side_north.tall"
    },
    pale_moss_carpet_side_south: {
        none: "construct.statevalue.pale_moss_carpet_side_south.none",
        short: "construct.statevalue.pale_moss_carpet_side_south.short",
        tall: "construct.statevalue.pale_moss_carpet_side_south.tall"
    },
    pale_moss_carpet_side_west: {
        none: "construct.statevalue.pale_moss_carpet_side_west.none",
        short: "construct.statevalue.pale_moss_carpet_side_west.short",
        tall: "construct.statevalue.pale_moss_carpet_side_west.tall"
    },
    persistent_bit: {
        true: "construct.statevalue.persistent_bit.true",
        false: "construct.statevalue.persistent_bit.false"
    },
    portal_axis: {
        x: "construct.statevalue.portal_axis.x",
        z: "construct.statevalue.portal_axis.z"
    },
    powered_bit: {
        true: "construct.statevalue.powered_bit.true",
        false: "construct.statevalue.powered_bit.false"
    },
    rail_data_bit: {
        true: "construct.statevalue.rail_data_bit.true",
        false: "construct.statevalue.rail_data_bit.false"
    },
    rail_direction: {
        0: "construct.statevalue.rail_direction.0",
        1: "construct.statevalue.rail_direction.1",
        2: "construct.statevalue.rail_direction.2",
        3: "construct.statevalue.rail_direction.3",
        4: "construct.statevalue.rail_direction.4",
        5: "construct.statevalue.rail_direction.5",
        6: "construct.statevalue.rail_direction.6",
        7: "construct.statevalue.rail_direction.7",
        8: "construct.statevalue.rail_direction.8",
        9: "construct.statevalue.rail_direction.9"
    },
    redstone_signal: {},
    repeater_delay: {
        0: "construct.statevalue.repeater_delay.0",
        1: "construct.statevalue.repeater_delay.1",
        2: "construct.statevalue.repeater_delay.2",
        3: "construct.statevalue.repeater_delay.3"
    },
    sea_grass_type: {
        default: "construct.statevalue.sea_grass_type.default",
        double_top: "construct.statevalue.sea_grass_type.double_top",
        double_bot: "construct.statevalue.sea_grass_type.double_bot"
    },
    sponge_type: {
        dry: "construct.statevalue.sponge_type.dry",
        wet: "construct.statevalue.sponge_type.wet"
    },
    stability: {},
    stability_check: {
        true: "construct.statevalue.stability_check.true",
        false: "construct.statevalue.stability_check.false"
    },
    stripped_bit: {
        true: "construct.statevalue.stripped_bit.true",
        false: "construct.statevalue.stripped_bit.false"
    },
    structure_block_type: {
        data: "construct.statevalue.structure_block_type.data",
        save: "construct.statevalue.structure_block_type.save",
        load: "construct.statevalue.structure_block_type.load",
        corner: "construct.statevalue.structure_block_type.corner",
        invalid: "construct.statevalue.structure_block_type.invalid",
        export: "construct.statevalue.structure_block_type.export"
    },
    suspended_bit: {
        true: "construct.statevalue.suspended_bit.true",
        false: "construct.statevalue.suspended_bit.false"
    },
    tip: {
        true: "construct.statevalue.tip.true",
        false: "construct.statevalue.tip.false"
    },
    toggle_bit: {
        true: "construct.statevalue.toggle_bit.true",
        false: "construct.statevalue.toggle_bit.false"
    },
    top_slot_bit: {
        true: "construct.statevalue.top_slot_bit.true",
        false: "construct.statevalue.top_slot_bit.false"
    },
    torch_facing_direction: {
        unknown: "construct.statevalue.torch_facing_direction.unknown",
        west: "construct.statevalue.torch_facing_direction.west",
        east: "construct.statevalue.torch_facing_direction.east",
        north: "construct.statevalue.torch_facing_direction.north",
        south: "construct.statevalue.torch_facing_direction.south",
        top: "construct.statevalue.torch_facing_direction.top"
    },
    trial_spawner_state: {
        "0": "construct.statevalue.trial_spawner_state.0",
        "1": "construct.statevalue.trial_spawner_state.1",
        "2": "construct.statevalue.trial_spawner_state.2",
        "3": "construct.statevalue.trial_spawner_state.3",
        "4": "construct.statevalue.trial_spawner_state.4",
        "5": "construct.statevalue.trial_spawner_state.5"
    },
    triggered_bit: {
        true: "construct.statevalue.triggered_bit.true",
        false: "construct.statevalue.triggered_bit.false"
    },
    turtle_egg_count: {
        one_egg: "construct.statevalue.turtle_egg_count.one_egg",
        two_egg: "construct.statevalue.turtle_egg_count.two_egg",
        three_egg: "construct.statevalue.turtle_egg_count.three_egg",
        four_egg: "construct.statevalue.turtle_egg_count.four_egg"
    },
    update_bit: {
        true: "construct.statevalue.update_bit.true",
        false: "construct.statevalue.update_bit.false"
    },
    upper_block_bit: {
        true: "construct.statevalue.upper_block_bit.true",
        false: "construct.statevalue.upper_block_bit.false"
    },
    upside_down_bit: {
        true: "construct.statevalue.upside_down_bit.true",
        false: "construct.statevalue.upside_down_bit.false"
    },
    vine_direction_bits: {
        0: "construct.statevalue.vine_direction_bits.0",
        1: "construct.statevalue.vine_direction_bits.1",
        2: "construct.statevalue.vine_direction_bits.2",
        3: "construct.statevalue.vine_direction_bits.3",
        4: "construct.statevalue.vine_direction_bits.4",
        5: "construct.statevalue.vine_direction_bits.5",
        6: "construct.statevalue.vine_direction_bits.6",
        7: "construct.statevalue.vine_direction_bits.7",
        8: "construct.statevalue.vine_direction_bits.8",
        9: "construct.statevalue.vine_direction_bits.9",
        10: "construct.statevalue.vine_direction_bits.10",
        11: "construct.statevalue.vine_direction_bits.11",
        12: "construct.statevalue.vine_direction_bits.12",
        13: "construct.statevalue.vine_direction_bits.13",
        14: "construct.statevalue.vine_direction_bits.14",
        15: "construct.statevalue.vine_direction_bits.15"
    },
    wall_connection_type_east: {
        none: "construct.statevalue.wall_connection_type_east.none",
        short: "construct.statevalue.wall_connection_type_east.short",
        tall: "construct.statevalue.wall_connection_type_east.tall"
    },
    wall_connection_type_north: {
        none: "construct.statevalue.wall_connection_type_north.none",
        short: "construct.statevalue.wall_connection_type_north.short",
        tall: "construct.statevalue.wall_connection_type_north.tall"
    },
    wall_connection_type_south: {
        none: "construct.statevalue.wall_connection_type_south.none",
        short: "construct.statevalue.wall_connection_type_south.short",
        tall: "construct.statevalue.wall_connection_type_south.tall"
    },
    wall_connection_type_west: {
        none: "construct.statevalue.wall_connection_type_west.none",
        short: "construct.statevalue.wall_connection_type_west.short",
        tall: "construct.statevalue.wall_connection_type_west.tall"
    },
    wall_post_bit: {
        true: "construct.statevalue.wall_post_bit.true",
        false: "construct.statevalue.wall_post_bit.false"
    },
    weirdo_direction: {
        0: "construct.statevalue.weirdo_direction.0",
        1: "construct.statevalue.weirdo_direction.1",
        2: "construct.statevalue.weirdo_direction.2",
        3: "construct.statevalue.weirdo_direction.3"
    }
};

let Block_state_mapping = {
    active: "construct.blockstate.active",
    age: "construct.blockstate.age",
    age_bit: "construct.blockstate.age_bit",
    allow_underwater_bit: "construct.blockstate.allow_underwater_bit",
    attached_bit: "construct.blockstate.attached_bit",
    attachment: "construct.blockstate.attachment",
    bamboo_leaf_size: "construct.blockstate.bamboo_leaf_size",
    bamboo_stalk_thickness: "construct.blockstate.bamboo_stalk_thickness",
    big_dripleaf_tilt: "construct.blockstate.big_dripleaf_tilt",
    bite_counter: "construct.blockstate.bite_counter",
    books_stored: "construct.blockstate.books_stored",
    brewing_stand_slot_a_bit: "construct.blockstate.brewing_stand_slot_a_bit",
    brewing_stand_slot_b_bit: "construct.blockstate.brewing_stand_slot_b_bit",
    brewing_stand_slot_c_bit: "construct.blockstate.brewing_stand_slot_c_bit",
    button_pressed_bit: "construct.blockstate.button_pressed_bit",
    candles: "construct.blockstate.candles",
    cauldron_liquid: "construct.blockstate.cauldron_liquid",
    chisel_type: "construct.blockstate.chisel_type",
    cluster_count: "construct.blockstate.cluster_count",
    color: "construct.blockstate.color",
    color_bit: "construct.blockstate.color_bit",
    conditional_bit: "construct.blockstate.conditional_bit",
    coral_color: "construct.blockstate.coral_color",
    coral_direction: "construct.blockstate.coral_direction",
    coral_hang_type_bit: "construct.blockstate.coral_hang_type_bit",
    covered_bit: "construct.blockstate.covered_bit",
    cracked_state: "construct.blockstate.cracked_state",
    crafting: "construct.blockstate.crafting",
    damage: "construct.blockstate.damage",
    dead_bit: "construct.blockstate.dead_bit",
    direction: "construct.blockstate.direction",
    dirt_type: "construct.blockstate.dirt_type",
    disarmed_bit: "construct.blockstate.disarmed_bit",
    door_hinge_bit: "construct.blockstate.door_hinge_bit",
    double_plant_type: "construct.blockstate.double_plant_type",
    drag_down: "construct.blockstate.drag_down",
    dripstone_thickness: "construct.blockstate.dripstone_thickness",
    end_portal_eye_bit: "construct.blockstate.end_portal_eye_bit",
    explode_bit: "construct.blockstate.explode_bit",
    facing_direction: "construct.blockstate.facing_direction",
    fill_level: "construct.blockstate.fill_level",
    ground_sign_direction: "construct.blockstate.ground_sign_direction",
    growth: "construct.blockstate.growth",
    hanging: "construct.blockstate.hanging",
    head_piece_bit: "construct.blockstate.head_piece_bit",
    height: "construct.blockstate.height",
    huge_mushroom_bits: "construct.blockstate.huge_mushroom_bits",
    in_wall_bit: "construct.blockstate.in_wall_bit",
    infiniburn_bit: "construct.blockstate.infiniburn_bit",
    item_frame_map_bit: "construct.blockstate.item_frame_map_bit",
    item_frame_photo_bit: "construct.blockstate.item_frame_photo_bit",
    liquid_depth: "construct.blockstate.liquid_depth",
    lit: "construct.blockstate.lit",
    moisturized_amount: "construct.blockstate.moisturized_amount",
    monster_egg_stone_type: "construct.blockstate.monster_egg_stone_type",
    natural: "construct.blockstate.natural",
    no_drop_bit: "construct.blockstate.no_drop_bit",
    occupied_bit: "construct.blockstate.occupied_bit",
    ominous: "construct.blockstate.ominous",
    open_bit: "construct.blockstate.open_bit",
    orientation: "construct.blockstate.orientation",
    output_lit_bit: "construct.blockstate.output_lit_bit",
    output_subtract_bit: "construct.blockstate.output_subtract_bit",
    pale_moss_carpet_side_east: "construct.blockstate.pale_moss_carpet_side_east",
    pale_moss_carpet_side_north: "construct.blockstate.pale_moss_carpet_side_north",
    pale_moss_carpet_side_south: "construct.blockstate.pale_moss_carpet_side_south",
    pale_moss_carpet_side_west: "construct.blockstate.pale_moss_carpet_side_west",
    persistent_bit: "construct.blockstate.persistent_bit",
    portal_axis: "construct.blockstate.portal_axis",
    powered_bit: "construct.blockstate.powered_bit",
    rail_data_bit: "construct.blockstate.rail_data_bit",
    rail_direction: "construct.blockstate.rail_direction",
    redstone_signal: "construct.blockstate.redstone_signal",
    repeater_delay: "construct.blockstate.repeater_delay",
    sea_grass_type: "construct.blockstate.sea_grass_type",
    sponge_type: "construct.blockstate.sponge_type",
    stability: "construct.blockstate.stability",
    stability_check: "construct.blockstate.stability_check",
    stripped_bit: "construct.blockstate.stripped_bit",
    structure_block_type: "construct.blockstate.structure_block_type",
    suspended_bit: "construct.blockstate.suspended_bit",
    tip: "construct.blockstate.tip",
    toggle_bit: "construct.blockstate.toggle_bit",
    top_slot_bit: "construct.blockstate.top_slot_bit",
    torch_facing_direction: "construct.blockstate.torch_facing_direction",
    trial_spawner_state: "construct.blockstate.trial_spawner_state",
    triggered_bit: "construct.blockstate.triggered_bit",
    turtle_egg_count: "construct.blockstate.turtle_egg_count",
    update_bit: "construct.blockstate.update_bit",
    upper_block_bit: "construct.blockstate.upper_block_bit",
    upside_down_bit: "construct.blockstate.upside_down_bit",
    vine_direction_bits: "construct.blockstate.vine_direction_bits",
    wall_connection_type_east: "construct.blockstate.wall_connection_type_east",
    wall_connection_type_north: "construct.blockstate.wall_connection_type_north",
    wall_connection_type_south: "construct.blockstate.wall_connection_type_south",
    wall_connection_type_west: "construct.blockstate.wall_connection_type_west",
    wall_post_bit: "construct.blockstate.wall_post_bit",
    weirdo_direction: "construct.blockstate.weirdo_direction"
};
class BlockInfo {
    static shownToLastTick = new Set();

    static onTick() {
        for (const player of world.getAllPlayers()) {
            if (!player)
                continue;
            this.showStructureBlockInfo(player);
        }
    }

    static showStructureBlockInfo(player) {
        const block = Raycaster.getTargetedStructureBlock(player, { isFirst: true, collideWithWorldBlocks: true, useActiveLayer: true });
        if (!block && this.shownToLastTick.has(player.id)) {
            player.onScreenDisplay.setActionBar({ rawtext: [
                    { translate: 'construct.blockinfo.header' },
                    { text: '\n' },
                    { translate: 'construct.blockinfo.none' }
                ]});
            this.shownToLastTick.delete(player.id);
        }
        if (!block)
            return;
        player.onScreenDisplay.setActionBar(this.getFormattedBlockInfo(player, block.permutation));
        this.shownToLastTick.add(player.id);
    }

    static getFormattedBlockInfo(player, block) {
        return { rawtext: [
                { translate: 'construct.blockinfo.header' },
                this.getSupplyMessage(player, block),
                { text: '\n' },
                this.getBlockMessage(block)
            ] };
    }

    static getBlockMessage(block) {
        if (!block)
            return { translate: 'construct.blockinfo.unknown' };
        const message = { rawtext: [{ text: '§a' }, { translate: block.type.id }]};
        const states = block.getAllStates();
        if (Object.keys(states).length > 0)
            message.rawtext.push(...this.getFormattedStates(states));
        if (block.isWaterlogged)
            message.rawtext.push({ rawtext: [
                    { text: '\n§7' },
                    { translate: 'construct.blockinfo.waterlogged' }
                ]});
        return message;
    }
    /**
     * @returns {import("@minecraft/server").RawMessage[]}
     * */
    static getFormattedStates(states) {
        return Object.entries(states).map(/** @return {import("@minecraft/server").RawMessage}* */([key, value]) =>
        {return {rawtext: [{text:"\n§7"},{  translate: Block_state_mapping[key],with:{rawtext: [{translate: State_values[key][String(value)]}]} }]};})
    }

    static getSupplyMessage(player, block) {
        const itemStack = fetchMatchingItemSlot(player, block.getItemStack()?.typeId);
        const isInSurvival = player.getGameMode() === GameMode.Survival;
        if (!itemStack && isInSurvival)
            return { translate: 'construct.blockinfo.nosupply' };
        return { text: '' };
    }
}

system.runInterval(() => BlockInfo.onTick());