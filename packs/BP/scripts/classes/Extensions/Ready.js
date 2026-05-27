import { system } from "@minecraft/server";
import { Ready } from "./Ready.ipc";

system.runTimeout(() => {
    IPC.send(`constructExtension:ready`, Ready, void 0);
}, 1);