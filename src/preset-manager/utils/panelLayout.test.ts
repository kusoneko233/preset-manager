declare const require: any;

const {
  clampFloatingPanelRect,
  clampSecondPresetWidth,
  clampWindowStateWithVisibleArea,
  clampWindowState,
  getSecondPresetBounds,
} = require('./panelLayout');

function expectEqual<T>(actual: T, expected: T) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
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

const collapsedWidth = require('./panelLayout').getCollapsedSecondPresetWidth(320, 1260);
expectTrue(collapsedWidth > 320, 'Expected collapsed left sidebar to expand the right sidebar');
expectTrue(collapsedWidth < getSecondPresetBounds(1260).max, 'Expected collapsed width to leave room for the main panel');
expectEqual(clampSecondPresetWidth(collapsedWidth, 1260), collapsedWidth);

const compact = getSecondPresetBounds(520);
expectEqual(compact.center, 249);
expectEqual(clampSecondPresetWidth(10, 520), compact.min);
expectEqual(clampSecondPresetWidth(Number.NaN, 520), compact.center);

expectEqual(clampWindowState({ top: 2000, left: 3000, width: 1375, height: 875 }, 1600, 900, 640, 420), {
  top: 25,
  left: 225,
  width: 1375,
  height: 875,
});
expectEqual(clampWindowState({ top: -240, left: -800, width: 400, height: 200 }, 1200, 800, 640, 420), {
  top: 0,
  left: 0,
  width: 640,
  height: 420,
});
expectEqual(clampWindowState({ top: 30, left: 40, width: 1800, height: 1200 }, 1200, 800, 640, 420), {
  top: 0,
  left: 0,
  width: 1200,
  height: 800,
});
expectEqual(clampWindowStateWithVisibleArea({ top: -900, left: -1300, width: 1100, height: 700 }, 1375, 875, 640, 420, 0.1), {
  top: -630,
  left: -990,
  width: 1100,
  height: 700,
});
expectEqual(clampWindowStateWithVisibleArea({ top: 840, left: 1320, width: 1100, height: 700 }, 1375, 875, 640, 420, 0.1), {
  top: 805,
  left: 1265,
  width: 1100,
  height: 700,
});
expectEqual(clampWindowStateWithVisibleArea({ top: 30, left: 40, width: 1800, height: 1200 }, 1375, 875, 640, 420, 0.1), {
  top: 30,
  left: 40,
  width: 1375,
  height: 875,
});

expectEqual(clampFloatingPanelRect({ top: -120, left: -240, width: 360, height: 620 }, 450, 775, 320, 360, 12), {
  top: 12,
  left: 12,
  width: 360,
  height: 620,
});
expectEqual(clampFloatingPanelRect({ top: 900, left: 900, width: 360, height: 620 }, 450, 775, 320, 360, 12), {
  top: 143,
  left: 78,
  width: 360,
  height: 620,
});
expectEqual(clampFloatingPanelRect({ top: 20, left: 20, width: 360, height: 620 }, 300, 340, 320, 360, 12), {
  top: 12,
  left: 12,
  width: 276,
  height: 316,
});
expectEqual(clampFloatingPanelRect({ top: 88, left: 520, width: 360, height: 620 }, 0, 0, 320, 360, 12), {
  top: 0,
  left: 0,
  width: 1,
  height: 1,
});

console.info('panelLayout tests passed');
