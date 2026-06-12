import { klona } from 'klona';
import type { AiPresetAction, AiPresetActionPlan, AiPresetPromptInput, AiPresetTarget } from './aiPresetActions';

type ExecutorPromptPosition =
  | { type: 'relative'; depth?: never; order?: never }
  | { type: 'in_chat'; depth: number; order: number };

type ExecutorPrompt = {
  id: string;
  identifier?: string;
  name: string;
  enabled: boolean;
  position?: ExecutorPromptPosition;
  role: 'system' | 'user' | 'assistant';
  content?: string;
  [key: string]: unknown;
};

type ExecutorNormalPrompt = ExecutorPrompt & {
  position: ExecutorPromptPosition;
  content: string;
};

type ExecutorPreset = {
  prompts?: ExecutorPrompt[];
  prompts_unused?: ExecutorPrompt[];
  [key: string]: unknown;
};

declare const getPreset: (presetName: string) => ExecutorPreset;

type ManagerLike = {
  presetName: string;
  secondPresetName: string;
  loadMainPreset(name: string): boolean;
  loadSecondPreset(name: string): boolean;
  insertPromptToPreset(prompt: ExecutorNormalPrompt, targetPreset: AiPresetTarget, index?: number): Promise<void>;
  updatePromptInPreset(promptId: string, updates: Partial<ExecutorPrompt>, targetPreset: AiPresetTarget): Promise<void>;
  reorderPromptInPreset(targetPreset: AiPresetTarget, fromIndex: number, toIndex: number): Promise<boolean>;
  deletePromptEverywhere(promptId: string, targetPreset: AiPresetTarget): Promise<boolean>;
  applyPromptMigration(nextPrompts: ExecutorPrompt[], targetPreset: AiPresetTarget): Promise<boolean>;
  refreshMainPreset(): void;
  refreshSecondPreset(): void;
  isPromptLocked?: (promptId: string, targetPreset: AiPresetTarget) => boolean;
};

type HistoryLike = {
  recordOperation(presetName: string, before: ExecutorPreset, after: ExecutorPreset, description: string): void;
  recordMultiOperation(
    description: string,
    changes: Array<{ presetName: string; before: ExecutorPreset; after: ExecutorPreset }>,
  ): void;
};

type VirtualActionState = {
  mainName: string;
  secondName: string;
  presets: Map<string, ExecutorPreset>;
};

export type AiPresetActionExecutionResult = {
  ok: boolean;
  executed: number;
  skipped: number;
  errors: string[];
  warnings: string[];
};

export async function executeAiPresetActionPlan(
  plan: AiPresetActionPlan,
  deps: { manager: ManagerLike; history: HistoryLike },
): Promise<AiPresetActionExecutionResult> {
  const validationErrors = validateActionPlan(plan, deps.manager);
  if (validationErrors.length) {
    return { ok: false, executed: 0, skipped: 0, errors: validationErrors, warnings: [] };
  }

  const touchedBefore = new Map<string, ExecutorPreset>();
  const errors: string[] = [];
  const warnings: string[] = [];
  let executed = 0;
  let skipped = 0;

  for (const action of plan.actions) {
    try {
      const skipReason = getLockedSkipReason(action, deps.manager);
      if (skipReason) {
        warnings.push(skipReason);
        skipped += 1;
        continue;
      }

      const presetName = getMutationPresetName(action, deps.manager);
      if (presetName && !touchedBefore.has(presetName)) {
        touchedBefore.set(presetName, snapshotPreset(presetName));
      }

      const result = await executeAction(action, deps.manager);
      if (result !== false) executed += 1;
    } catch (error) {
      errors.push(getErrorMessage(error));
      break;
    }
  }

  if (errors.length) {
    refreshTouchedPresets(touchedBefore.keys(), deps.manager);
    return { ok: false, executed, skipped, errors, warnings };
  }

  const changes = [...touchedBefore.entries()].map(([presetName, before]) => ({
    presetName,
    before,
    after: snapshotPreset(presetName),
  }));

  if (changes.length === 1) {
    const change = changes[0];
    deps.history.recordOperation(change.presetName, change.before, change.after, `AI 代操作: ${plan.summary}`);
  } else if (changes.length > 1) {
    deps.history.recordMultiOperation(`AI 代操作: ${plan.summary}`, changes);
  }

  refreshTouchedPresets(touchedBefore.keys(), deps.manager);
  return { ok: true, executed, skipped, errors: [], warnings };
}

function validateActionPlan(plan: AiPresetActionPlan, manager: ManagerLike): string[] {
  const errors: string[] = [];
  const state: VirtualActionState = {
    mainName: manager.presetName,
    secondName: manager.secondPresetName,
    presets: new Map(),
  };

  for (const action of plan.actions) {
    try {
      applyVirtualAction(action, state);
    } catch (error) {
      errors.push(getErrorMessage(error));
      break;
    }
  }
  return errors;
}

