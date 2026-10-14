import { instanceCollection } from './InstanceCollection';
import { MenuForm } from '../Menu/MenuForm';
import { forceShow } from '../../utils';
import { InstanceButtons } from '../Enums/InstanceButtons';
import { InstanceFormBuilder } from './InstanceFormBuilder';
import { CustomForm, FormCancelationReason, MessageBox, ObservableBoolean, ObservableNumber, ObservableUIRawMessage } from '@minecraft/server-ui';
import { FlexibleInstanceMove } from './FlexibleInstanceMove';
import { Builders } from '../Builder/Builders';
import { RENDER_MODE_ORDER, RenderMode } from '../Enums/RenderMode';
import { MaterialsPage } from '../Enums/MaterialsPage';
import { MaterialsButtons } from '../Enums/MaterialsButtons';
import { FormUtils } from '../Menu/FormUtils';
import { world } from '@minecraft/server';

export class InstanceForm {
    instanceName;
    #buttons = {
        isEnabled: [
            InstanceButtons.NextLayer,
            InstanceButtons.PreviousLayer,
            InstanceButtons.Settings,
            InstanceButtons.Materials,
            InstanceButtons.Statistics,
            InstanceButtons.Move,
            InstanceButtons.FlexibleMove,
            InstanceButtons.Rename,
            InstanceButtons.Disable
        ],
        isNotEnabledAndIsNotPlaced: [
            InstanceButtons.Place,
            InstanceButtons.Rename
        ],
        isNotEnabledButIsPlaced: [
            InstanceButtons.Enable,
            InstanceButtons.Rename
        ],
        common: [
            InstanceButtons.Delete,
            InstanceButtons.MainMenu
        ]
    };

    constructor(player, instanceName) {
        this.player = player;
        this.instanceName = instanceName;
        this.instance = instanceCollection.get(this.instanceName);
        this.show();
    }

    show() {
        const label = new ObservableUIRawMessage(this.#getInstanceLabel());
        const layer = new ObservableNumber(this.instance.getLayer(), { clientWritable: true });
        const showManage = new ObservableBoolean(this.#isEnabledAndPlaced());
        const showPlace = new ObservableBoolean(!this.instance.hasLocation());
        const showToggle = new ObservableBoolean(Boolean(this.instance.hasLocation()));
        const refreshVisibility = () => {
            showManage.setData(this.#isEnabledAndPlaced());
            showPlace.setData(!this.instance.hasLocation());
            showToggle.setData(Boolean(this.instance.hasLocation()));
        };
        const enableButtonLabel = new ObservableUIRawMessage(this.#getEnableButtonLabel());

        layer.subscribe(newLayer => this.instance.setLayer(newLayer));

        const form = new CustomForm(this.player, MenuForm.title);
        form.label(label);
        form.spacer();
        if (this.instance.hasLayers()) {
            form.slider({ translate: 'construct.instance.option.layer' }, layer, 0, this.instance.getMaxLayer(), {
                description: { translate: 'construct.instance.option.layer.description' },
                visible: showManage
            });
            form.button({ translate: InstanceButtons.NextLayer }, () => {
                this.instance.increaseLayer();
                layer.setData(this.instance.getLayer());
            }, { visible: showManage });
            form.button({ translate: InstanceButtons.PreviousLayer }, () => {
                this.instance.decreaseLayer();
                layer.setData(this.instance.getLayer());
            }, { visible: showManage });
            form.divider();
        }
        form.button({ translate: InstanceButtons.Settings }, () => {
            form.close();
            this.settingsForm();
        }, { visible: showManage });
        form.button({ translate: InstanceButtons.Materials }, () => {
            form.close();
            this.materialsForm();
        }, { visible: showManage });
        form.button({ translate: InstanceButtons.Statistics }, () => {
            form.close();
            this.statisticsForm();
        }, { visible: showManage });
        form.button({ translate: InstanceButtons.Move }, () => {
            this.instance.move(this.player.dimension.id, this.player.location);
            label.setData(this.#getInstanceLabel());
        }, { visible: showManage });
        form.button({ translate: InstanceButtons.FlexibleMove }, () => {
            form.close();
            this.flexibleMovement();
        }, { visible: showManage });
        form.button({ translate: InstanceButtons.Rename }, () => {
            form.close();
            this.renameInstanceForm();
        });
        form.divider({ visible: showToggle })
        form.button(enableButtonLabel, () => {
            if (this.instance.isEnabled())
                this.instance.disable();
            else
                this.instance.enable();
            enableButtonLabel.setData(this.#getEnableButtonLabel());
            refreshVisibility();
        }, { visible: showToggle });
        form.button({ translate: InstanceButtons.Place }, () => {
            this.instance.place(this.player.dimension.id, this.player.location);
            label.setData(this.#getInstanceLabel());
            enableButtonLabel.setData(this.#getEnableButtonLabel());
            refreshVisibility();
        }, { visible: showPlace });
        form.button({ translate: InstanceButtons.Delete }, () => {
            form.close();
            this.deleteWithConfirmation();
        });
        form.button({ translate: InstanceButtons.MainMenu }, () => {
            form.close();
            new MenuForm(this.player, { jumpToInstance: false });
        });
        FormUtils.tryShow(form);
    }

    #isEnabledAndPlaced() {
        return Boolean(this.instance.isEnabled() && this.instance.hasLocation());
    }

    #getInstanceLabel() {
        const label = { rawtext: [
            { translate: 'construct.instance.menu.body', with: [this.instance.getName(), this.instance.getStructureId()] }
        ]};
        if (this.instance.hasLocation()) {
            const location = this.instance.getLocation();
            label.rawtext.push(...[
                { text: '\n' },
                { translate: 'construct.instance.menu.location', with: { rawtext: [
                    { text: String(location.location.x) },
                    { text: String(location.location.y) },
                    { text: String(location.location.z) },
                    { translate: world.getDimension(location.dimensionId).localizationKey }
                ]} }
            ]);
        }
        return label;
    }

    #getEnableButtonLabel() {
        if (this.instance.isEnabled())
            return { translate: InstanceButtons.Disable };
        return { translate: InstanceButtons.Enable };
    }

    getActiveOptions() {
        let currentOptions = [];
        if (this.instance.isEnabled())
            currentOptions = this.#buttons.isEnabled;
        else if (this.instance.hasLocation())
            currentOptions = this.#buttons.isNotEnabledButIsPlaced;
        else
            currentOptions = this.#buttons.isNotEnabledAndIsNotPlaced;
        currentOptions = currentOptions.concat(this.#buttons.common);

        return currentOptions;
    }

    handleOption(form, option) {
        form.close();
        switch (option) {
            // case InstanceButtons.Enable:
            //     this.instance.enable();
            //     break;
            // case InstanceButtons.Disable:
            //     this.instance.disable();
            //     break;
            // case InstanceButtons.Place:
            //     this.instance.place(this.player.dimension.id, this.player.location);
            //     break;
            // case InstanceButtons.Rename:
            //     this.renameInstanceForm();
            //     break;
            // case InstanceButtons.Delete:
            //     this.deleteWithConfirmation();
            //     break;
            // case InstanceButtons.NextLayer:
            //     this.instance.increaseLayer();
            //     new InstanceForm(this.player, this.instanceName);
            //     break;
            // case InstanceButtons.PreviousLayer:
            //     this.instance.decreaseLayer();
            //     new InstanceForm(this.player, this.instanceName);
            //     break;
            // case InstanceButtons.Move:
            //     this.instance.move(this.player.dimension.id, this.player.location);
            //     break;
            // case InstanceButtons.FlexibleMove:
            //     this.flexibleMovement();
            //     break;
            // case InstanceButtons.Settings:
            //     this.settingsForm();
            //     break;
            // case InstanceButtons.Statistics:
            //     this.statisticsForm();
            //     break;
            // case InstanceButtons.Materials:
            //     this.materialsForm();
            //     break;
            // case InstanceButtons.MainMenu:
            //     new MenuForm(this.player, { jumpToInstance: false });
            //     break;
            default:
                this.player.sendMessage({ translate: 'construct.menu.instance.unknownOption', with: [option] });
                break;
        }
    }

    renameInstanceForm() {
        InstanceFormBuilder.buildRenameInstance(this.instanceName).show(this.player).then((response) => {
            if (response.canceled)
                return;
            const newName = response.formValues[0];
            if (newName === '') {
                this.player.sendMessage({ translate: 'construct.menu.instance.nameEmpty' });
                return;
            }
            try {
                instanceCollection.rename(this.instanceName, newName);
                this.instanceName = newName;
            } catch (e) {
                this.player.sendMessage({ translate: 'construct.instance.rename.error', with: [e.message] });
            }
        });
    }

    async deleteWithConfirmation() {
        const confirmationBox = new MessageBox(this.player, { translate: 'construct.instance.delete.title' });
        confirmationBox.body({ translate: 'construct.instance.delete.body', with: [this.instanceName] });
        confirmationBox.button1({ translate: 'construct.instance.delete.confirm' });
        confirmationBox.button2({ translate: 'construct.instance.delete.cancel' });
        const result = await FormUtils.tryShow(confirmationBox);
        if (result === 1)
            instanceCollection.delete(this.instanceName);
        else
            this.show();
    }

    flexibleMovement() {
        const builder = Builders.get(this.player.id);
        builder.flexibleInstanceMovement = new FlexibleInstanceMove(this.instance, this.player);
    }

    setLayerForm() {
        InstanceFormBuilder.buildSetLayer(this.instance.getBounds().max.y, this.instance.getLayer()).show(this.player).then((response) => {
            if (response.canceled)
                return;
            this.instance.setLayer(parseInt(response.formValues[0]));
        });
    }

    async statisticsForm() {
        let statsForm;
        try {
            statsForm = await InstanceFormBuilder.buildStatistics(this.instance);
        } catch (e) {
            if (e.message === 'StructureVerifier is already running.') {
                this.player.sendMessage({ translate: 'construct.instance.validation.alreadyRunning' });
                return;
            }
            throw e;
        }
        if (!statsForm) {
            this.player.sendMessage({ translation: 'construct.instance.validation.formfail' });
            return;
        }
        statsForm.form.show(this.player).then((response) => {
            if (response.canceled && response.cancelationReason === FormCancelationReason.UserBusy)
                this.player.sendMessage(statsForm.stats);
        });
    }

    settingsForm() {
        InstanceFormBuilder.buildSettings(this.instance).show(this.player).then((response) => {
            if (response.canceled)
                return;
            this.instance.setVerifierEnabled(response.formValues[0]);
            this.instance.setLayer(parseInt(response.formValues[1]));
            this.instance.setRenderMode(RENDER_MODE_ORDER[response.formValues[2]] ?? RenderMode.Default);
            this.instance.setVerifierRefreshSeconds(parseInt(response.formValues[3]));
        });
    }

    async materialsForm(page = MaterialsPage.Missing) {
        const worldMaterials = await this.#countWorldMaterials(page);
        if (!instanceCollection.has(this.instanceName) || !this.player.isValid)
            return;
        const { form, buttons } = InstanceFormBuilder.buildMaterialList(this.instance, page, worldMaterials);
        const response = await forceShow(this.player, form);
        if (response.canceled)
            return;
        switch (buttons[response.selection]) {
            case MaterialsButtons.ShowAll:
                this.materialsForm(MaterialsPage.All);
                break;
            case MaterialsButtons.ShowMissing:
                this.materialsForm(MaterialsPage.Missing);
                break;
            case MaterialsButtons.SubtractInventory:
                this.materialsForm(page);
                break;
        }
    }

    #countWorldMaterials(page) {
        if (page !== MaterialsPage.Missing || !this.instance.canShowWorldMaterials())
            return Promise.resolve(void 0);
        return this.instance.getWorldMaterials();
    }
}