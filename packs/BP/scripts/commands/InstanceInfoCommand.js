import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { structureCollection } from '../classes/Structure/StructureCollection';
import { Vector } from '../lib/Vector';

export class InstanceInfoCommand extends Command {
    constructor() {
        super({
            name: 'instanceinfo',
            description: 'construct.commands.instanceinfo',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (source, instanceName) => this.run(source, instanceName)
        });
    }

    run(source, instanceName) {
        const instance = structureCollection.get(instanceName);
        const message = { rawtext: [
            this.getHeaderText(instance),
            { text: '\n' },
            this.getStructureIdText(instance),
            { text: '\n' },
            this.getLocationText(instance),
            { text: '\n' },
            this.getEnabledText(instance),
            { text: '\n' },
            this.getLayerText(instance),
            { text: '\n' },
            this.getVerifierText(instance),
            { text: '\n' },
            this.getSizeText(instance)
        ]};
        source.sendMessage(message);
        return { status: CustomCommandStatus.Success };
    }

    getHeaderText(instance) {
        return { translate: 'construct.commands.instanceinfo.header', with: [instance.getName()] };
    }

    getStructureIdText(instance) {
        return { translate: 'construct.commands.instanceinfo.structure', with: [instance.getStructureId()] };
    }

    getLocationText(instance) {
        if (!instance.hasLocation())
            return { translate: 'construct.commands.instanceinfo.noLocation' };
        const { dimensionId, location } = instance.getLocation();
        return { translate: 'construct.commands.instanceinfo.location', with: [location.toString(), dimensionId.replace('minecraft:', '')] };
    }

    getEnabledText(instance) {
        return { translate: 'construct.commands.instanceinfo.enabled', with: [String(instance.isEnabled())] };
    }

    getLayerText(instance) {
        return { translate: 'construct.commands.instanceinfo.layer', with: [String(instance.getLayer()), String(instance.getMaxLayer())] };
    }

    getVerifierText(instance) {
        const verifier = instance.options.verifier;
        return { translate: 'construct.commands.instanceinfo.verifier', with: [String(verifier.isEnabled)] };
    }

    getSizeText(instance) {
        const bounds = instance.getBounds();
        return { translate: 'construct.commands.instanceinfo.size', with: [bounds.max.toString(), Vector.volume(bounds.min, bounds.max).toString()] };
    }
}

export const instanceInfoCommand = new InstanceInfoCommand();
