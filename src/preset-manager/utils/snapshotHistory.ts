import { buildPresetMigrationDiff, type ComparablePresetPrompt } from './presetCompare';

export type SnapshotLike = {
  id: string;
  name: string;
  presetName: string;
  preset: any;
  timestamp: number;
  auto: boolean;
};

export type SnapshotExport = {
  type: 'preset-manager-snapshot';
  version: 1;
  exportedAt: string;
  snapshot: SnapshotLike;
};

export type AutoSnapshotPolicy = {
  now?: number;
  minIntervalMs?: number;
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function stableStringify(value: any): string {
  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function getLatestAutoSnapshot(snapshots: SnapshotLike[], presetName: string) {
  return snapshots
    .filter(snapshot => snapshot.auto && snapshot.presetName === presetName)
    .sort((a, b) => b.timestamp - a.timestamp)[0];
}

function getSnapshotPrompts(snapshot: SnapshotLike): ComparablePresetPrompt[] {
  return [
    ...((snapshot.preset?.prompts ?? []) as ComparablePresetPrompt[]),
    ...((snapshot.preset?.prompts_unused ?? []) as ComparablePresetPrompt[]),
  ];
}

function getPresetPrompts(preset: any): ComparablePresetPrompt[] {
  return [
    ...((preset?.prompts ?? []) as ComparablePresetPrompt[]),
    ...((preset?.prompts_unused ?? []) as ComparablePresetPrompt[]),
  ];
}

function getPromptSearchText(prompt: ComparablePresetPrompt) {
  return [
    prompt.id,
    prompt.identifier,
    prompt.name,
    prompt.role,
    prompt.content,
  ]
    .filter(value => value !== undefined && value !== null)
    .join(' ');
}

function getSnapshotSearchText(snapshot: SnapshotLike) {
  return [
    snapshot.name,
    snapshot.presetName,
    snapshot.auto ? '自动 auto' : '手动 manual',
    ...getSnapshotPrompts(snapshot).map(getPromptSearchText),
  ]
    .join(' ')
    .toLowerCase();
}

export function filterSnapshots<T extends SnapshotLike>(snapshots: T[], query: string): T[] {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) return snapshots;

  return snapshots.filter(snapshot => {
    const searchText = getSnapshotSearchText(snapshot);
    return tokens.every(token => searchText.includes(token));
  });
}

export function sanitizeSnapshotFileName(name: string) {
  return name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'preset-snapshot';
}

export function buildSnapshotExport(snapshot: SnapshotLike): SnapshotExport {
  return {
    type: 'preset-manager-snapshot',
    version: 1,
    exportedAt: new Date().toISOString(),
    snapshot: cloneJson(snapshot),
  };
}

export function getAutoSnapshotCleanupIds(snapshots: SnapshotLike[], presetName?: string) {
  return snapshots
    .filter(snapshot => snapshot.auto && (!presetName || snapshot.presetName === presetName))
    .map(snapshot => snapshot.id);
}

export function shouldCreateAutoSnapshot(
  snapshots: SnapshotLike[],
  presetName: string,
  preset: any,
  policy: AutoSnapshotPolicy = {},
) {
  const latest = getLatestAutoSnapshot(snapshots, presetName);
  if (!latest) return true;

  if (stableStringify(latest.preset) === stableStringify(preset)) {
    return false;
  }

  const minIntervalMs = policy.minIntervalMs ?? 5 * 60 * 1000;
  const now = policy.now ?? Date.now();
  return now - latest.timestamp >= minIntervalMs;
}

export function pruneAutoSnapshots<T extends SnapshotLike>(snapshots: T[], presetName: string, maxCount: number) {
  const keptAutoIds = new Set(
    snapshots
      .filter(snapshot => snapshot.auto && snapshot.presetName === presetName)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, Math.max(0, maxCount))
      .map(snapshot => snapshot.id),
  );

  return snapshots.filter(snapshot => {
    if (!snapshot.auto || snapshot.presetName !== presetName) return true;
    return keptAutoIds.has(snapshot.id);
  });
}

export function buildSnapshotRestoreSummary(options: {
  currentPreset: any;
  snapshotPreset: any;
}) {
  const currentPrompts = getPresetPrompts(options.currentPreset);
  const snapshotPrompts = getPresetPrompts(options.snapshotPreset);
  const diff = buildPresetMigrationDiff({
    mainPrompts: currentPrompts,
    secondPrompts: snapshotPrompts,
  });
  const summary = diff.summary;
  const parts = [
    `当前 ${currentPrompts.length} 条`,
    `快照 ${snapshotPrompts.length} 条`,
    `新增 ${summary.added}`,
    `移除 ${summary.removed}`,
    `内容变化 ${summary.contentChanged + summary.conflict}`,
    `启用变化 ${summary.enabledChanged + summary.conflict}`,
    `顺序变化 ${summary.orderChanged}`,
  ];
  if (summary.duplicate) parts.push(`重复标识 ${summary.duplicate}`);
  return parts.join(' · ');
}
