import { Command } from '../classes/Commands/Command';
import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, system, TicksPerSecond } from '@minecraft/server';
import { InstanceFormBuilder } from '../classes/Instance/InstanceFormBuilder';
import { structureCollection } from '../classes/Structure/StructureCollection';
import { StructureVerifier } from '../classes/Verifier/StructureVerifier';
import { StructureStatistics } from '../classes/Structure/StructureStatistics';

export class StatsCommand extends Command {
    constructor() {
        super({
            name: 'stats',
            description: 'construct.commands.stats',
            mandatoryParameters: [
                { name: 'instanceName', type: CustomCommandParamType.String }
            ],
            permissionLevel: CommandPermissionLevel.Any,
            callback: (source, instanceName) => this.run(source, instanceName)
        });
    }

    run(source, instanceName) {
        const instance = structureCollection.get(instanceName);
        if (this.structureVerifier)
            return { status: CustomCommandStatus.Failure, error: 'construct.commands.stats.alreadyRunning' };
        system.run(async () => {
            source.sendMessage(await this.getStatsMessage(instance));
        });
        return { status: CustomCommandStatus.Success };
    }

    async getStatsMessage(instance) {
        const verifierOptions = { isEnabled: true, particleLifetime: 1*TicksPerSecond, isStandalone: true };
        this.structureVerifier = new StructureVerifier(instance, verifierOptions);
        const verification = await this.structureVerifier.verifyStructure(true);
        const statistics = new StructureStatistics(instance, verification);
        const statsMessage = statistics.getMessage();
        this.structureVerifier = void 0;
        return statsMessage;
    }
}

export const statsCommand = new StatsCommand();