function applyVirtualAction(action: AiPresetAction, state: VirtualActionState) {
  switch (action.type) {
    case 'switch-main-preset':
      ensureVirtualPresetByName(action.presetName, state);
      state.mainName = action.presetName;
      return;
    case 'switch-second-preset':
      ensureVirtualPresetByName(action.presetName, state);
      state.secondName = action.presetName;
      return;
    case 'insert-prompt':
      getVirtualTargetPreset(action.targetPreset, state).prompts?.splice(
        action.index ?? getVirtualTargetPreset(action.targetPreset, state).prompts?.length ?? 0,
        0,
        normalizePromptForInsert(action.prompt),
      );
      return;
    case 'update-prompt':
      Object.assign(resolveVirtualPrompt(action.targetPreset, state, action), action.updates);
      return;
    case 'toggle-prompt':
      resolveVirtualPrompt(action.targetPreset, state, action).enabled = action.enabled;
      return;
    case 'move-prompt': {
      const preset = getVirtualTargetPreset(action.targetPreset, state);
      const prompts = preset.prompts ?? [];
      const fromIndex = action.fromIndex ?? resolveVirtualPromptIndex(action.targetPreset, state, action);
      if (fromIndex < 0 || fromIndex >= prompts.length) {
        throw new Error(`找不到可移动条目: ${action.promptName ?? action.promptId ?? fromIndex}`);
      }
      if (action.toIndex < 0 || action.toIndex > prompts.length) {
        throw new Error(`移动目标位置无效: ${action.toIndex}`);
      }
      const [prompt] = prompts.splice(fromIndex, 1);
      prompts.splice(action.toIndex, 0, prompt);
      return;
    }
    case 'delete-prompt': {
      const preset = getVirtualTargetPreset(action.targetPreset, state);
      const prompt = resolveVirtualPrompt(action.targetPreset, state, action);
      preset.prompts = (preset.prompts ?? []).filter(item => getPromptKeyForAction(item) !== getPromptKeyForAction(prompt));
      preset.prompts_unused = (preset.prompts_unused ?? []).filter(item => getPromptKeyForAction(item) !== getPromptKeyForAction(prompt));
      return;
    }
    case 'clear-prompts': {
      const preset = getVirtualTargetPreset(action.targetPreset, state);
      preset.prompts = [];
      preset.prompts_unused = [];
      return;
    }
    case 'reorder-prompts': {
      const preset = getVirtualTargetPreset(action.targetPreset, state);
      const prompts = preset.prompts ?? [];
      preset.prompts = buildReorderedPrompts(prompts, action.promptIds, action.promptNames, action.targetPreset, null);
      return;
    }
  }
}

function ensureVirtualPresetByName(presetName: string, state: VirtualActionState): ExecutorPreset {
  if (!presetName) throw new Error('预设名称不能为空');
  const existing = state.presets.get(presetName);
  if (existing) return existing;

  const preset = snapshotPreset(presetName);
  preset.prompts = [...(preset.prompts ?? [])];
  preset.prompts_unused = [...(preset.prompts_unused ?? [])];
  state.presets.set(presetName, preset);
  return preset;
}

function getVirtualTargetPreset(targetPreset: AiPresetTarget, state: VirtualActionState): ExecutorPreset {
  const name = targetPreset === 'main' ? state.mainName : state.secondName;
  if (!name) throw new Error(`${targetPreset === 'main' ? '主预设' : '第二预设'}未选择`);
  return ensureVirtualPresetByName(name, state);
}

function resolveVirtualPrompt(
  targetPreset: AiPresetTarget,
  state: VirtualActionState,
  locator: { promptId?: string; promptName?: string },
): ExecutorPrompt {
  const preset = getVirtualTargetPreset(targetPreset, state);
  const prompt = [...(preset.prompts ?? []), ...(preset.prompts_unused ?? [])].find((item: ExecutorPrompt) => {
    const key = getPromptKeyForAction(item);
    return (locator.promptId && key === locator.promptId) || (locator.promptName && item.name === locator.promptName);
  });

  if (!prompt) throw new Error(`找不到条目: ${locator.promptName ?? locator.promptId}`);
  return prompt;
}

function resolveVirtualPromptIndex(
  targetPreset: AiPresetTarget,
  state: VirtualActionState,
  locator: { promptId?: string; promptName?: string },
): number {
  const preset = getVirtualTargetPreset(targetPreset, state);
  const index = (preset.prompts ?? []).findIndex((item: ExecutorPrompt) => {
    const key = getPromptKeyForAction(item);
    return (locator.promptId && key === locator.promptId) || (locator.promptName && item.name === locator.promptName);
  });

  if (index < 0) throw new Error(`找不到可移动条目: ${locator.promptName ?? locator.promptId}`);
  return index;
}

