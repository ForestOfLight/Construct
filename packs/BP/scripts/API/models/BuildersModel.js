import { PROTO } from "../../lib/AddonAPIKit/AddonAPIKit";

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