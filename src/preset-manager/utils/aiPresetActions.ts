import dedent from 'dedent';
import { jsonrepair } from 'jsonrepair';

export type AiPresetTarget = 'main' | 'second';
export type AiPresetPromptRole = 'system' | 'user' | 'assistant';
export type AiPresetPromptPosition =
  | { type: 'relative'; depth?: never; order?: never }
  | { type: 'in_chat'; depth: number; order: number };

export type AiPresetPromptInput = {
  name: string;
  role?: AiPresetPromptRole;
  enabled?: boolean;
  content: string;
  position?: AiPresetPromptPosition;
};

export type AiPresetPromptUpdates = Partial<{
  name: string;
  role: AiPresetPromptRole;
  enabled: boolean;
  content: string;
  position: AiPresetPromptPosition;
}>;

export type AiPresetAction =
  | {
      type: 'switch-main-preset';
      presetName: string;
    }
  | {
      type: 'switch-second-preset';
      presetName: string;
    }
  | {
      type: 'insert-prompt';
      targetPreset: AiPresetTarget;
      index?: number;
      prompt: AiPresetPromptInput;
    }
  | {
      type: 'update-prompt';
      targetPreset: AiPresetTarget;
      promptId?: string;
      promptName?: string;
      updates: AiPresetPromptUpdates;
    }
  | {
      type: 'toggle-prompt';
      targetPreset: AiPresetTarget;
      promptId?: string;
      promptName?: string;
      enabled: boolean;
    }
  | {
      type: 'move-prompt';
      targetPreset: AiPresetTarget;
      promptId?: string;
      promptName?: string;
      fromIndex?: number;
      toIndex: number;
    }
  | {
      type: 'delete-prompt';
      targetPreset: AiPresetTarget;
      promptId?: string;
      promptName?: string;
    }
  | {
      type: 'clear-prompts';
      targetPreset: AiPresetTarget;
    }
  | {
      type: 'reorder-prompts';
      targetPreset: AiPresetTarget;
      promptIds?: string[];
      promptNames?: string[];
    };

export type AiPresetActionPlan = {
  summary: string;
  actions: AiPresetAction[];
};

export type AiPresetActionPreviewItem = {
  action: AiPresetAction;
  summary: string;
  skipped: boolean;
  reason?: string;
};

export type AiPresetActionParseResult = {
  plan: AiPresetActionPlan | null;
  errors: string[];
};

const ACTION_BLOCK_RE = /```preset-manager-action\s*([\s\S]*?)```/gi;
const ALLOWED_ACTION_TYPES = new Set([
  'switch-main-preset',
  'switch-second-preset',
  'insert-prompt',
  'update-prompt',
  'toggle-prompt',
  'move-prompt',
  'delete-prompt',
  'clear-prompts',
  'reorder-prompts',
]);

export function stripAiActionBlocks(text: string): string {
  return text.replace(ACTION_BLOCK_RE, '').trim();
}

export function buildAiActionSystemPrompt(): string {
  return dedent`
    你可以协助用户操作预设管理器，但必须等待用户确认后才会执行，不能假装已经完成。

    如果需要代操作，请在自然语言说明后附加一个且只能一个 JSON 代码块：

    \`\`\`preset-manager-action
    {
      "summary": "一句话说明这次将做什么",
      "actions": [
        {
          "type": "insert-prompt",
          "targetPreset": "main",
          "index": 0,
          "prompt": {
            "name": "条目名称",
            "role": "system",
            "enabled": true,
            "content": "条目内容"
          }
        }
      ]
    }
    \`\`\`

    允许的动作类型：
    - switch-main-preset：切换主预设，字段 presetName
    - switch-second-preset：切换第二预设，字段 presetName
    - insert-prompt：插入新条目，字段 targetPreset、prompt、可选 index
    - update-prompt：修改条目，字段 targetPreset、promptId 或 promptName、updates
    - toggle-prompt：启用或禁用条目，字段 targetPreset、promptId 或 promptName、enabled
    - move-prompt：移动条目，字段 targetPreset、toIndex，以及 promptId、promptName 或 fromIndex
    - delete-prompt：彻底删除单个条目，字段 targetPreset，以及 promptId 或 promptName
    - clear-prompts：清空目标预设中可删除且未锁定的条目，字段 targetPreset
    - reorder-prompts：按指定列表重排目标预设中的活动条目，字段 targetPreset，以及 promptIds 或 promptNames

    约束：
    - 必须等待用户确认；不要说“已修改”“已保存”，只能说“确认后将执行”。
    - 删除、清空、重排都属于高风险动作，必须在 summary 里明确说明影响范围，交给用户确认卡片二次确认。
    - 锁定条目不能被删除、清空、修改、禁用或移动；涉及锁定条目时会自动跳过或保留原位。
    - 如果定位不到条目，优先使用 promptName；不确定时先询问用户。
    - targetPreset 只能是 main 或 second。
    - index、fromIndex、toIndex 都使用从 0 开始的下标。
    - JSON 外的自然语言会显示给用户，JSON 动作块只用于插件解析。
  `;
}

