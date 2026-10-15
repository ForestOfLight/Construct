# CLI Reference

All commands are prefixed with `construct:`. Arguments in angle brackets (`<arg>`) are required, while those in square brackets (`[arg]`) are optional. Assume commands can be run from any source (player, entity, block, or server) unless otherwise noted.

## Default Instance

Commands that act on one instance (`move`, `enable`, `disable`, `layer`, `nextlayer`, `prevlayer`, `instanceinfo`, `stats` and `tag`) take `[instanceName]` as an optional argument. When you leave it out, the command uses your **CLI Default Instance**, a setting in the Builder Options menu. This is especially useful for command macros when playing on desktop. 

| Setting | Behavior |
|---|---|
| **Use standing location** (default) | Uses the placed instance you are standing inside when you run the command. Errors if you are not standing in one. |
| An instance name | Always uses that instance, wherever you are. If that instance is deleted, the setting goes back to **Use standing location**. |

## Instance Management
 
### `/construct:create <instanceName> <structureId>`
Create a new instance bound to a structure.
 
| Argument | Description |
|---|---|
| `<instanceName>` | Unique name for this instance. |
| `<structureId>` | ID of a structure saved in the world (without the `mystructure:` prefix). |
 
> Errors if `instanceName` is already taken or `structureId` does not exist.
 
### `/construct:delete <instanceName>`
Permanently delete an instance.
 
| Argument | Description |
|---|---|
| `<instanceName>` | Name of the instance to delete. |
 
### `/construct:rename <instanceName> <newInstanceName>`
Rename an existing instance.
 
| Argument | Description |
|---|---|
| `<instanceName>` | Current instance name. |
| `<newInstanceName>` | Desired new name. Errors if already in use. |
 
### `/construct:instances`
List all registered instances and their status.
 
> Prints each instance name, its bound structure ID, enabled/disabled state, and placed location (if any).
 
## Placement & Movement
 
### `/construct:place <instanceName> <x y z>`
Enable and place an instance at a location.
 
| Argument | Description |
|---|---|
| `<instanceName>` | Instance to place. |
| `<x y z>` | World coordinates. Errors if omitted. Supports tilde (`~`) notation. |
 
> If the instance already has a location, this is a move, not a fresh place.
 
### `/construct:move [instanceName] [dimension] [x y z]`
Reposition a placed instance without toggling its enabled state.
 
