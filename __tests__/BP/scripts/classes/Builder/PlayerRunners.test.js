import { describe, it, expect } from 'vitest';
import { system } from '@minecraft/server';
import { scheduler } from '@forestoflight/minecraft-vitest-mocks';
import { PlayerRunners } from '../../../../../packs/BP/scripts/classes/Builder/PlayerRunners.js';

describe('PlayerRunners', () => {
    it('stop clears the running interval', () => {
        const runners = new PlayerRunners(system);
        runners.start('player', () => {});
        runners.stop('player');
        expect(scheduler.scheduled.size).toBe(0);
    });

    it('starting twice does not orphan the first interval', () => {
        const runners = new PlayerRunners(system);
        runners.start('player', () => {});
        runners.start('player', () => {});
        runners.stop('player');
        expect(scheduler.scheduled.size).toBe(0);
    });

    it('runners are tracked per player', () => {
        const runners = new PlayerRunners(system);
        runners.start('a', () => {});
        runners.start('b', () => {});
        runners.stop('a');
        expect(scheduler.scheduled.size).toBe(1);
    });

    it('stopping a player with no runner is a no-op', () => {
        const runners = new PlayerRunners(system);
        runners.stop('player');
        runners.start('player', () => {});
        runners.stop('player');
        runners.stop('player');
        expect(scheduler.scheduled.size).toBe(0);
    });
});