export function parseAiPresetActionResponse(text: string): AiPresetActionParseResult {
  const blocks = [...text.matchAll(ACTION_BLOCK_RE)];
  if (!blocks.length) return { plan: null, errors: [] };
  if (blocks.length > 1) return { plan: null, errors: ['一次回复只能包含一个 preset-manager-action 动作块'] };

  let raw: unknown;
  try {
    raw = parseActionJson(blocks[0][1]);
  } catch (error) {
    return { plan: null, errors: [`动作 JSON 解析失败: ${getErrorMessage(error)}`] };
  }

  return normalizeActionPlan(raw);
}

export function summarizeAiPresetAction(action: AiPresetAction): string {
  switch (action.type) {
    case 'switch-main-preset':
      return `切换主预设到「${action.presetName}」`;
    case 'switch-second-preset':
      return `切换第二预设到「${action.presetName}」`;
    case 'insert-prompt':
      return `向${targetLabel(action.targetPreset)}插入条目「${action.prompt.name}」${formatIndex(action.index)}`;
    case 'update-prompt':
      return `修改${targetLabel(action.targetPreset)}条目「${action.promptName ?? action.promptId ?? '待定位条目'}」`;
    case 'toggle-prompt':
      return `${action.enabled ? '启用' : '禁用'}${targetLabel(action.targetPreset)}条目「${action.promptName ?? action.promptId ?? '待定位条目'}」`;
    case 'move-prompt':
      return `移动${targetLabel(action.targetPreset)}条目「${action.promptName ?? action.promptId ?? `第 ${action.fromIndex ?? '?'} 项`}」到第 ${action.toIndex + 1} 位`;
    case 'delete-prompt':
      return `删除${targetLabel(action.targetPreset)}条目「${action.promptName ?? action.promptId ?? '待定位条目'}」`;
    case 'clear-prompts':
      return `清空${targetLabel(action.targetPreset)}中可删除且未锁定的条目`;
    case 'reorder-prompts':
      return `重排${targetLabel(action.targetPreset)}条目：${(action.promptNames ?? action.promptIds ?? []).join(' → ')}`;
  }
}

export function buildAiPresetActionPreviewItems(
  actions: AiPresetAction[],
  options: {
    isPromptLocked?: (locator: {
      targetPreset: AiPresetTarget;
      promptId?: string;
      promptName?: string;
      fromIndex?: number;
      action: AiPresetAction;
    }) => boolean;
  } = {},
): AiPresetActionPreviewItem[] {
  return actions.map(action => {
    const locked = isLockSensitiveAction(action)
      ? Boolean(options.isPromptLocked?.({
        targetPreset: action.targetPreset,
        promptId: action.promptId,
        promptName: action.promptName,
        fromIndex: action.type === 'move-prompt' ? action.fromIndex : undefined,
        action,
      }))
      : false;
    const baseSummary = summarizeAiPresetAction(action);
    return {
      action,
      summary: locked ? `跳过：${baseSummary}（锁定）` : baseSummary,
      skipped: locked,
      reason: locked ? '锁定条目会跳过' : undefined,
    };
  });
}

function isLockSensitiveAction(action: AiPresetAction): action is Extract<AiPresetAction, {
  type: 'update-prompt' | 'toggle-prompt' | 'move-prompt' | 'delete-prompt';
}> {
  return action.type === 'update-prompt' || action.type === 'toggle-prompt' || action.type === 'move-prompt' || action.type === 'delete-prompt';
}

function parseActionJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    const trimmed = text.trim();
    if (!trimmed.endsWith('}')) throw error;
    return JSON.parse(jsonrepair(trimmed));
  }
}

