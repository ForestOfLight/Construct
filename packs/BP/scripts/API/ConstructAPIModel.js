import { PROTO } from "../lib/AddonAPIKit";

// Instances

const LocationModel = PROTO.Object({
    x: PROTO.Float64,
    y: PROTO.Float64,
    z: PROTO.Float64
});

export const InstanceModel = PROTO.Object({
    name: PROTO.String,
    structureId: PROTO.String,
    isEnabled: PROTO.Boolean,
    dimensionId: PROTO.Optional(PROTO.String),
    location: PROTO.Optional(LocationModel),
    bounds: PROTO.Optional(PROTO.Object({
        min: LocationModel,
        max: LocationModel
    })),
    currentLayer: PROTO.Int16,
    maxLayer: PROTO.Int16,
    verifier: PROTO.Object({
        isEnabled: PROTO.Boolean,
        trackPlayerDistance: PROTO.Int8,
        particleLifetime: PROTO.Int32
    }),
    renderMode: PROTO.String
});

export const InstancesModel = PROTO.Array(InstanceModel);

export const StructureMaterialsModel = PROTO.Map(PROTO.String, PROTO.Int32);

export const InstanceNameParameterModel = PROTO.Object({
    instanceName: PROTO.String
});

export const AddInstanceParameterModel = PROTO.Object({
    instanceName: PROTO.String,
    structureId: PROTO.String
});

export const EditInstanceParameterModel = PROTO.Object({
    instanceName: PROTO.String,
    instance: InstanceModel
});

// Builders

export const BuilderModel = PROTO.Object({
    playerId: PROTO.String,
    easyPlace: PROTO.Boolean,
    fastEasyPlace: PROTO.Boolean,
    materialGrabber: PROTO.Boolean,
    materialInstanceName: PROTO.String
});

export const BuilderIdParameterModel = PROTO.Object({
    playerId: PROTO.String
});