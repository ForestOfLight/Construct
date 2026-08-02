import { blockKeySpecs, blockModels } from "../../../blockModels";

export class BlockModelKeyResolver {
    lookupFaceRefs(blockId, states) {
        const keySpec = blockKeySpecs[blockId];
        if (keySpec === void 0)
            return void 0;
        for (let shapeIndex = 0; shapeIndex < keySpec.props.length; shapeIndex++) {
            const key = this.buildStateKey(blockId, keySpec.props[shapeIndex], shapeIndex, states);
            if (key === void 0)
                continue;
            const faceReferences = blockModels[key];
            if (faceReferences !== void 0)
                return faceReferences;
        }
        return void 0;
    }

    faceRefsForKey(key) {
        return blockModels[key];
    }

    buildStateKey(blockId, shapeProperties, shapeIndex, states) {
        let key = `${blockId}[${shapeIndex}|`;
        for (let propertyIndex = 0; propertyIndex < shapeProperties.length; propertyIndex++) {
            const propertyName = shapeProperties[propertyIndex];
            const value = states[propertyName];
            if (value === void 0)
                return void 0;
            if (propertyIndex > 0)
                key += ",";
            key += typeof value === "boolean" ? (value ? 1 : 0) : value;
        }
        return `${key}]`;
    }
}
