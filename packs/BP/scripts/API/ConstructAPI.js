import { AddonAPI } from "../lib/AddonAPIKit";
import { PACK_IDENTIFIER } from "../consts";
import { InstancesController } from "./controllers/InstancesController";
import { structureCollection } from "../classes/Structure/StructureCollection";
import { BuildersController } from "./controllers/BuildersController";
import { Builders } from "../classes/Builder/Builders";

class ConstructAPI extends AddonAPI {
    constructor(version) {
        super(PACK_IDENTIFIER, version);
        const instancesController = new InstancesController(structureCollection);
        this.setupController(instancesController);
        const buildersController = new BuildersController(Builders);
        this.setupController(buildersController);
    }
}

export const constructAPI = new ConstructAPI("1.0.0");