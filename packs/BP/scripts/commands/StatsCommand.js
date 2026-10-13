import { Command } from '../classes/Commands/Command';
import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system, TicksPerSecond } from '@minecraft/server';
import { InstanceFormBuilder } from '../classes/Instance/InstanceFormBuilder';
import { resolveCommandInstance } from '../options/cliDefaultInstance';
import { StructureVerifier } from '../classes/Verifier/StructureVerifier';
import { InstanceStatistics } from '../classes/Instance/InstanceStatistics';

export class StatsCommand extends Command {
    constructor() {
        super({
            name: 'stats',
            description: 'construct.commands.stats',
            optionalParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (origin, instanceName) => this.run(origin, instanceName)
        });
    }

    run(origin, instanceName) {
        const instance = resolveCommandInstance(origin, instanceName);
        if (this.structureVerifier)
            return { status: CustomCommandStatus.Failure, error: 'construct.commands.stats.alreadyRunning' };
        system.run(async () => {
            origin.sendMessage(await this.getStatsMessage(instance));
        });
        return { status: CustomCommandStatus.Success };
    }

    async getStatsMessage(instance) {
        this.structureVerifier = StructureVerifier.standalone(instance, { particleLifetime: 1*TicksPerSecond });
        const verification = await this.structureVerifier.verifyStructure(true);
        const statistics = new InstanceStatistics(instance, verification);
        const statsMessage = statistics.getMessage();
        this.structureVerifier = void 0;
        return statsMessage;
    }
}

export const statsCommand = new StatsCommand();
