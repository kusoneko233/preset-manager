export type PresetMigrationKind =
  | 'added'
  | 'removed'
  | 'content-changed'
  | 'enabled-changed'
  | 'order-changed'
  | 'duplicate'
  | 'conflict';

export type PresetMigrationVisualTone =
  | 'added'
  | 'removed'
  | 'content'
  | 'enabled'
  | 'order'
  | 'mixed'
  | 'duplicate';

export type ComparablePresetPrompt = {
  id?: string;
  identifier?: string;
  name?: string;
  content?: string;
  enabled?: boolean;
  role?: string;
  [key: string]: unknown;
};

export type PresetMigrationDiffItem = {
  key: string;
  name: string;
  kind: PresetMigrationKind;
  visualTone: PresetMigrationVisualTone;
  label: string;
  mainIndex: number;
  secondIndex: number;
  mainAnchorIndex: number;
  oldPrompt?: ComparablePresetPrompt;
  newPrompt?: ComparablePresetPrompt;
  locked: boolean;
  selectable: boolean;
  note: string;
  textDelta?: PresetMigrationTextDelta;
};

export type PresetMigrationTextDelta = {
  oldLength: number;
  newLength: number;
  addedChars: number;
  removedChars: number;
  preview: string;
};

export type PromptContentDiffLine = {
  kind: 'same' | 'removed' | 'added';
  text: string;
};

export type PromptContentDiffLines = {
  oldLines: PromptContentDiffLine[];
  newLines: PromptContentDiffLine[];
};

export type PresetMigrationSummary = {
  added: number;
  removed: number;
  contentChanged: number;
  enabledChanged: number;
  orderChanged: number;
  duplicate: number;
  conflict: number;
  locked: number;
  selectable: number;
};

export type PresetMigrationDiff = {
  items: PresetMigrationDiffItem[];
  summary: PresetMigrationSummary;
};

function clonePrompt<T>(prompt: T): T {
  return JSON.parse(JSON.stringify(prompt));
}

export function getPresetPromptCompareKey(prompt: ComparablePresetPrompt | null | undefined) {
  return String(prompt?.identifier || prompt?.id || prompt?.name || '').trim();
}

function getPromptName(prompt: ComparablePresetPrompt | null | undefined, fallback: string) {
  return String(prompt?.name || fallback);
}

function normalizeContent(prompt: ComparablePresetPrompt | null | undefined) {
  return String(prompt?.content ?? '');
}

function normalizeRole(prompt: ComparablePresetPrompt | null | undefined) {
  return String(prompt?.role ?? '');
}

function normalizeEnabled(prompt: ComparablePresetPrompt | null | undefined) {
  return prompt?.enabled ?? true;
}

function groupEntriesByKey(entries: Array<{ prompt: ComparablePresetPrompt; index: number; key: string }>) {
  const groups = new Map<string, Array<{ prompt: ComparablePresetPrompt; index: number; key: string }>>();
  for (const entry of entries) {
    const group = groups.get(entry.key) ?? [];
    group.push(entry);
    groups.set(entry.key, group);
  }
  return groups;
}

function getDuplicateKeys(
  mainGroups: Map<string, Array<{ prompt: ComparablePresetPrompt; index: number; key: string }>>,
  secondGroups: Map<string, Array<{ prompt: ComparablePresetPrompt; index: number; key: string }>>,
) {
  const keys = new Set<string>();
  for (const [key, group] of mainGroups) {
    if (group.length > 1) keys.add(key);
  }
  for (const [key, group] of secondGroups) {
    if (group.length > 1) keys.add(key);
  }
  return keys;
}

function getMainAnchorIndexForSecondEntry(
  secondEntry: { index: number; key: string },
  secondEntries: Array<{ prompt: ComparablePresetPrompt; index: number; key: string }>,
  mainByKey: Map<string, { prompt: ComparablePresetPrompt; index: number; key: string }>,
  mainLength: number,
) {
  const secondPosition = secondEntries.findIndex(entry => entry.index === secondEntry.index && entry.key === secondEntry.key);
  if (secondPosition < 0) return mainLength;

  for (let cursor = secondPosition - 1; cursor >= 0; cursor -= 1) {
    const previousMain = mainByKey.get(secondEntries[cursor].key);
    if (previousMain) return previousMain.index + 1;
  }

  for (let cursor = secondPosition + 1; cursor < secondEntries.length; cursor += 1) {
    const nextMain = mainByKey.get(secondEntries[cursor].key);
    if (nextMain) return nextMain.index;
  }

  return mainLength;
}

