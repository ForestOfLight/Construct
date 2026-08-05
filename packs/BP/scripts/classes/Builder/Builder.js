import { BuilderOptions } from "./BuilderOptions";

export class Builder {
    playerId;
    materialInstanceName = void 0;
    flexibleInstanceMovement = void 0;

    constructor(playerId) {
        this.playerId = playerId;
    }

    isOptionEnabled(optionId) {
        return BuilderOptions.isEnabled(optionId, this.playerId);
    }

    getOptionValue(optionId) {
        return BuilderOptions.getValue(optionId, this.playerId);
    }

    setOption(optionId, value) {
        return BuilderOptions.setValue(optionId, this.playerId, value);
    }

    isFlexibleInstanceMoving() {
        return this.flexibleInstanceMovement !== void 0;
    }

    asPacket() {
        return {
            playerId: this.playerId,
            easyPlace: this.isOptionEnabled('easyPlace'),
            fastEasyPlace: this.isOptionEnabled('fastEasyPlace'),
            materialGrabber: this.isOptionEnabled('materialGrabber'),
            materialInstanceName: this.materialInstanceName,
            defaultRenderMode: this.getOptionValue('defaultRenderMode')
        };
    }

    setOptions(builderOptions) {
        this.setOption('easyPlace', builderOptions.easyPlace);
        this.setOption('fastEasyPlace', builderOptions.fastEasyPlace);
        this.setOption('materialGrabber', builderOptions.materialGrabber);
        this.setOption('defaultRenderMode', builderOptions.defaultRenderMode);
        this.materialInstanceName = builderOptions.materialInstanceName;
    }
}