import { AdminOption } from '../../classes/Admin/AdminOption';

export const disableFastEasyPlace = new AdminOption({
    identifier: 'disableFastEasyPlace',
    order: 2,
    displayName: { translate: 'construct.adminoption.disablefasteasyplace.name' },
    description: { translate: 'construct.adminoption.disablefasteasyplace.description' }
});
