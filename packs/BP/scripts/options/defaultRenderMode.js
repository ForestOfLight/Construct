import { BuilderChoiceOption } from '../classes/Builder/BuilderChoiceOption';
import { RENDER_MODE_LABELS, RENDER_MODE_ORDER, RenderMode } from '../classes/Enums/RenderMode';

const builderOption = new BuilderChoiceOption({
    identifier: 'defaultRenderMode',
    displayName: { translate: 'construct.option.defaultrendermode.name' },
    description: { translate: 'construct.option.defaultrendermode.description' },
    choices: RENDER_MODE_ORDER,
    choiceLabels: RENDER_MODE_ORDER.map(mode => ({ translate: RENDER_MODE_LABELS[mode] })),
    defaultValue: RenderMode.Default
});

export function getDefaultRenderMode(playerId) {
    if (!playerId)
        return RenderMode.Default;
    return builderOption.getValue(playerId);
}