function normalizeActionPlan(raw: unknown): AiPresetActionParseResult {
  const errors: string[] = [];
  if (!isRecord(raw)) return { plan: null, errors: ['动作计划必须是对象'] };

  const summary = typeof raw.summary === 'string' && raw.summary.trim() ? raw.summary.trim() : 'AI 代操作';
  if (!Array.isArray(raw.actions) || raw.actions.length === 0) {
    return { plan: null, errors: ['动作计划必须包含 actions 数组'] };
  }

  const actions: AiPresetAction[] = [];
  raw.actions.forEach((item, index) => {
    const normalized = normalizeAction(item, index);
    if (typeof normalized === 'string') errors.push(normalized);
    else actions.push(normalized);
  });

  if (errors.length) return { plan: null, errors };
  return { plan: { summary, actions }, errors: [] };
}

function normalizeAction(raw: unknown, index: number): AiPresetAction | string {
  if (!isRecord(raw)) return `第 ${index + 1} 个动作必须是对象`;

  const type = String(raw.type ?? '');
  if (!ALLOWED_ACTION_TYPES.has(type)) {
    return `不允许的动作类型: ${type || '(空)'}`;
  }

  switch (type) {
    case 'switch-main-preset': {
      const presetName = readRequiredString(raw, 'presetName');
      return presetName ? { type, presetName } : `第 ${index + 1} 个动作缺少 presetName`;
    }
    case 'switch-second-preset': {
      const presetName = readRequiredString(raw, 'presetName');
      return presetName ? { type, presetName } : `第 ${index + 1} 个动作缺少 presetName`;
    }
    case 'insert-prompt': {
      const targetPreset = readTarget(raw);
      if (!targetPreset) return `第 ${index + 1} 个动作 targetPreset 必须是 main 或 second`;
      const prompt = normalizePromptInput(raw.prompt);
      if (typeof prompt === 'string') return `第 ${index + 1} 个动作 ${prompt}`;
      const action: Extract<AiPresetAction, { type: 'insert-prompt' }> = { type, targetPreset, prompt };
      const promptIndex = readOptionalSafeInteger(raw.index);
      if (promptIndex !== undefined) action.index = promptIndex;
      return action;
    }
    case 'update-prompt': {
      const targetPreset = readTarget(raw);
      if (!targetPreset) return `第 ${index + 1} 个动作 targetPreset 必须是 main 或 second`;
      const locator = readPromptLocator(raw);
      if (typeof locator === 'string') return `第 ${index + 1} 个动作 ${locator}`;
      const updates = normalizePromptUpdates(raw.updates);
      if (typeof updates === 'string') return `第 ${index + 1} 个动作 ${updates}`;
      return { type, targetPreset, ...locator, updates };
    }
    case 'toggle-prompt': {
      const targetPreset = readTarget(raw);
      if (!targetPreset) return `第 ${index + 1} 个动作 targetPreset 必须是 main 或 second`;
      const locator = readPromptLocator(raw);
      if (typeof locator === 'string') return `第 ${index + 1} 个动作 ${locator}`;
      if (typeof raw.enabled !== 'boolean') return `第 ${index + 1} 个动作 enabled 必须是布尔值`;
      return { type, targetPreset, ...locator, enabled: raw.enabled };
    }
    case 'move-prompt': {
      const targetPreset = readTarget(raw);
      if (!targetPreset) return `第 ${index + 1} 个动作 targetPreset 必须是 main 或 second`;
      const toIndex = readOptionalSafeInteger(raw.toIndex);
      if (toIndex === undefined) return `第 ${index + 1} 个动作 toIndex 必须是非负整数`;
      const promptId = readOptionalString(raw.promptId);
      const promptName = readOptionalString(raw.promptName);
      const fromIndex = readOptionalSafeInteger(raw.fromIndex);
      if (!promptId && !promptName && fromIndex === undefined) {
        return `第 ${index + 1} 个动作需要 promptId、promptName 或 fromIndex`;
      }
      return { type, targetPreset, promptId, promptName, fromIndex, toIndex };
    }
    case 'delete-prompt': {
      const targetPreset = readTarget(raw);
      if (!targetPreset) return `第 ${index + 1} 个动作 targetPreset 必须是 main 或 second`;
      const locator = readPromptLocator(raw);
      if (typeof locator === 'string') return `第 ${index + 1} 个动作 ${locator}`;
      return { type, targetPreset, ...locator };
    }
    case 'clear-prompts': {
      const targetPreset = readTarget(raw);
      if (!targetPreset) return `第 ${index + 1} 个动作 targetPreset 必须是 main 或 second`;
      return { type, targetPreset };
    }
    case 'reorder-prompts': {
      const targetPreset = readTarget(raw);
      if (!targetPreset) return `第 ${index + 1} 个动作 targetPreset 必须是 main 或 second`;
      const promptIds = readOptionalStringArray(raw.promptIds);
      const promptNames = readOptionalStringArray(raw.promptNames);
      if (typeof promptIds === 'string') return `第 ${index + 1} 个动作 ${promptIds}`;
      if (typeof promptNames === 'string') return `第 ${index + 1} 个动作 ${promptNames}`;
      if (!promptIds && !promptNames) return `第 ${index + 1} 个动作需要 promptIds 或 promptNames`;
      return { type, targetPreset, promptIds, promptNames };
    }
    default:
      return `不允许的动作类型: ${type || '(空)'}`;
  }
}