function makeTextDelta(
  oldPrompt: ComparablePresetPrompt | null | undefined,
  newPrompt: ComparablePresetPrompt | null | undefined,
): PresetMigrationTextDelta | undefined {
  const oldText = normalizeContent(oldPrompt);
  const newText = normalizeContent(newPrompt);
  if (oldText === newText) return undefined;

  const oldLength = oldText.length;
  const newLength = newText.length;
  return {
    oldLength,
    newLength,
    addedChars: Math.max(0, newLength - oldLength),
    removedChars: Math.max(0, oldLength - newLength),
    preview: `文本长度 ${oldLength} → ${newLength}`,
  };
}

export function buildPromptContentDiffLines(
  oldPrompt: ComparablePresetPrompt | null | undefined,
  newPrompt: ComparablePresetPrompt | null | undefined,
): PromptContentDiffLines {
  const oldLines = normalizeContent(oldPrompt).split('\n');
  const newLines = normalizeContent(newPrompt).split('\n');
  const max = Math.max(oldLines.length, newLines.length);
  const oldResult: PromptContentDiffLine[] = [];
  const newResult: PromptContentDiffLine[] = [];

  for (let index = 0; index < max; index += 1) {
    const oldLine = oldLines[index];
    const newLine = newLines[index];

    if (oldLine === undefined) {
      newResult.push({ kind: 'added', text: newLine ?? '' });
    } else if (newLine === undefined) {
      oldResult.push({ kind: 'removed', text: oldLine });
    } else if (oldLine === newLine) {
      oldResult.push({ kind: 'same', text: oldLine });
      newResult.push({ kind: 'same', text: newLine });
    } else {
      oldResult.push({ kind: 'removed', text: oldLine });
      newResult.push({ kind: 'added', text: newLine });
    }
  }

  return { oldLines: oldResult, newLines: newResult };
}

function makeItem(options: {
  key: string;
  kind: PresetMigrationKind;
  mainIndex: number;
  secondIndex: number;
  mainAnchorIndex?: number;
  oldPrompt?: ComparablePresetPrompt;
  newPrompt?: ComparablePresetPrompt;
  locked: boolean;
  note?: string;
  textDelta?: PresetMigrationTextDelta;
}): PresetMigrationDiffItem {
  const name = getPromptName(options.newPrompt ?? options.oldPrompt, options.key);
  const selectable = !options.locked && options.kind !== 'duplicate';
  const note = options.note ?? (options.locked ? '已锁定，对比迁移会跳过该条目' : getMigrationNote(options.kind));
  const visualTone = getMigrationVisualTone(options.kind);

  return {
    key: options.key,
    name,
    kind: options.kind,
    visualTone,
    label: getMigrationVisualLabel(visualTone),
    mainIndex: options.mainIndex,
    secondIndex: options.secondIndex,
    mainAnchorIndex: options.mainAnchorIndex ?? Math.max(0, options.mainIndex),
    oldPrompt: options.oldPrompt,
    newPrompt: options.newPrompt,
    locked: options.locked,
    selectable,
    note,
    textDelta: options.textDelta,
  };
}

export function getMigrationVisualTone(kind: PresetMigrationKind): PresetMigrationVisualTone {
  if (kind === 'added') return 'added';
  if (kind === 'removed') return 'removed';
  if (kind === 'content-changed') return 'content';
  if (kind === 'enabled-changed') return 'enabled';
  if (kind === 'order-changed') return 'order';
  if (kind === 'duplicate') return 'duplicate';
  return 'mixed';
}

export function getMigrationVisualLabel(tone: PresetMigrationVisualTone) {
  if (tone === 'added') return '新增';
  if (tone === 'removed') return '右侧无';
  if (tone === 'content') return '内容';
  if (tone === 'enabled') return '状态';
  if (tone === 'order') return '';
  if (tone === 'duplicate') return '重复';
  return '混合';
}

function getMigrationNote(kind: PresetMigrationKind) {
  if (kind === 'added') return '新版新增，可添加到主预设';
  if (kind === 'removed') return '右侧预设没有该条目，可从主预设移除';
  if (kind === 'content-changed') return '内容有变化，可用新版覆盖';
  if (kind === 'enabled-changed') return '启用状态有变化，可同步新版状态';
  if (kind === 'duplicate') return '存在重复标识，先手动整理后再迁移';
  if (kind === 'conflict') return '同一条目同时存在内容和启用状态差异，先人工确认';
  return '相对顺序有变化，可按右侧排列同步';
}

