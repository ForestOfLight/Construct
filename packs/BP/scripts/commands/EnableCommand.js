import { Command } from '../classes/Commands/Command';
import { CustomCommandParamType, CustomCommandStatus, CommandPermissionLevel, system } from '@minecraft/server';
import { resolveCommandInstance } from '../options/cliDefaultInstance';

export class EnableCommand extends Command {
    constructor() {
        super({
            name: 'enable',
            description: 'construct.commands.enable',
            optionalParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (origin, instanceName) => this.run(origin, instanceName)
        });
    }

    run(origin, instanceName) {
        const instance = resolveCommandInstance(origin, instanceName);
        if (!instance.hasLocation()) {
            origin.sendMessage({ translate: 'construct.commands.error.noLocation', with: [instance.getName()] });
            return void 0;
        }
        system.run(() => {
            instance.enable();
            origin.sendMessage({ translate: 'construct.commands.enable.success', with: [instance.getName()] });
        });
        return { status: CustomCommandStatus.Success };
    }
}

export const enableCommand = new EnableCommand();
