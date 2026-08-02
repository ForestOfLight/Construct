import { BuilderChoiceOption } from '../classes/Builder/BuilderChoiceOption';
import { RENDER_MODE_LABELS, RENDER_MODE_ORDER, RenderMode } from '../classes/Enums/RenderMode';

// Unlike the other builder options this one has no behavior of its own - it is
// only read at the moment an instance is created. Changing it deliberately
// leaves existing instances alone; each of those carries its own render mode,
// which the instance settings menu still owns.
const builderOption = new BuilderChoiceOption({
    identifier: 'defaultRenderMode',
    displayName: { translate: 'construct.option.defaultrendermode.name' },
    description: { translate: 'construct.option.defaultrendermode.description' },
    choices: RENDER_MODE_ORDER,
    choiceLabels: RENDER_MODE_ORDER.map(mode => ({ translate: RENDER_MODE_LABELS[mode] })),
    defaultValue: RenderMode.Default
});

// A player id is optional because an instance can also be created from a
// command block or the server console, where there is nobody to have a
// preference.
export function getDefaultRenderMode(playerId) {
    if (!playerId)
        return RenderMode.Default;
    return builderOption.getValue(playerId);
}
