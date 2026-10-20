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
                { name: 'builderOption', type: CustomCommandParamType.Enum },
                { name: 'value', type: CustomCommandParamType.String }
            ],
            enums: [
                { name: 'builderOption', values: BuilderOptions.getOptionIds() }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (origin, builderOption, value) => this.run(origin, builderOption, value)
        });
    }

    run(origin, builderOption, input) {
        const option = BuilderOptions.get(builderOption);
        if (!option) {
            origin.sendMessage({ translate: 'construct.commands.option.unknownOption', with: [builderOption] });
            return void 0;
        }
        if (option.isLocked(origin.getSource().id)) {
            origin.sendMessage({ translate: 'construct.commands.option.locked', with: { rawtext: [{ text: builderOption }, option.lockReason] } });
            return void 0;
        }
        const value = option.parseValue(input);
        if (value === void 0) {
            origin.sendMessage({ translate: 'construct.commands.option.invalidValue', with: [input, builderOption, option.getValueNames().join(', ')] });
            return void 0;
        }
        system.run(() => {
            const player = origin.getSource();
            option.setValue(player.id, value);
            origin.sendMessage({ translate: 'construct.commands.option.success', with: { rawtext: [{ text: builderOption }, option.formatValue(value)] } });
        });
        return { status: CustomCommandStatus.Success };
    }
}

export const optionCommand = new OptionCommand();
