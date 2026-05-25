import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { PlayerCommandOrigin } from '../classes/Commands/PlayerCommandOrigin';
import { BuilderOptions } from '../classes/Builder/BuilderOptions';

export class BuilderCommand extends Command {
    constructor() {
        super({
            name: 'builder',
            description: 'construct.commands.builder',
            allowedSources: [PlayerCommandOrigin],
            mandatoryParameters: [
                { name: 'builderOption', type: CustomCommandParamType.Enum },
                { name: 'state', type: CustomCommandParamType.Boolean }
            ],
            enums: [
                { name: 'builderOption', values: ['easyPlace', 'fastEasyPlace', 'materialGrabber'] }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (source, builderOption, state) => this.run(source, builderOption, state)
        });
    }

    run(source, builderOption, state) {
        if (!BuilderOptions.get(builderOption)) {
            source.sendMessage({ translate: 'construct.commands.builder.unknownOption', with: [builderOption] });
            return void 0;
        }
        system.run(() => {
            const player = source.getSource();
            BuilderOptions.setValue(builderOption, player.id, state);
            source.sendMessage({ translate: 'construct.commands.builder.success', with: [builderOption, String(state)] });
        });
        return { status: CustomCommandStatus.Success };
    }
}

export const builderCommand = new BuilderCommand();
