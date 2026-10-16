import { instanceCollection } from '../InstanceCollection';
import { MenuForm } from '../../Menu/MenuForm';
import { InstanceButtons } from '../../Enums/InstanceButtons';
import { CustomForm, MessageBox, ObservableBoolean, ObservableNumber, ObservableUIRawMessage } from '@minecraft/server-ui';
import { FlexibleInstanceMove } from '../FlexibleInstanceMove';
import { Builders } from '../../Builder/Builders';
import { FormUtils } from '../../Menu/FormUtils';
import { world } from '@minecraft/server';
import { InstanceSettingsForm } from './InstanceSettingsForm';
import { InstanceStatisticsForm } from './InstanceStatisticsForm';
import { InstanceMaterialsForm } from './InstanceMaterialsForm';

export class InstanceForm {
    constructor(player, instanceName) {
        this.player = player;
        this.instanceName = instanceName;
        this.instance = instanceCollection.get(this.instanceName);
        this.show();
    }

    show() {
        const label = new ObservableUIRawMessage(this.#getInstanceLabel());
        const showManage = new ObservableBoolean(this.#isEnabledAndPlaced());
        const showPlace = new ObservableBoolean(!this.instance.hasLocation());
        const showToggle = new ObservableBoolean(Boolean(this.instance.hasLocation()));
        const refreshVisibility = () => {
            showManage.setData(this.#isEnabledAndPlaced());
            showPlace.setData(!this.instance.hasLocation());
            showToggle.setData(Boolean(this.instance.hasLocation()));
        };
        const enableButtonLabel = new ObservableUIRawMessage(this.#getEnableButtonLabel());


        let form = new CustomForm(this.player, MenuForm.title);
        form.label(label);
        form.spacer();
        if (this.instance.hasLayers())
            this.#addLayerControls(form, showManage);
        form.button({ translate: InstanceButtons.Settings }, () => {
            form.close();
            new InstanceSettingsForm(this.player, this.instance);
        }, { visible: showManage });
        form.button({ translate: InstanceButtons.Materials }, () => {
            form.close();
            new InstanceMaterialsForm(this.player, this.instance);
        }, { visible: showManage });
        form.button({ translate: InstanceButtons.Statistics }, () => {
            form.close();
            new InstanceStatisticsForm(this.player, this.instance);
        }, { visible: showManage });
        form.button({ translate: InstanceButtons.Move }, () => {
            this.instance.move(this.player.dimension.id, this.player.location);
            label.setData(this.#getInstanceLabel());
        }, { visible: showManage });
        form.button({ translate: InstanceButtons.FlexibleMove }, () => {
            form.close();
            this.startFlexibleMovement();
        }, { visible: showManage });
        form.divider({ visible: showManage });
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
            this.#deleteWithConfirmation();
        }, { imageDetails: FormUtils.getImage('textures/ui/caution.png') });
        form.button({ translate: InstanceButtons.MainMenu }, () => {
            form.close();
            new MenuForm(this.player, { jumpToInstance: false });
        });
        FormUtils.tryShow(form);
    }

    #addLayerControls(form, showManage) {
        const layer = new ObservableNumber(this.instance.getLayer(), { clientWritable: true });
        layer.subscribe(newLayer => this.instance.setLayer(newLayer));
        form.slider({ translate: 'construct.instance.option.layer' }, layer, 0, this.instance.getMaxLayer(), {
            description: { translate: 'construct.instance.option.layer.description' },
            visible: showManage
        });
        form.spacer();
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

    async #deleteWithConfirmation() {
        const confirmationBox = new MessageBox(this.player, { translate: 'construct.instance.delete.title' });
        confirmationBox.body({ translate: 'construct.instance.delete.body', with: [this.instanceName] });
        confirmationBox.button1({ translate: 'construct.instance.delete.confirm' });
        confirmationBox.button2({ translate: 'construct.instance.delete.cancel' });
        const result = await FormUtils.tryShow(confirmationBox);
        if (result?.selection === 1)
            instanceCollection.delete(this.instanceName);
        else
            this.show();
    }

    startFlexibleMovement() {
        const builder = Builders.get(this.player.id);
        builder.flexibleInstanceMovement = new FlexibleInstanceMove(this.instance, this.player);
    }
}