async function executeAction(action: AiPresetAction, manager: ManagerLike): Promise<boolean | void> {
  switch (action.type) {
    case 'switch-main-preset':
      if (!manager.loadMainPreset(action.presetName)) throw new Error(`主预设切换失败: ${action.presetName}`);
      return true;
    case 'switch-second-preset':
      if (!manager.loadSecondPreset(action.presetName)) throw new Error(`第二预设切换失败: ${action.presetName}`);
      return true;
    case 'insert-prompt':
      await manager.insertPromptToPreset(normalizePromptForInsert(action.prompt), action.targetPreset, action.index);
      return true;
    case 'update-prompt': {
      const prompt = resolvePrompt(action.targetPreset, manager, action);
      await manager.updatePromptInPreset(getPromptKeyForAction(prompt), action.updates, action.targetPreset);
      return true;
    }
    case 'toggle-prompt': {
      const prompt = resolvePrompt(action.targetPreset, manager, action);
      await manager.updatePromptInPreset(getPromptKeyForAction(prompt), { enabled: action.enabled }, action.targetPreset);
      return true;
    }
    case 'move-prompt': {
      const fromIndex = action.fromIndex ?? resolvePromptIndex(action.targetPreset, manager, action);
      const moved = await manager.reorderPromptInPreset(
        action.targetPreset,
        fromIndex,
        toDropIndexForFinalPosition(fromIndex, action.toIndex),
      );
      if (!moved) throw new Error(`移动条目失败: ${action.promptName ?? action.promptId ?? fromIndex}`);
      return true;
    }
    case 'delete-prompt': {
      const prompt = resolvePrompt(action.targetPreset, manager, action);
      const deleted = await manager.deletePromptEverywhere(getPromptKeyForAction(prompt), action.targetPreset);
      if (!deleted) throw new Error(`删除条目失败: ${action.promptName ?? action.promptId}`);
      return true;
    }
    case 'clear-prompts': {
      const preset = snapshotPreset(getTargetPresetName(action.targetPreset, manager));
      let deleted = 0;
      for (const prompt of [...(preset.prompts ?? []), ...(preset.prompts_unused ?? [])]) {
        const key = getPromptKeyForAction(prompt);
        if (!key || manager.isPromptLocked?.(key, action.targetPreset)) continue;
        if (await manager.deletePromptEverywhere(key, action.targetPreset)) deleted += 1;
      }
      return deleted > 0;
    }
    case 'reorder-prompts': {
      const preset = snapshotPreset(getTargetPresetName(action.targetPreset, manager));
      const nextPrompts = buildReorderedPrompts(
        preset.prompts ?? [],
        action.promptIds,
        action.promptNames,
        action.targetPreset,
        manager,
      );
      const applied = await manager.applyPromptMigration(nextPrompts, action.targetPreset);
      if (!applied) throw new Error('重排条目失败');
      return true;
    }
  }
}

function normalizePromptForInsert(prompt: AiPresetPromptInput): ExecutorNormalPrompt {
  const promptId = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id: promptId,
    name: prompt.name,
    enabled: prompt.enabled ?? true,
    position: prompt.position ?? { type: 'relative' },
    role: prompt.role ?? 'system',
    content: prompt.content,
  };
}

function getMutationPresetName(action: AiPresetAction, manager: ManagerLike): string {
  switch (action.type) {
    case 'switch-main-preset':
      return '';
    case 'switch-second-preset':
      return '';
    case 'insert-prompt':
    case 'update-prompt':
    case 'toggle-prompt':
    case 'move-prompt':
    case 'delete-prompt':
    case 'clear-prompts':
    case 'reorder-prompts':
      return getTargetPresetName(action.targetPreset, manager);
  }
}

function getLockedSkipReason(action: AiPresetAction, manager: ManagerLike) {
  if (!isLockSensitiveAction(action) || !manager.isPromptLocked) return null;
  const locator = resolvePromptForLockedAction(action, manager);
  const key = getPromptKeyForAction(locator);
  if (!key || !manager.isPromptLocked(key, action.targetPreset)) return null;
  return `锁定条目已跳过: ${locator.name}`;
}

function isLockSensitiveAction(action: AiPresetAction): action is Extract<AiPresetAction, {
  type: 'update-prompt' | 'toggle-prompt' | 'move-prompt' | 'delete-prompt';
}> {
  return action.type === 'update-prompt' || action.type === 'toggle-prompt' || action.type === 'move-prompt' || action.type === 'delete-prompt';
}

