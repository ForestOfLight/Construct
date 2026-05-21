import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { PlayerCommandOrigin } from '../classes/Commands/PlayerCommandOrigin';
import { BuilderOptions } from '../classes/Builder/BuilderOptions';

export class OptionCommand extends Command {
    constructor() {
        super({
            name: 'option',
            description: 'construct.commands.option',
            allowedSources: [PlayerCommandOrigin],
            mandatoryParameters: [
                { name: 'optionId', type: CustomCommandParamType.Enum },
                { name: 'state', type: CustomCommandParamType.Boolean }
            ],
            enums: [
                { name: 'optionId', values: ['easyPlace', 'fastEasyPlace', 'materialGrabber'] }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (source, optionId, state) => this.run(source, optionId, state)
        });
    }

    run(source, optionId, state) {
        if (!BuilderOptions.get(optionId)) {
            source.sendMessage({ translate: 'construct.commands.option.unknownOption', with: [optionId] });
            return void 0;
        }
        system.run(() => {
            const player = source.getSource();
            BuilderOptions.setValue(optionId, player.id, state);
            source.sendMessage({ translate: 'construct.commands.option.success', with: [optionId, String(state)] });
        });
        return { status: CustomCommandStatus.Success };
    }
}

export const optionCommand = new OptionCommand();
