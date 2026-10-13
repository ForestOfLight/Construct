import { BuilderChoiceOption } from '../classes/Builder/BuilderChoiceOption';
import { instanceCollection } from '../classes/Instance/InstanceCollection';
import { PlayerCommandOrigin } from '../classes/Commands/PlayerCommandOrigin';
import { InstanceNameRequiredError } from '../classes/Errors/InstanceNameRequiredError';
import { NotInInstanceError } from '../classes/Errors/NotInInstanceError';

const USE_STANDING_LOCATION = '';
const USE_STANDING_LOCATION_NAME = 'construct:standing_location';

function getInstanceChoices() {
    return instanceCollection.getInstanceNamesSortedByEnabled().filter(name => name !== USE_STANDING_LOCATION);
}

const builderOption = new BuilderChoiceOption({
    identifier: 'cliDefaultInstance',
    displayName: { translate: 'construct.option.clidefaultinstance.name' },
    description: { translate: 'construct.option.clidefaultinstance.description' },
    choices: () => [USE_STANDING_LOCATION, ...getInstanceChoices()],
    choiceLabels: () => [
        { translate: 'construct.option.clidefaultinstance.standingLocation' },
        ...instanceCollection.colorInstanceNamesByEnabled(getInstanceChoices()).map(instanceName => ({ text: instanceName }))
    ],
    choiceNames: () => [USE_STANDING_LOCATION_NAME, ...getInstanceChoices()],
    defaultValue: USE_STANDING_LOCATION
});

export function resolveCommandInstance(origin, instanceName) {
    if (instanceName !== void 0)
        return instanceCollection.get(instanceName);
    if (!(origin instanceof PlayerCommandOrigin))
        throw new InstanceNameRequiredError();
    const player = origin.getSource();
    const defaultInstanceName = builderOption.getValue(player.id);
    if (defaultInstanceName !== USE_STANDING_LOCATION)
        return instanceCollection.get(defaultInstanceName);
    const instance = instanceCollection.getInstanceAt(player.dimension.id, player.location, { useActiveLayer: false });
    if (!instance)
        throw new NotInInstanceError();
    return instance;
}