function resolvePromptForLockedAction(
  action: Extract<AiPresetAction, { type: 'update-prompt' | 'toggle-prompt' | 'move-prompt' | 'delete-prompt' }>,
  manager: ManagerLike,
) {
  if (action.type === 'move-prompt' && !action.promptId && !action.promptName && action.fromIndex !== undefined) {
    const preset = snapshotPreset(getTargetPresetName(action.targetPreset, manager));
    const prompt = (preset.prompts ?? [])[action.fromIndex];
    if (!prompt) throw new Error(`找不到可移动条目: ${action.fromIndex}`);
    return prompt;
  }
  return resolvePrompt(action.targetPreset, manager, action);
}

function buildReorderedPrompts(
  prompts: ExecutorPrompt[],
  promptIds: string[] | undefined,
  promptNames: string[] | undefined,
  targetPreset: AiPresetTarget,
  manager: Pick<ManagerLike, 'isPromptLocked'> | null,
): ExecutorPrompt[] {
  const orderedKeys = promptIds ?? promptNames;
  if (!orderedKeys?.length) throw new Error('重排条目需要 promptIds 或 promptNames');

  const byKey = new Map(prompts.map(prompt => [getPromptKeyForAction(prompt), prompt]));
  const byName = new Map(prompts.map(prompt => [prompt.name, prompt]));
  const requested = orderedKeys.map(key => {
    const prompt = promptIds ? byKey.get(key) : byName.get(key);
    if (!prompt) throw new Error(`找不到重排条目: ${key}`);
    return prompt;
  });

  const requestedKeys = new Set(requested.map(getPromptKeyForAction));
  const lockedIndexes = new Map<number, ExecutorPrompt>();
  const movableSlots: number[] = [];
  prompts.forEach((prompt, index) => {
    const key = getPromptKeyForAction(prompt);
    if (key && manager?.isPromptLocked?.(key, targetPreset)) lockedIndexes.set(index, prompt);
    else movableSlots.push(index);
  });

  const movablePrompts = [
    ...requested.filter(prompt => !manager?.isPromptLocked?.(getPromptKeyForAction(prompt), targetPreset)),
    ...prompts.filter(prompt => {
      const key = getPromptKeyForAction(prompt);
      return !requestedKeys.has(key) && !manager?.isPromptLocked?.(key, targetPreset);
    }),
  ];

  if (movablePrompts.length !== movableSlots.length) throw new Error('重排条目数量不匹配');

  const next = [...prompts];
  movableSlots.forEach((slot, index) => {
    next[slot] = movablePrompts[index];
  });
  lockedIndexes.forEach((prompt, index) => {
    next[index] = prompt;
  });
  return next;
}

function getTargetPresetName(targetPreset: AiPresetTarget, manager: ManagerLike) {
  const name = targetPreset === 'main' ? manager.presetName : manager.secondPresetName;
  if (!name) throw new Error(`${targetPreset === 'main' ? '主预设' : '第二预设'}未选择`);
  return name;
}

function toDropIndexForFinalPosition(fromIndex: number, finalIndex: number) {
  return finalIndex > fromIndex ? finalIndex + 1 : finalIndex;
}

function resolvePrompt(
  targetPreset: AiPresetTarget,
  manager: ManagerLike,
  locator: { promptId?: string; promptName?: string },
): ExecutorPrompt {
  const preset = snapshotPreset(getTargetPresetName(targetPreset, manager));
  const prompts = [...(preset.prompts ?? []), ...(preset.prompts_unused ?? [])];
  const prompt = prompts.find((item: ExecutorPrompt) => {
    const key = getPromptKeyForAction(item);
    return (locator.promptId && key === locator.promptId) || (locator.promptName && item.name === locator.promptName);
  });

  if (!prompt) throw new Error(`找不到条目: ${locator.promptName ?? locator.promptId}`);
  return prompt;
}

function resolvePromptIndex(
  targetPreset: AiPresetTarget,
  manager: ManagerLike,
  locator: { promptId?: string; promptName?: string },
): number {
  const preset = snapshotPreset(getTargetPresetName(targetPreset, manager));
  const index = (preset.prompts ?? []).findIndex((item: ExecutorPrompt) => {
    const key = getPromptKeyForAction(item);
    return (locator.promptId && key === locator.promptId) || (locator.promptName && item.name === locator.promptName);
  });

  if (index < 0) throw new Error(`找不到可移动条目: ${locator.promptName ?? locator.promptId}`);
  return index;
}

function getPromptKeyForAction(prompt: ExecutorPrompt): string {
  return String((prompt as any).identifier ?? prompt.id ?? '');
}

function snapshotPreset(presetName: string): ExecutorPreset {
  return klona(getPreset(presetName));
}

function refreshTouchedPresets(presetNames: Iterable<string>, manager: ManagerLike) {
  const names = new Set(presetNames);
  if (manager.presetName && names.has(manager.presetName)) manager.refreshMainPreset();
  if (manager.secondPresetName && names.has(manager.secondPresetName)) manager.refreshSecondPreset();
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
