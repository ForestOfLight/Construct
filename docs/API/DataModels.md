# Data Models

The following data models are used to represent the format of the data passed by the API endpoints. More information about the API endpoints can be found in the [Endpoints](./Endpoints.md) page.

You'll need to include Construct's Data Model definitions in your project to work with the API effectively. These data models define the structure of the data passed to and from the API endpoints. They can be found at [`packs/BP/scripts/API/ConstructAPIModel.js`](https://github.com/ForestOfLight/Construct/blob/main/packs/BP/scripts/API/ConstructAPIModel.js). Copy the file into your project and import the models as needed.

## Instance

An `Instance` represents a single structure instance in the world, along with its properties and state.

```typescript
interface Instance {
    name: PROTO.String,
    structureId: PROTO.String,
    isEnabled: PROTO.Boolean,
    dimensionId: PROTO.Optional(PROTO.String),
    location: PROTO.Optional({
        x: PROTO.Float64,
        y: PROTO.Float64,
        z: PROTO.Float64
    }),
    bounds: PROTO.Optional(PROTO.Object({
        min: {
            x: PROTO.Float64,
            y: PROTO.Float64,
            z: PROTO.Float64
        },
        max: {
            x: PROTO.Float64,
            y: PROTO.Float64,
            z: PROTO.Float64
        }
    })),
    currentLayer: PROTO.Int16,
    maxLayer: PROTO.Int16,
    verifier: PROTO.Object({
        isEnabled: PROTO.Boolean,
        trackPlayerDistance: PROTO.Int8,
        particleLifetime: PROTO.Int32
    }),
    renderMode: PROTO.String
}
```

`renderMode` is one of `"default"`, `"performance"`, `"previewOnly"`, or `"classic"`. Any other value is treated as `"default"`.

## Builder

A `Builder` represents a single builder (Construct's name for Players) in the world, along with its settings and properties.

```typescript
interface Builder {
    playerId: PROTO.String,
    easyPlace: PROTO.Boolean,
    fastEasyPlace: PROTO.Boolean,
    materialGrabber: PROTO.Boolean,
    materialInstanceName: PROTO.String,
    defaultRenderMode: PROTO.String
}
```

`defaultRenderMode` takes the same values as an instance's `renderMode`, and is the mode given to instances this builder creates. Changing it does not affect instances that already exist. A value that is not one of the four modes is ignored, leaving the builder's current preference in place.