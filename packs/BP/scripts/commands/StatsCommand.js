import { CustomCommandParamType, CustomCommandStatus, system } from '@minecraft/server';
import { Command } from '../classes/Commands/Command';
import { findInstance } from '../classes/Commands/lib/findInstance';
import { commandError } from '../classes/Commands/lib/commandError';
import { InstanceFormBuilder } from '../classes/Instance/InstanceFormBuilder';

export class StatsCommand extends Command {
    constructor() {
        super({
            name: 'stats',
            description: 'construct.commands.stats',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String }
            ],
            callback: (source, instanceName) => this.run(source, instanceName)
        });
    }

    run(source, instanceName) {
        try {
            const instance = findInstance(source, instanceName);
            if (!instance) return { status: CustomCommandStatus.Failure };
            system.run(async () => {
                try {
                    const { stats } = await InstanceFormBuilder.buildStatistics(instance);
                    source.sendMessage(stats);
                } catch (err) {
                    source.sendMessage({ translate: 'construct.commands.stats.alreadyRunning' });
                }
            });
            return { status: CustomCommandStatus.Success };
        } catch (err) {
            return commandError(source, err);
        }
    }
}

export const statsCommand = new StatsCommand();
