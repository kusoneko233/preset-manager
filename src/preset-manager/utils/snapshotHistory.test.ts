declare const require: any;

const {
  buildSnapshotExport,
  buildSnapshotRestoreSummary,
  filterSnapshots,
  getAutoSnapshotCleanupIds,
  pruneAutoSnapshots,
  sanitizeSnapshotFileName,
  shouldCreateAutoSnapshot,
} = require('./snapshotHistory');

function expectEqual<T>(actual: T, expected: T) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function expectIncludes(content: string, expected: string) {
  if (!content.includes(expected)) {
    throw new Error(`Expected ${content} to include ${expected}`);
  }
}

const snapshots = [
  {
    id: 'manual-a',
    name: '手动备份 - 主预设',
    presetName: '咩咩预设',
    timestamp: 1000,
    auto: false,
    preset: {
      prompts: [
        { identifier: 'world', name: '世界观', content: '星海城市', enabled: true },
      ],
    },
  },
  {
    id: 'auto-a',
    name: '自动备份 - 战斗',
    presetName: '战斗预设',
    timestamp: 2000,
    auto: true,
    preset: {
      prompts: [
        { identifier: 'battle', name: '战斗规则', content: '回合制', enabled: true },
      ],
    },
  },
  {
    id: 'auto-b',
    name: '自动备份 - 咩咩',
    presetName: '咩咩预设',
    timestamp: 3000,
    auto: true,
    preset: {
      prompts: [
        { identifier: 'style', name: '文风', content: '柔和', enabled: false },
      ],
    },
  },
];

expectEqual(filterSnapshots(snapshots, '').map((snap: any) => snap.id), ['manual-a', 'auto-a', 'auto-b']);
expectEqual(filterSnapshots(snapshots, '星海').map((snap: any) => snap.id), ['manual-a']);
expectEqual(filterSnapshots(snapshots, '战斗').map((snap: any) => snap.id), ['auto-a']);
expectEqual(filterSnapshots(snapshots, '咩咩 自动').map((snap: any) => snap.id), ['auto-b']);

expectEqual(sanitizeSnapshotFileName('咩咩: 预设/快照?'), '咩咩-预设-快照');

const exported = buildSnapshotExport(snapshots[0]);
expectEqual(exported.type, 'preset-manager-snapshot');
expectEqual(exported.version, 1);
expectEqual(exported.snapshot.id, 'manual-a');

const cleanupIds = getAutoSnapshotCleanupIds(snapshots, '咩咩预设');
expectEqual(cleanupIds, ['auto-b']);

expectEqual(
  shouldCreateAutoSnapshot(snapshots, '咩咩预设', snapshots[2].preset, { now: 4000, minIntervalMs: 1000 }),
  false,
);
expectEqual(
  shouldCreateAutoSnapshot(
    snapshots,
    '咩咩预设',
    { prompts: [{ identifier: 'style', name: '文风', content: '更柔和', enabled: false }] },
    { now: 3200, minIntervalMs: 1000 },
  ),
  false,
);
expectEqual(
  shouldCreateAutoSnapshot(
    snapshots,
    '咩咩预设',
    { prompts: [{ identifier: 'style', name: '文风', content: '更柔和', enabled: false }] },
    { now: 5000, minIntervalMs: 1000 },
  ),
  true,
);

const manyAutoSnapshots = [
  ...snapshots,
  { ...snapshots[2], id: 'auto-c', timestamp: 4000 },
  { ...snapshots[2], id: 'auto-d', timestamp: 5000 },
];
expectEqual(
  pruneAutoSnapshots(manyAutoSnapshots, '咩咩预设', 2).map((snap: any) => snap.id),
  ['manual-a', 'auto-a', 'auto-c', 'auto-d'],
);

const summary = buildSnapshotRestoreSummary({
  currentPreset: {
    prompts: [
      { identifier: 'world', name: '世界观', content: '旧城市', enabled: true },
      { identifier: 'old', name: '旧条目', content: '删除', enabled: true },
    ],
  },
  snapshotPreset: {
    prompts: [
      { identifier: 'world', name: '世界观', content: '星海城市', enabled: true },
      { identifier: 'new', name: '新条目', content: '新增', enabled: false },
    ],
  },
});

expectIncludes(summary, '新增 1');
expectIncludes(summary, '移除 1');
expectIncludes(summary, '内容变化 1');
expectIncludes(summary, '当前 2 条');
expectIncludes(summary, '快照 2 条');

console.info('snapshotHistory tests passed');
