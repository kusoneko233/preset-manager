declare const require: any;

const {
  buildPresetMigrationDiff,
  applyPresetMigrationSelection,
  buildPromptContentDiffLines,
} = require('./presetCompare');

function expectEqual<T>(actual: T, expected: T) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const mainPrompts = [
  { id: 'keep', identifier: 'keep', name: '保留', content: '旧内容', enabled: true },
  { id: 'locked', identifier: 'locked', name: '锁定', content: '我的自改', enabled: true },
  { id: 'remove', identifier: 'remove', name: '旧版废弃', content: '旧条目', enabled: true },
  { id: 'move', identifier: 'move', name: '顺序变化', content: '顺序不改内容', enabled: true },
  { id: 'status', identifier: 'status', name: '状态变化', content: '状态内容', enabled: true },
];

const secondPrompts = [
  { id: 'move', identifier: 'move', name: '顺序变化', content: '顺序不改内容', enabled: true },
  { id: 'keep', identifier: 'keep', name: '保留', content: '新版内容', enabled: true },
  { id: 'locked', identifier: 'locked', name: '锁定', content: '新版覆盖', enabled: false },
  { id: 'status', identifier: 'status', name: '状态变化', content: '状态内容', enabled: false },
  { id: 'add', identifier: 'add', name: '新增', content: '新增内容', enabled: true },
];

const diff = buildPresetMigrationDiff({
  mainPrompts,
  secondPrompts,
  isLocked: (key: string) => key === 'locked',
});

expectEqual(diff.summary, {
  added: 1,
  removed: 1,
  contentChanged: 1,
  enabledChanged: 1,
  orderChanged: 1,
  duplicate: 0,
  conflict: 1,
  locked: 1,
  selectable: 5,
});

expectEqual(diff.items.map((item: any) => [item.key, item.kind, item.locked, item.selectable]), [
  ['move', 'order-changed', false, true],
  ['keep', 'content-changed', false, true],
  ['locked', 'conflict', true, false],
  ['status', 'enabled-changed', false, true],
  ['add', 'added', false, true],
  ['remove', 'removed', false, true],
]);

expectEqual(diff.items.find((item: any) => item.key === 'add')?.mainAnchorIndex, 5);

const keepDelta = diff.items.find((item: any) => item.key === 'keep')?.textDelta;
expectEqual(Boolean(keepDelta), true);
expectEqual(keepDelta.oldLength, 3);
expectEqual(keepDelta.newLength, 4);
if (!keepDelta.preview.includes('3 → 4')) {
  throw new Error(`Expected text delta preview to include length change, got ${keepDelta.preview}`);
}

const duplicateMainPrompts = [
  { id: 'dup-a', identifier: 'dup', name: '重复 A', content: 'a', enabled: true },
  { id: 'dup-b', identifier: 'dup', name: '重复 B', content: 'b', enabled: true },
  { id: 'safe', identifier: 'safe', name: '安全', content: 'old', enabled: true },
];
const duplicateSecondPrompts = [
  { id: 'dup-c', identifier: 'dup', name: '重复 C', content: 'c', enabled: true },
  { id: 'safe', identifier: 'safe', name: '安全', content: 'new', enabled: false },
];
const duplicateDiff = buildPresetMigrationDiff({
  mainPrompts: duplicateMainPrompts,
  secondPrompts: duplicateSecondPrompts,
});

expectEqual(duplicateDiff.summary.duplicate, 1);
expectEqual(duplicateDiff.summary.conflict, 1);
expectEqual(duplicateDiff.items.map((item: any) => [item.key, item.kind, item.selectable]), [
  ['dup', 'duplicate', false],
  ['safe', 'conflict', true],
]);

const migrated = applyPresetMigrationSelection({
  mainPrompts,
  secondPrompts,
  selectedKeys: ['keep', 'status', 'add', 'remove', 'locked'],
  lockedKeys: ['locked'],
});

expectEqual(migrated.map((prompt: any) => [prompt.identifier, prompt.content, prompt.enabled]), [
  ['keep', '新版内容', true],
  ['locked', '我的自改', true],
  ['move', '顺序不改内容', true],
  ['status', '状态内容', false],
  ['add', '新增内容', true],
]);

const ambiguousMigration = applyPresetMigrationSelection({
  mainPrompts: duplicateMainPrompts,
  secondPrompts: duplicateSecondPrompts,
  selectedKeys: ['dup', 'safe'],
});

expectEqual(ambiguousMigration.map((prompt: any) => [prompt.identifier, prompt.content, prompt.enabled]), [
  ['dup', 'a', true],
  ['dup', 'b', true],
  ['safe', 'new', false],
]);

const diffLines = buildPromptContentDiffLines(
  { content: 'alpha\nold body\nsame' },
  { content: 'alpha\nnew body\nsame\nextra' },
);
expectEqual(diffLines.oldLines.map((line: any) => [line.kind, line.text]), [
  ['same', 'alpha'],
  ['removed', 'old body'],
  ['same', 'same'],
]);
expectEqual(diffLines.newLines.map((line: any) => [line.kind, line.text]), [
  ['same', 'alpha'],
  ['added', 'new body'],
  ['same', 'same'],
  ['added', 'extra'],
]);

console.info('presetCompare tests passed');
