import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { structureCollection } from '../classes/Structure/StructureCollection';
import { Vector } from '../lib/Vector';

export class InfoCommand extends Command {
    constructor() {
        super({
            name: 'info',
            description: 'construct.commands.info',
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
        return { translate: 'construct.commands.info.header', with: [instance.getName()] };
    }

    getStructureIdText(instance) {
        return { translate: 'construct.commands.info.structure', with: [instance.getStructureId()] };
    }

    getLocationText(instance) {
        if (!instance.hasLocation())
            return { translate: 'construct.commands.info.noLocation' };
        const { dimensionId, location } = instance.getLocation();
        return { translate: 'construct.commands.info.location', with: [location.toString(), dimensionId.replace('minecraft:', '')] };
    }

    getEnabledText(instance) {
        return { translate: 'construct.commands.info.enabled', with: [String(instance.isEnabled())] };
    }

    getLayerText(instance) {
        return { translate: 'construct.commands.info.layer', with: [String(instance.getLayer()), String(instance.getMaxLayer())] };
    }

    getVerifierText(instance) {
        const verifier = instance.options.verifier;
        return { translate: 'construct.commands.info.verifier', with: [String(verifier.isEnabled)] };
    }

    getSizeText(instance) {
        const bounds = instance.getBounds();
        return { translate: 'construct.commands.info.size', with: [bounds.max.toString(), Vector.volume(bounds.min, bounds.max).toString()] };
    }
}

export const infoCommand = new InfoCommand();
