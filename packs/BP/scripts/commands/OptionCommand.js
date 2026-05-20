import { CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { PlayerCommandOrigin } from '../classes/Commands/PlayerCommandOrigin';
import { BuilderOptions } from '../classes/Builder/BuilderOptions';
import { requirePlayer } from '../classes/Commands/lib/requirePlayer';
import { commandError } from '../classes/Commands/lib/commandError';

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
            callback: (source, optionId, state) => this.run(source, optionId, state)
        });
    }

    run(source, optionId, state) {
        try {
            const player = requirePlayer(source);
            if (!BuilderOptions.get(optionId)) {
                system.run(() => source.sendMessage({
                    rawtext: [{ translate: 'construct.commands.option.unknownOption', with: [optionId] }]
                }));
                return { status: CustomCommandStatus.Failure };
            }
            system.run(() => {
                BuilderOptions.setValue(optionId, player.id, state);
                source.sendMessage({
                    rawtext: [{ translate: 'construct.commands.option.success', with: [optionId, String(state)] }]
                });
            });
            return { status: CustomCommandStatus.Success };
        } catch (err) {
            return commandError(source, err);
        }
    }
}

export const optionCommand = new OptionCommand();