function incrementSummary(summary: PresetMigrationSummary, item: PresetMigrationDiffItem) {
  if (item.kind === 'added') summary.added += 1;
  else if (item.kind === 'removed') summary.removed += 1;
  else if (item.kind === 'content-changed') summary.contentChanged += 1;
  else if (item.kind === 'enabled-changed') summary.enabledChanged += 1;
  else if (item.kind === 'order-changed') summary.orderChanged += 1;
  else if (item.kind === 'duplicate') summary.duplicate += 1;
  else if (item.kind === 'conflict') summary.conflict += 1;

  if (item.locked) summary.locked += 1;
  if (item.selectable) summary.selectable += 1;
}

export function buildPresetMigrationDiff(options: {
  mainPrompts: ComparablePresetPrompt[];
  secondPrompts: ComparablePresetPrompt[];
  isLocked?: (key: string, prompt?: ComparablePresetPrompt) => boolean;
}): PresetMigrationDiff {
  const mainEntries = options.mainPrompts
    .map((prompt, index) => ({ prompt, index, key: getPresetPromptCompareKey(prompt) }))
    .filter(entry => entry.key);
  const secondEntries = options.secondPrompts
    .map((prompt, index) => ({ prompt, index, key: getPresetPromptCompareKey(prompt) }))
    .filter(entry => entry.key);
  const mainGroups = groupEntriesByKey(mainEntries);
  const secondGroups = groupEntriesByKey(secondEntries);
  const duplicateKeys = getDuplicateKeys(mainGroups, secondGroups);
  const mainByKey = new Map(mainEntries.map(entry => [entry.key, entry]));
  const secondByKey = new Map(secondEntries.map(entry => [entry.key, entry]));
  const items: PresetMigrationDiffItem[] = [];

  for (const key of duplicateKeys) {
    const mainGroup = mainGroups.get(key) ?? [];
    const secondGroup = secondGroups.get(key) ?? [];
    const oldPrompt = mainGroup[0]?.prompt;
    const newPrompt = secondGroup[0]?.prompt;
    const locked = mainGroup.some(entry => Boolean(options.isLocked?.(key, entry.prompt)));
    items.push(makeItem({
      key,
      kind: 'duplicate',
      mainIndex: mainGroup[0]?.index ?? -1,
      secondIndex: secondGroup[0]?.index ?? -1,
      oldPrompt,
      newPrompt,
      locked,
      note: `主预设 ${mainGroup.length} 个，第二预设 ${secondGroup.length} 个；标识重复，不能自动迁移`,
    }));
  }

  for (const second of secondEntries) {
    if (duplicateKeys.has(second.key)) continue;
    const main = mainByKey.get(second.key);
    const locked = Boolean(options.isLocked?.(second.key, main?.prompt));

    if (!main) {
      items.push(makeItem({
        key: second.key,
        kind: 'added',
        mainIndex: -1,
        secondIndex: second.index,
        mainAnchorIndex: getMainAnchorIndexForSecondEntry(second, secondEntries, mainByKey, options.mainPrompts.length),
        newPrompt: second.prompt,
        locked: false,
      }));
      continue;
    }

    const contentChanged = normalizeContent(main.prompt) !== normalizeContent(second.prompt)
      || normalizeRole(main.prompt) !== normalizeRole(second.prompt);
    const enabledChanged = normalizeEnabled(main.prompt) !== normalizeEnabled(second.prompt);

    if (contentChanged && enabledChanged) {
      items.push(makeItem({
        key: second.key,
        kind: 'conflict',
        mainIndex: main.index,
        secondIndex: second.index,
        oldPrompt: main.prompt,
        newPrompt: second.prompt,
        locked,
        textDelta: makeTextDelta(main.prompt, second.prompt),
      }));
    } else if (contentChanged) {
      items.push(makeItem({
        key: second.key,
        kind: 'content-changed',
        mainIndex: main.index,
        secondIndex: second.index,
        oldPrompt: main.prompt,
        newPrompt: second.prompt,
        locked,
        textDelta: makeTextDelta(main.prompt, second.prompt),
      }));
    } else if (enabledChanged) {
      items.push(makeItem({
        key: second.key,
        kind: 'enabled-changed',
        mainIndex: main.index,
        secondIndex: second.index,
        oldPrompt: main.prompt,
        newPrompt: second.prompt,
        locked,
      }));
    }
  }

  for (const main of mainEntries) {
    if (duplicateKeys.has(main.key)) continue;
    if (secondByKey.has(main.key)) continue;
    const locked = Boolean(options.isLocked?.(main.key, main.prompt));
    items.push(makeItem({
      key: main.key,
      kind: 'removed',
      mainIndex: main.index,
      secondIndex: -1,
      oldPrompt: main.prompt,
      locked,
    }));
  }

  const summary: PresetMigrationSummary = {
    added: 0,
    removed: 0,
    contentChanged: 0,
    enabledChanged: 0,
    orderChanged: 0,
    duplicate: 0,
    conflict: 0,
    locked: 0,
    selectable: 0,
  };
  items.forEach(item => incrementSummary(summary, item));

  return { items, summary };
}

