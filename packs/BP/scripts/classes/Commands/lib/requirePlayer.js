import { PlayerCommandOrigin } from '../PlayerCommandOrigin';
import { NotAPlayerError } from '../../Errors/NotAPlayerError';

export function requirePlayer(source) {
    if (!(source instanceof PlayerCommandOrigin))
        throw new NotAPlayerError();
    return source.getSource();
}
