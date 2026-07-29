import { AddonAPIServer } from "../lib/AddonAPIKit";
import { PACK_IDENTIFIER } from "../consts";
import { InstancesController } from "./controllers/InstancesController";
import { instanceCollection } from "../classes/Instance/InstanceCollection";
import { BuildersController } from "./controllers/BuildersController";
import { Builders } from "../classes/Builder/Builders";

class ConstructAPI extends AddonAPIServer {
    constructor(version) {
        super(PACK_IDENTIFIER, version);
        const instancesController = new InstancesController(instanceCollection);
        this.setupController(instancesController);
        const buildersController = new BuildersController(Builders);
        this.setupController(buildersController);
    }
}

export const constructAPI = new ConstructAPI("1.0.0");