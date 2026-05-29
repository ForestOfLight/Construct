import { PROTO } from "./MCBE-IPC/ipc";

export const VoidModel = PROTO.Void;

export const ErrorModel = PROTO.Optional(PROTO.Object({
    code: PROTO.Int8,
    name: PROTO.Optional(PROTO.String),
    message: PROTO.Optional(PROTO.String)
}));

export const ReturnModelShell = {
    apiVersion: PROTO.String,
    data: void 0,
    error: ErrorModel
};

export const CallModelShell = {
    apiVersion: PROTO.String,
    parameterMap: void 0
};