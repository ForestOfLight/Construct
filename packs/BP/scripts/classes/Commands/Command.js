import { CustomCommandSource, CustomCommandStatus, Player, system } from "@minecraft/server";
import { Commands } from "./Commands.js";
import { BlockCommandOrigin } from "./BlockCommandOrigin";
import { EntityCommandOrigin } from "./EntityCommandOrigin";
import { ServerCommandOrigin } from "./ServerCommandOrigin";
import { PlayerCommandOrigin } from "./PlayerCommandOrigin";
import { PACK_IDENTIFIER } from "../../consts.js";

export class Command {
    customCommand;

    static resolveCommandOrigin(origin) {
        switch (origin.sourceType) {
            case CustomCommandSource.Block:
                return new BlockCommandOrigin(origin);
            case CustomCommandSource.Entity:
                if (origin.sourceEntity instanceof Player)
                    return new PlayerCommandOrigin(origin);
                return new EntityCommandOrigin(origin);
            case CustomCommandSource.Server:
                return new ServerCommandOrigin(origin);
            default:
                throw new Error("Unknown command source: " + origin?.sourceType);
        }
    }

    constructor(customCommand) {
        this.customCommand = customCommand;
        this.#setDefaultArgs();
        Commands.register(this);
        system.beforeEvents.startup.subscribe(this.setupForRegistry.bind(this));
    }

    getName() {
        return this.customCommand.name.replace(/^[^:]+:/, '');
    }

    isCheatsRequired() {
        return this.customCommand.cheatsRequired;
    }

    setupForRegistry(startupEvent) {
        this.#registerCommand(startupEvent.customCommandRegistry);
        system.beforeEvents.startup.unsubscribe(this.setupForRegistry.bind(this));
    }

    #registerCommand(customCommandRegistry) {
        this.#addPreCallback();
        this.#registerEnums(customCommandRegistry);
        this.#registerSingleCommand(customCommandRegistry);
        this.#registerAliasCommands(customCommandRegistry);
    }

    #setDefaultArgs() {
        if (this.customCommand.cheatsRequired === void 0)
            this.customCommand.cheatsRequired = false;
    }

    #addPreCallback() {
        this.callback = (origin, ...args) => {
            const source = Command.resolveCommandOrigin(origin);
            if (this.#commandSourceIsNotAllowed(source))
                return { status: CustomCommandStatus.Failure, message: 'commands.generic.invalidsource' };
            return this.customCommand.callback(source, ...args);
        }
    }

    #registerEnums(customCommandRegistry) {
        if (this.customCommand.enums) {
            for (const customEnum of this.customCommand.enums)
                customCommandRegistry.registerEnum(`${PACK_IDENTIFIER}:${customEnum.name}`, customEnum.values);
        }
    }

    #registerSingleCommand(customCommandRegistry, name = this.customCommand.name) {
        customCommandRegistry.registerCommand({
            name: `${PACK_IDENTIFIER}:${name}`,
            description: this.customCommand.description,
            permissionLevel: this.customCommand.permissionLevel,
            mandatoryParameters: this.#prepParameters(this.customCommand.mandatoryParameters),
            optionalParameters: this.#prepParameters(this.customCommand.optionalParameters),
            cheatsRequired: this.customCommand.cheatsRequired
        }, this.callback);
    }

    #prepParameters(parameters) {
        if (!parameters)
            return [];
        for (const parameter of parameters) {
            if (parameter.name)
                parameter.name = `${PACK_IDENTIFIER}:${parameter.name}`;
        }
        return parameters;
    }

    #registerAliasCommands(customCommandRegistry) {
        if (this.customCommand.aliases) {
            for (const alias of this.customCommand.aliases)
                this.#registerSingleCommand(customCommandRegistry, alias);
        }
    }

    #commandSourceIsNotAllowed(source) {
        if (!this.customCommand.allowedSources)
            return false;
        return !this.customCommand.allowedSources.includes(source.constructor);
    }
}