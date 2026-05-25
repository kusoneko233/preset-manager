declare const require: any;

const {
  createAltShiftToggleState,
  resetAltShiftToggleState,
  shouldToggleInspectorOnAltShift,
} = require('./codeInspectorToggle');

function expectEqual<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const state = createAltShiftToggleState();

expectEqual(shouldToggleInspectorOnAltShift({ altKey: false, shiftKey: true }, state), false);
expectEqual(state.armed, false);
expectEqual(shouldToggleInspectorOnAltShift({ altKey: true, shiftKey: true, key: 'A' }, state), true);
expectEqual(state.armed, true);
resetAltShiftToggleState({ altKey: false, shiftKey: true }, state);
expectEqual(shouldToggleInspectorOnAltShift({ altKey: true, shiftKey: true, key: 'Shift' }, state), true);
expectEqual(state.armed, true);
expectEqual(shouldToggleInspectorOnAltShift({ altKey: true, shiftKey: true, repeat: true }, state), false);
expectEqual(state.armed, true);
resetAltShiftToggleState({ altKey: true, shiftKey: false }, state);
expectEqual(state.armed, false);
expectEqual(shouldToggleInspectorOnAltShift({ altKey: true, shiftKey: true, key: 'Alt' }, state), true);
resetAltShiftToggleState({ altKey: false, shiftKey: true }, state);
expectEqual(state.armed, false);
expectEqual(shouldToggleInspectorOnAltShift({ altKey: true, shiftKey: true }, state), true);
expectEqual(state.armed, true);
expectEqual(shouldToggleInspectorOnAltShift({ altKey: true, shiftKey: true }, state), false);
resetAltShiftToggleState({ altKey: false, shiftKey: true }, state);
expectEqual(shouldToggleInspectorOnAltShift({ altKey: true, shiftKey: true, key: 'AltGraph', code: 'AltLeft' }, state), true);
resetAltShiftToggleState({ altKey: true, shiftKey: false }, state);
expectEqual(shouldToggleInspectorOnAltShift({ altKey: true, shiftKey: true, key: 'Process', code: 'ShiftLeft' }, state), true);

console.info('codeInspectorToggle tests passed');
