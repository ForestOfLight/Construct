import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { PlayerCommandOrigin } from '../classes/Commands/PlayerCommandOrigin';
import { AdminOptions } from '../classes/Admin/AdminOptions';
import { AdminForm } from '../classes/Admin/AdminForm';

export class AdminCommand extends Command {
    constructor() {
        super({
            name: 'admin',
            description: 'construct.commands.admin',
            optionalParameters: [
                { name: 'adminOption', type: CustomCommandParamType.Enum },
                { name: 'value', type: CustomCommandParamType.String }
            ],
            enums: [
                { name: 'adminOption', get values() { return AdminOptions.getOptionIds(); } }
            ],
            permissionLevel: CommandPermissionLevel.Admin,
            callback: (origin, adminOption, value) => this.run(origin, adminOption, value)
        });
    }

    run(origin, adminOption, valueString) {
        if (adminOption === void 0)
            return this.openForm(origin);
        const option = AdminOptions.get(adminOption);
        if (!option) {
            origin.sendMessage({ translate: 'construct.commands.admin.unknownOption', with: [adminOption] });
            return void 0;
        }
        const value = option.parseValue(valueString);
        if (value === void 0) {
            origin.sendMessage({ translate: 'construct.commands.admin.invalidValue', with: [String(valueString ?? ''), adminOption, option.getValueNames().join(', ')] });
            return void 0;
        }
        system.run(() => {
            AdminOptions.setValue(adminOption, value);
            origin.sendMessage({ translate: 'construct.commands.admin.success', with: { rawtext: [{ text: adminOption }, option.formatValue(value)] } });
        });
        return { status: CustomCommandStatus.Success };
    }

    openForm(origin) {
        if (!(origin instanceof PlayerCommandOrigin)) {
            origin.sendMessage({ translate: 'construct.error.notAPlayer' });
            return void 0;
        }
        const player = origin.getSource();
        system.run(() => new AdminForm(player));
        return { status: CustomCommandStatus.Success };
    }
}

export const adminCommand = new AdminCommand();