| Argument | Description |
|---|---|
| `[instanceName]` | Name of a placed instance. Defaults to your [CLI Default Instance](#default-instance). |
| `[dimension]` | Target dimension ID, e.g. `minecraft:overworld`, `minecraft:nether` or `minecraft:the_end`. |
| `[x y z]` | Target world coordinates. Supports tilde (`~`) notation. |

> If the dimension or coordinates are left out, the instance moves to your current position. Players can leave everything out, but other sources must give all three arguments. Arguments are read in order, so to give a dimension and coordinates you must also type the instance name, e.g. `/construct:move house minecraft:overworld 0 64 0`.

## Enable / Disable
 
### `/construct:enable [instanceName]`
Enable a placed instance.

| Argument | Description |
|---|---|
| `[instanceName]` | Name of the instance. Defaults to your [CLI Default Instance](#default-instance). |
 
> Requires the instance to have a saved location. Refreshes the outliner, verifier, and materials cache. Since a disabled instance is not rendered, **Use standing location** cannot find it; type the name or set a specific CLI Default Instance.
 
### `/construct:disable [instanceName]`
Disable an active instance.

| Argument | Description |
|---|---|
| `[instanceName]` | Name of the instance. Defaults to your [CLI Default Instance](#default-instance). |
 
> Tears down outliner rendering and pauses the verifier. The instance retains its saved location and can be re-enabled.
 
## Layer Control
 
### `/construct:layer <layer> [instanceName]`
Set the active layer of an instance.
 
| Argument | Description |
|---|---|
| `<layer>` | Integer layer index. `0` = whole structure (no layer selected). Valid range: `0` to `structure.height`. |
| `[instanceName]` | Name of the instance. Defaults to your [CLI Default Instance](#default-instance). |
 
> Errors if `layer` is out of bounds. Only meaningful for structures with height > 1.
 
### `/construct:nextlayer [instanceName]`
Step the layer up by one (wraps from max back to `0`).

| Argument | Description |
|---|---|
| `[instanceName]` | Name of the instance. Defaults to your [CLI Default Instance](#default-instance). |
 
> Mirrors the "Next layer" button.
 
### `/construct:prevlayer [instanceName]`
Step the layer down by one (wraps from `0` back to max).

| Argument | Description |
|---|---|
| `[instanceName]` | Name of the instance. Defaults to your [CLI Default Instance](#default-instance). |
 
> Mirrors the "Previous layer" button.

## Settings
 
### `/construct:verifier <instanceName> true|false`
Toggle the structure verifier for an instance.
 
| Argument | Description |
|---|---|
| `<instanceName>` | Name of the instance. |
| `true\|false` | Whether to run the verifier. Corresponds to the "validation" toggle in Settings. |
 
### `/construct:option <optionId> <value>`
Change one of your builder options. Must be run as a player source.
 
| Argument | Description |
|---|---|
| `<optionId>` | The builder option to change. See the table below. |
| `<value>` | The new value. Valid values depend on the option. |

| `optionId` | Valid values |
|---|---|
| `easyPlace` | `true`, `false` |
| `fastEasyPlace` | `true`, `false` |
| `materialGrabber` | `true`, `false` |
| `defaultRenderMode` | `default`, `performance`, `previewOnly`, `classic` |
| `cliDefaultInstance` | `standing` (use standing location), or the name of any instance. Wrap names that contain spaces in quotes. |
 
> Does the same thing as the Builder Options form. Turning on `easyPlace`, `fastEasyPlace` or `materialGrabber` gives you its action item, and turning it off removes the item. Options are saved per player. If an instance is itself named `standing`, `standing` still means "use standing location", so pick that instance from the menu instead.

### `/construct:admin [optionId] [value]`
Change a world-wide admin option. Requires admin (operator) permission. Run with no arguments (as a player) to open the Admin Options form.

| Argument | Description |
|---|---|
| `[optionId]` | The admin option to change. See the table below. |
| `[value]` | The new value. Valid values depend on the option. |

| `optionId` | Valid values | Effect |
|---|---|---|
| `disableEasyPlace` | `true`, `false` | Locks `easyPlace` off for every builder. Players' own settings are kept and come back once this is turned off. |
| `disableFastEasyPlace` | `true`, `false` | Locks `fastEasyPlace` off for every builder. Players' own settings are kept and come back once this is turned off. |

> State is saved per-world via dynamic properties.

## Information
 
### `/construct:instanceinfo [instanceName]`
Print instance details to chat.

| Argument | Description |
|---|---|
| `[instanceName]` | Name of the instance. Defaults to your [CLI Default Instance](#default-instance). |
 
> Outputs: bound structure ID, enabled state, placed location and dimension, current layer, verifier enabled, structure bounds (min/max). Equivalent to the data shown in the instance menu body.
 
### `/construct:stats [instanceName]`
Run the structure verifier and print statistics.

| Argument | Description |
|---|---|
| `[instanceName]` | Name of the instance. Defaults to your [CLI Default Instance](#default-instance). |
 
> Triggers a standalone `StructureVerifier` pass (same as the "Statistics" button) and sends the result to chat. Errors if a verifier is already running on this instance.
 
### `/construct:materials <instanceName> [subtractWorld] [subtractInventory]`
Print the material list for an instance.

| Argument | Description |
|---|---|
| `<instanceName>` | Name of the instance. |
| `subtractWorld` | When `true`, show only materials for blocks unplaced in the world. Uses the verifier's last known state of each block, so parts of the build that have not been loaded since the instance was placed or the world was loaded are counted as missing, with a note saying how many. Fails if the instance is not placed or its verifier is off. |
| `subtractInventory` | When `true`, also subtract the items in the player's inventory. Can only be used by a player source. |

> Respects the active layer: if a layer is set, only that layer's material counts are shown. To subtract only your inventory, pass `false` for `subtractWorld`, e.g. `/construct:materials house false true`.

## Utility
 
### `/construct:construct`
Give yourself the Construct menu item.
 
### `/construct:tag [instanceName]`
Rename the held Construct item to an instance name for quick-open. Must be run as a player. Errors if the item is not a construct item or if the instance name is not registered.
 
| Argument | Description |
|---|---|
| `[instanceName]` | Instance name to embed in the item's `nameTag`. Using the item in-world will jump straight to that instance's menu. Defaults to your [CLI Default Instance](#default-instance). |