function normalizePromptInput(raw: unknown): AiPresetPromptInput | string {
  if (!isRecord(raw)) return 'prompt 必须是对象';

  const name = readRequiredString(raw, 'name');
  const content = readRequiredString(raw, 'content');
  if (!name) return 'prompt.name 不能为空';
  if (!content) return 'prompt.content 不能为空';

  const role = normalizeRole(raw.role);
  if (!role) return 'prompt.role 必须是 system、user 或 assistant';

  const prompt: AiPresetPromptInput = {
    name,
    role,
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : true,
    content,
  };
  const position = normalizePosition(raw.position);
  if (typeof position === 'string') return position;
  if (position) prompt.position = position;
  return prompt;
}

function normalizePromptUpdates(raw: unknown): AiPresetPromptUpdates | string {
  if (!isRecord(raw)) return 'updates 必须是对象';

  const updates: AiPresetPromptUpdates = {};
  const name = readOptionalString(raw.name);
  const content = readOptionalString(raw.content);
  const role = raw.role === undefined ? undefined : normalizeRole(raw.role);
  const position = normalizePosition(raw.position);

  if (name !== undefined) updates.name = name;
  if (content !== undefined) updates.content = content;
  if (raw.enabled !== undefined) {
    if (typeof raw.enabled !== 'boolean') return 'updates.enabled 必须是布尔值';
    updates.enabled = raw.enabled;
  }
  if (raw.role !== undefined) {
    if (!role) return 'updates.role 必须是 system、user 或 assistant';
    updates.role = role;
  }
  if (typeof position === 'string') return position;
  if (position) updates.position = position;

  return Object.keys(updates).length ? updates : 'updates 不能为空';
}

function normalizePosition(raw: unknown): AiPresetPromptPosition | undefined | string {
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) return 'position 必须是对象';
  if (raw.type === 'relative') return { type: 'relative' };
  if (raw.type !== 'in_chat') return 'position.type 必须是 relative 或 in_chat';

  const depth = readOptionalSafeInteger(raw.depth);
  const order = readOptionalSafeInteger(raw.order);
  if (depth === undefined || order === undefined) return 'in_chat position 需要非负整数 depth 和 order';
  return { type: 'in_chat', depth, order };
}

function readPromptLocator(raw: Record<string, unknown>): Pick<Extract<AiPresetAction, { type: 'update-prompt' }>, 'promptId' | 'promptName'> | string {
  const promptId = readOptionalString(raw.promptId);
  const promptName = readOptionalString(raw.promptName);
  if (!promptId && !promptName) return '需要 promptId 或 promptName';
  return { promptId, promptName };
}

function readTarget(raw: Record<string, unknown>): AiPresetTarget | null {
  return raw.targetPreset === 'main' || raw.targetPreset === 'second' ? raw.targetPreset : null;
}

function normalizeRole(value: unknown): AiPresetPromptRole | null {
  if (value === undefined) return 'system';
  return value === 'system' || value === 'user' || value === 'assistant' ? value : null;
}

function readRequiredString(raw: Record<string, unknown>, key: string): string | null {
  const value = raw[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readOptionalSafeInteger(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function readOptionalStringArray(value: unknown): string[] | undefined | string {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return 'promptIds/promptNames 必须是字符串数组';
  const items = value.map(item => typeof item === 'string' ? item.trim() : '').filter(Boolean);
  if (!items.length) return 'promptIds/promptNames 不能为空';
  if (new Set(items).size !== items.length) return 'promptIds/promptNames 不能包含重复项';
  return items;
}

function targetLabel(target: AiPresetTarget): string {
  return target === 'main' ? '主预设' : '第二预设';
}

function formatIndex(index: number | undefined) {
  return index === undefined ? '' : `到第 ${index + 1} 位`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