export function applyPresetMigrationSelection(options: {
  mainPrompts: ComparablePresetPrompt[];
  secondPrompts: ComparablePresetPrompt[];
  selectedKeys: string[];
  lockedKeys?: string[];
}) {
  const selected = new Set(options.selectedKeys);
  const locked = new Set(options.lockedKeys ?? []);
  const mainEntries = options.mainPrompts
    .map((prompt, index) => ({ prompt, index, key: getPresetPromptCompareKey(prompt) }))
    .filter(entry => entry.key);
  const secondEntries = options.secondPrompts
    .map((prompt, index) => ({ prompt, index, key: getPresetPromptCompareKey(prompt) }))
    .filter(entry => entry.key);
  const duplicateKeys = getDuplicateKeys(groupEntriesByKey(mainEntries), groupEntriesByKey(secondEntries));
  const mainByKey = new Map(mainEntries.map(entry => [entry.key, entry]));
  const orderOnlyKeys = new Set(
    secondEntries
      .filter(second => {
        const main = mainByKey.get(second.key);
        return main
          && main.index !== second.index
          && normalizeContent(main.prompt) === normalizeContent(second.prompt)
          && normalizeRole(main.prompt) === normalizeRole(second.prompt)
          && normalizeEnabled(main.prompt) === normalizeEnabled(second.prompt);
      })
      .map(entry => entry.key),
  );
  const secondByKey = new Map(
    options.secondPrompts
      .map(prompt => [getPresetPromptCompareKey(prompt), prompt] as const)
      .filter(([key]) => key),
  );
  const blockedKeys = duplicateKeys;
  const result: ComparablePresetPrompt[] = [];

  for (const prompt of options.mainPrompts) {
    const key = getPresetPromptCompareKey(prompt);
    if (locked.has(key) || blockedKeys.has(key)) {
      result.push(clonePrompt(prompt));
      continue;
    }
    if (selected.has(key) && !secondByKey.has(key)) {
      continue;
    }
    if (selected.has(key) && secondByKey.has(key)) {
      result.push(clonePrompt(secondByKey.get(key)!));
      continue;
    }
    result.push(clonePrompt(prompt));
  }

  const existing = new Set(result.map(prompt => getPresetPromptCompareKey(prompt)));
  for (const prompt of options.secondPrompts) {
    const key = getPresetPromptCompareKey(prompt);
    if (!key || existing.has(key) || locked.has(key) || blockedKeys.has(key) || !selected.has(key)) continue;
    result.push(clonePrompt(prompt));
    existing.add(key);
  }

  for (const second of secondEntries) {
    if (!selected.has(second.key) || !orderOnlyKeys.has(second.key) || locked.has(second.key) || blockedKeys.has(second.key)) continue;
    const currentIndex = result.findIndex(prompt => getPresetPromptCompareKey(prompt) === second.key);
    if (currentIndex < 0) continue;

    const [prompt] = result.splice(currentIndex, 1);
    const secondIndex = secondEntries.findIndex(entry => entry.key === second.key && entry.index === second.index);
    let insertIndex = result.length;

    for (let cursor = secondIndex - 1; cursor >= 0; cursor -= 1) {
      const previousIndex = result.findIndex(item => getPresetPromptCompareKey(item) === secondEntries[cursor].key);
      if (previousIndex >= 0) {
        insertIndex = previousIndex + 1;
        break;
      }
    }

    if (insertIndex === result.length) {
      for (let cursor = secondIndex + 1; cursor < secondEntries.length; cursor += 1) {
        const nextIndex = result.findIndex(item => getPresetPromptCompareKey(item) === secondEntries[cursor].key);
        if (nextIndex >= 0) {
          insertIndex = nextIndex;
          break;
        }
      }
    }

    result.splice(insertIndex, 0, prompt);
  }

  return result;
}
