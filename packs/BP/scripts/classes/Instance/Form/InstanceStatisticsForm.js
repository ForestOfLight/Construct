import { CustomForm } from "@minecraft/server-ui";
import { TicksPerSecond } from "@minecraft/server";
import { FormUtils } from "../../Menu/FormUtils";
import { MenuForm } from "../../Menu/MenuForm";
import { StructureVerifier } from "../../Verifier/StructureVerifier";
import { InstanceStatistics } from "../InstanceStatistics";
import { InstanceForm } from "./InstanceForm";

export class InstanceStatisticsForm {
    static #structureVerifier;

    constructor(player, instance) {
        this.player = player;
        this.instance = instance;
        this.show();
    }

    async show() {
        if (InstanceStatisticsForm.#structureVerifier) {
            this.player.sendMessage({ translate: 'construct.instance.validation.alreadyRunning' });
            return;
        }
        const statsMessage = await this.#getStatisticsMessage();
        if (!this.player.isValid)
            return;

        const form = new CustomForm(this.player, MenuForm.title);
        form.label(statsMessage);
        form.spacer();
        form.button('<<', () => {
            form.close();
            new InstanceForm(this.player, this.instance.getName());
        });
        FormUtils.tryShow(form);
    }

    async #getStatisticsMessage() {
        InstanceStatisticsForm.#structureVerifier = StructureVerifier.standalone(this.instance, { particleLifetime: 1*TicksPerSecond });
        try {
            const verification = await InstanceStatisticsForm.#structureVerifier.verifyStructure(true);
            return new InstanceStatistics(this.instance, verification).getMessage();
        } finally {
            InstanceStatisticsForm.#structureVerifier = void 0;
        }
    }
}
