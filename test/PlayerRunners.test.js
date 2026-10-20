import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PlayerRunners } from '../packs/BP/scripts/classes/Builder/PlayerRunners.js';

function fakeScheduler() {
    const active = new Set();
    let nextId = 1;
    return {
        active,
        runInterval() {
            const id = nextId++;
            active.add(id);
            return id;
        },
        clearRun(id) {
            active.delete(id);
        }
    };
}

test('stop clears the running interval', () => {
    const scheduler = fakeScheduler();
    const runners = new PlayerRunners(scheduler);
    runners.start('player', () => {});
    runners.stop('player');
    assert.equal(scheduler.active.size, 0);
});

test('starting twice does not orphan the first interval', () => {
    const scheduler = fakeScheduler();
    const runners = new PlayerRunners(scheduler);
    runners.start('player', () => {});
    runners.start('player', () => {});
    runners.stop('player');
    assert.equal(scheduler.active.size, 0);
});

test('runners are tracked per player', () => {
    const scheduler = fakeScheduler();
    const runners = new PlayerRunners(scheduler);
    runners.start('a', () => {});
    runners.start('b', () => {});
    runners.stop('a');
    assert.equal(scheduler.active.size, 1);
});

test('stopping a player with no runner is a no-op', () => {
    const scheduler = fakeScheduler();
    const runners = new PlayerRunners(scheduler);
    runners.stop('player');
    runners.start('player', () => {});
    runners.stop('player');
    runners.stop('player');
    assert.equal(scheduler.active.size, 0);
});
