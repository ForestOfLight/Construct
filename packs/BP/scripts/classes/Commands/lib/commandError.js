import { CustomCommandStatus } from '@minecraft/server';
import { NotAPlayerError } from '../../Errors/NotAPlayerError';

export function commandError(source, err) {
    if (err instanceof NotAPlayerError) {
        return { status: CustomCommandStatus.Failure, message: 'construct.commands.error.notAPlayer' };
    }
    throw err;
}
