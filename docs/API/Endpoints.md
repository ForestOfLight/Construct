# Endpoints

This page documents all the available API endpoints that can be accessed by other addons or scripts. The API is designed so that entire objects are passed at once, rather than making multiple calls to edit or query individual properties. This allows for fewer API calls and easier access to data.

## Instances

### `construct:instances`

Get a list of all registered instance names.

- **Parameters**: `void`
- **Returns**: `string[]`

---

### `construct:instance:get`

Get the full data object for a specific instance.

- **Parameters**: `instanceName: string`
- **Returns**: `Instance` (see [Data Model](./DataModels.md#instance))

---

### `construct:instance:add`

Create a new instance with a given name and structure ID.

- **Parameters**: `instanceName: string`, `structureId: string`
- **Returns**: `Instance` (see [Data Model](./DataModels.md#instance))

---

### `construct:instance:edit`

Edit properties of an existing instance (e.g. enabled state, position).

- **Parameters**: `instanceName: string`, `properties: Instance`
- **Returns**: `Instance` (see [Data Model](./DataModels.md#instance))

---

### `construct:instance:delete`

Permanently delete an instance.

- **Parameters**: `instanceName: string`
- **Returns**: `void`

---

### `construct:instance:materials`

Get a list of materials required to build the active section of an instance. Respects the active layer.

- **Parameters**: `instanceName: string`
- **Returns**: `Map<string, number>` (material name to quantity)

## Builders

### `construct:builder:get`

Get the full data object for a specific builder (player).

- **Parameters**: `playerId: string`
- **Returns**: `Builder` (see [Data Model](./DataModels.md#builder))

---

### `construct:builder:edit`

Edit properties of an existing builder.

- **Parameters**: `playerId: string`, `properties: Builder`
- **Returns**: `Builder` (see [Data Model](./DataModels.md#builder))
