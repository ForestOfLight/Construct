# CLI Reference

All commands are prefixed with `construct:`. Arguments in angle brackets (`<arg>`) are required, while those in square brackets (`[arg]`) are optional. Assume commands can be run from any source (player, entity, block, or server) unless otherwise noted.

## Instance Management
 
### `construct:create <instanceName> <structureId>`
Create a new instance bound to a structure.
 
| Argument | Description |
|---|---|
| `<instanceName>` | Unique name for this instance. |
| `<structureId>` | ID of a structure saved in the world (without the `mystructure:` prefix). |
 
> Errors if `instanceName` is already taken or `structureId` does not exist.
 
### `construct:delete <instanceName>`
Permanently delete an instance.
 
| Argument | Description |
|---|---|
| `<instanceName>` | Name of the instance to delete. |
 
### `construct:rename <instanceName> <newInstanceName>`
Rename an existing instance.
 
| Argument | Description |
|---|---|
| `<instanceName>` | Current instance name. |
| `<newInstanceName>` | Desired new name. Errors if already in use. |
 
### `construct:instances`
List all registered instances and their status.
 
> Prints each instance name, its bound structure ID, enabled/disabled state, and placed location (if any).
 
## Placement & Movement
 
### `construct:place <instanceName> <x y z>`
Enable and place an instance at a location.
 
| Argument | Description |
|---|---|
| `<instanceName>` | Instance to place. |
| `<x y z>` | World coordinates. Errors if omitted. Supports tilde (`~`) notation. |
 
> If the instance already has a location, this is a move, not a fresh place.
 
### `construct:move <instanceName> [x y z]`
Reposition a placed instance without toggling its enabled state.
 
| Argument | Description |
|---|---|
| `<instanceName>` | Name of a placed instance. |
| `<x y z>` | Target world coordinates. |

## Enable / Disable
 
### `construct:enable <instanceName>`
Enable a placed instance.
 
> Requires the instance to have a saved location. Refreshes the outliner, verifier, and materials cache.
 
### `construct:disable <instanceName>`
Disable an active instance.
 
> Tears down outliner rendering and pauses the verifier. The instance retains its saved location and can be re-enabled.
 
## Layer Control
 
### `construct:layer <instanceName> <layer>`
Set the active layer of an instance.
 
| Argument | Description |
|---|---|
| `<instanceName>` | Name of the instance. |
| `<layer>` | Integer layer index. `0` = whole structure (no layer selected). Valid range: `0` to `structure.height`. |
 
> Errors if `layer` is out of bounds. Only meaningful for structures with height > 1.
 
### `construct:nextlayer <instanceName>`
Step the layer up by one (wraps from max back to `0`).
 
> Mirrors the "Next layer" button.
 
### `construct:prevlayer <instanceName>`
Step the layer down by one (wraps from `0` back to max).
 
> Mirrors the "Previous layer" button.

## Settings
 
### `construct:verifier <instanceName> true|false`
Toggle the structure verifier for an instance.
 
| Argument | Description |
|---|---|
| `<instanceName>` | Name of the instance. |
| `true\|false` | Whether to run the verifier. Corresponds to the "validation" toggle in Settings. |
 
### `construct:option <optionId> true|false`
Enable or disable a per-player builder option. Must be run as a player source.
 
| Argument | Description |
|---|---|
| `<optionId>` | One of: `easyPlace`, `fastEasyPlace`, `materialGrabber`. |
| `true\|false` | Desired state. Runs the option's enable/disable callback (gives or removes the action item). |
 
> Replaces the toggles in the Builder Options form. State is saved per-player via dynamic properties.

## Information
 
### `construct:instanceinfo <instanceName>`
Print instance details to chat.
 
> Outputs: bound structure ID, enabled state, placed location and dimension, current layer, verifier enabled, structure bounds (min/max). Equivalent to the data shown in the instance menu body.
 
### `construct:stats <instanceName>`
Run the structure verifier and print statistics.
 
> Triggers a standalone `StructureVerifier` pass (same as the "Statistics" button) and sends the result to chat. Errors if a verifier is already running on this instance.
 
### `construct:materials <instanceName> [missing]`
Print the material list for an instance.
 
| Argument | Description |
|---|---|
| `<instanceName>` | Name of the instance. |
| `missing` | When present, show only materials the player does not have in their inventory (mirrors the "missing only" toggle). Can only be used by a player source. |
 
> Respects the active layer: if a layer is set, only that layer's material counts are shown.

## Utility
 
### `construct:construct`
Give yourself the Construct menu item.
 
### `construct:tag <instanceName>`
Rename the held Construct item to an instance name for quick-open. Errors if the item is not a construct item or if the instance name is not registered.
 
| Argument | Description |
|---|---|
| `<instanceName>` | Instance name to embed in the item's `nameTag`. Using the item in-world will jump straight to that instance's menu. |
