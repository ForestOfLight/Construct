import { AdminOption } from '../../classes/Admin/AdminOption';

export const disableEasyPlace = new AdminOption({
    identifier: 'disableEasyPlace',
    order: 1,
    displayName: { translate: 'construct.adminoption.disableeasyplace.name' },
    description: { translate: 'construct.adminoption.disableeasyplace.description' }
});
