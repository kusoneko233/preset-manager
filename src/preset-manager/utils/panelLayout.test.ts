import assert from 'node:assert/strict';
import { clampSecondPresetWidth, getSecondPresetBounds } from './panelLayout';

const desktop = getSecondPresetBounds(1000);
assert.equal(desktop.center, 489);
assert.equal(clampSecondPresetWidth(489, 1000), 489);
assert.equal(clampSecondPresetWidth(900, 1000), desktop.max);
assert.ok(desktop.max > 500);

const compact = getSecondPresetBounds(520);
assert.equal(compact.center, 249);
assert.equal(clampSecondPresetWidth(10, 520), compact.min);
assert.equal(clampSecondPresetWidth(Number.NaN, 520), compact.center);

console.info('panelLayout tests passed');
