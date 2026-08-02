import { instanceCollection } from "./Instance/InstanceCollection";

export class Raycaster {
    static STEP_SIZE = 0.2;

    static getStructureBlocks(dimension, startLocation, direction, { maxDistance = 7, getFirst = true, collideWithWorldBlocks = true, useActiveLayer = true }) {
        const blocks = [];
        let location = startLocation;
        let distance = 0;
        while (distance < maxDistance) {
            const instance = instanceCollection.getInstanceAt(dimension.id, location, { useActiveLayer });
            if (instance) {
                const permutation = instance.getBlockPermutation(instance.toStructureCoords(location));
                if (permutation?.type.id !== 'minecraft:air') {
                    blocks.push({ permutation, location, instance});
                    if (getFirst)
                        break;
                }
                try {
                    if (collideWithWorldBlocks && !dimension.getBlock(location)?.isAir)
                        break;
                } catch (e) {
                    if (e.name === 'LocationOutOfWorldBoundariesError')
                        break;
                    throw e;
                }
            }
            location = {
                x: location.x + (direction.x*this.STEP_SIZE),
                y: location.y + (direction.y*this.STEP_SIZE),
                z: location.z + (direction.z*this.STEP_SIZE)
            };
            distance += this.STEP_SIZE;
        }
        // world.getDimension('minecraft:overworld').spawnParticle('minecraft:villager_happy', location);
        return blocks;
    }

    static getTargetedStructureBlock(player, { isFirst = true, collideWithWorldBlocks = true, useActiveLayer = true } = {}) {
        const startLocation = player.getHeadLocation();
        const direction = player.getViewDirection();
        const maxDistance = 7;
        const blocks = this.getStructureBlocks(player.dimension, startLocation, direction, { maxDistance, getFirst: isFirst, collideWithWorldBlocks, useActiveLayer });
        if (blocks.length === 0)
            return void 0;
        return isFirst ? blocks[0] : blocks[blocks.length - 1];
    }
}