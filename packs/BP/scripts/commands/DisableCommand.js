import { Command } from '../classes/Commands/Command';
import { CustomCommandParamType, CustomCommandStatus, CommandPermissionLevel, system } from '@minecraft/server';
import { resolveCommandInstance } from '../options/cliDefaultInstance';

export class DisableCommand extends Command {
    constructor() {
        super({
            name: 'disable',
            description: 'construct.commands.disable',
            optionalParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (origin, instanceName) => this.run(origin, instanceName)
        });
    }

    run(origin, instanceName) {
        const instance = resolveCommandInstance(origin, instanceName);
        system.run(() => {
            instance.disable();
            origin.sendMessage({ translate: 'construct.commands.disable.success', with: [instance.getName()] });
        });
        return { status: CustomCommandStatus.Success };
    }
}

export const disableCommand = new DisableCommand();
