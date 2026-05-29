import { IPC } from "./MCBE-IPC/ipc";

export class AddonAPICaller {
    static async call(endpoint, parameterModel, parameterMap, returnDataModel) {
        return await IPC.invoke(endpoint, parameterModel, parameterMap, returnDataModel).then(result => result.value);
    }
}