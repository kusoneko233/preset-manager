declare const require: any;

const {
  clampSecondPresetWidth,
  getSecondPresetBounds,
} = require('./panelLayout');

function expectEqual<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function expectTrue(value: boolean, message: string) {
  if (!value) {
    throw new Error(message);
  }
}

const desktop = getSecondPresetBounds(1000);
expectEqual(desktop.center, 489);
expectEqual(clampSecondPresetWidth(489, 1000), 489);
expectEqual(clampSecondPresetWidth(900, 1000), desktop.max);
expectTrue(desktop.max > 500, 'Expected desktop max width to be greater than 500');

const compact = getSecondPresetBounds(520);
expectEqual(compact.center, 249);
expectEqual(clampSecondPresetWidth(10, 520), compact.min);
expectEqual(clampSecondPresetWidth(Number.NaN, 520), compact.center);

console.info('panelLayout tests passed');