import { klona } from 'klona';

type OfficialPromptRole = 'system' | 'user' | 'assistant';
type OfficialPromptPosition =
  | { type: 'relative'; depth?: never; order?: never }
  | { type: 'in_chat'; depth: number; order: number };

type OfficialCompatiblePrompt = {
  id?: string;
  identifier?: string;
  name?: string;
  enabled?: boolean;
  position?: OfficialPromptPosition;
  role?: OfficialPromptRole | string;
  content?: string;
  system_prompt?: boolean;
  marker?: boolean;
  injection_position?: number;
  injection_depth?: number;
  injection_order?: number;
  injection_trigger?: string[];
  forbid_overrides?: boolean;
  [key: string]: any;
};

type OfficialCompatibleNormalPrompt = OfficialCompatiblePrompt & {
  id: string;
  identifier: string;
  name: string;
  enabled: boolean;
  position: OfficialPromptPosition;
  role: OfficialPromptRole;
  content: string;
};

export type OfficialPromptOrderEntry = {
  identifier: string;
  enabled: boolean;
};

export type OfficialPromptImport = {
  version: number;
  type: 'full' | 'character' | string;
  prompts: OfficialCompatibleNormalPrompt[];
  promptOrder: OfficialPromptOrderEntry[];
};

export type OfficialPromptExport = {
  version: number;
  type: 'full' | 'character';
  data: {
    prompts: OfficialCompatiblePrompt[];
    prompt_order: OfficialPromptOrderEntry[];
  };
};

const OFFICIAL_EXPORT_VERSION = 1;
const DEFAULT_DEPTH = 4;
const DEFAULT_ORDER = 100;

function createPromptIdentifier() {
  return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const OFFICIAL_SYSTEM_PROMPT_NAMES: Record<string, string> = {
  main: 'Main Prompt',
  nsfw: 'Nsfw Prompt',
  jailbreak: 'Jailbreak Prompt',
  enhanceDefinitions: 'Enhance Definitions',
};

const OFFICIAL_SYSTEM_PROMPT_IDS = new Set(Object.keys(OFFICIAL_SYSTEM_PROMPT_NAMES));
const OFFICIAL_MARKER_PROMPT_IDS = new Set([
  'worldInfoBefore',
  'personaDescription',
  'charDescription',
  'charPersonality',
  'scenario',
  'worldInfoAfter',
  'dialogueExamples',
  'chatHistory',
]);

export const OFFICIAL_DEFAULT_PROMPT_ORDER: OfficialPromptOrderEntry[] = [
  { identifier: 'main', enabled: true },
  { identifier: 'worldInfoBefore', enabled: true },
  { identifier: 'personaDescription', enabled: true },
  { identifier: 'charDescription', enabled: true },
  { identifier: 'charPersonality', enabled: true },
  { identifier: 'scenario', enabled: true },
  { identifier: 'enhanceDefinitions', enabled: false },
  { identifier: 'nsfw', enabled: true },
  { identifier: 'worldInfoAfter', enabled: true },
  { identifier: 'dialogueExamples', enabled: true },
  { identifier: 'chatHistory', enabled: true },
  { identifier: 'jailbreak', enabled: true },
];

export function getOfficialPromptKey(prompt: OfficialCompatiblePrompt | null | undefined): string {
  if (!prompt) return '';
  return String((prompt as any).identifier ?? prompt.id ?? '');
}

export function isOfficialPromptKey(prompt: OfficialCompatiblePrompt, promptId: string): boolean {
  return getOfficialPromptKey(prompt) === promptId || prompt.id === promptId;
}

export function isOfficialSystemPromptKey(promptId: string): boolean {
  return OFFICIAL_SYSTEM_PROMPT_IDS.has(promptId);
}

export function isOfficialRestorableSystemPrompt(prompt: OfficialCompatiblePrompt | null | undefined): boolean {
  return Boolean(prompt && isOfficialSystemPromptKey(getOfficialPromptKey(prompt)));
}

export function getOfficialSystemPromptDefaultName(promptId: string): string {
  return OFFICIAL_SYSTEM_PROMPT_NAMES[promptId] ?? 'System Prompt';
}

export function isOfficialSystemOrMarkerPrompt(prompt: OfficialCompatiblePrompt | null | undefined): boolean {
  if (!prompt) return false;
  const key = getOfficialPromptKey(prompt);
  return Boolean(
    prompt.system_prompt
    || prompt.marker
    || OFFICIAL_SYSTEM_PROMPT_IDS.has(key)
    || OFFICIAL_MARKER_PROMPT_IDS.has(key),
  );
}

export function isOfficialPromptDeletable(prompt: OfficialCompatiblePrompt | null | undefined): boolean {
  return Boolean(prompt && !isOfficialSystemOrMarkerPrompt(prompt));
}

export function isPresetPlaceholderPrompt(prompt: OfficialCompatiblePrompt | null | undefined): boolean {
  if (!prompt) return true;
  const key = getOfficialPromptKey(prompt);
  return Boolean(prompt.marker || OFFICIAL_MARKER_PROMPT_IDS.has(key));
}

export function normalizeOfficialPrompt(prompt: OfficialCompatiblePrompt): OfficialCompatibleNormalPrompt {
  const promptKey = String(prompt.identifier ?? prompt.id ?? createPromptIdentifier());
  const normalized = {
    ...klona(prompt),
    id: String(prompt.id ?? promptKey),
    identifier: promptKey,
    name: String(prompt.name ?? 'Untitled'),
    enabled: prompt.enabled ?? true,
    position: prompt.position ?? (
      prompt.injection_position === 1
        ? {
            type: 'in_chat' as const,
            depth: prompt.injection_depth ?? DEFAULT_DEPTH,
            order: prompt.injection_order ?? DEFAULT_ORDER,
          }
        : { type: 'relative' as const }
    ),
    role: prompt.role === 'user' || prompt.role === 'assistant' ? prompt.role : 'system',
    content: String(prompt.content ?? ''),
  };
  normalized.injection_position = normalized.injection_position
    ?? (normalized.position?.type === 'in_chat' ? 1 : 0);
  normalized.injection_depth = normalized.injection_depth ?? normalized.position?.depth ?? DEFAULT_DEPTH;
  normalized.injection_order = normalized.injection_order ?? normalized.position?.order ?? DEFAULT_ORDER;
  normalized.injection_trigger = Array.isArray(normalized.injection_trigger) ? normalized.injection_trigger : [];
  normalized.forbid_overrides = Boolean(normalized.forbid_overrides);
  normalized.system_prompt = Boolean(normalized.system_prompt);
  normalized.marker = Boolean(normalized.marker);

  return normalized as OfficialCompatibleNormalPrompt;
}

export function getOfficialPromptOrder(prompts: OfficialCompatiblePrompt[]): OfficialPromptOrderEntry[] {
  return prompts.map(prompt => ({
    identifier: getOfficialPromptKey(prompt),
    enabled: prompt.enabled ?? true,
  })).filter(entry => !!entry.identifier);
}

export function normalizeOfficialPromptOrder(rawPromptOrder: unknown): OfficialPromptOrderEntry[] {
  if (!Array.isArray(rawPromptOrder)) return [];

  return rawPromptOrder
    .map(entry => {
      if (typeof entry === 'string') {
        return { identifier: entry, enabled: true };
      }
      const identifier = String(entry?.identifier ?? entry?.id ?? '');
      if (!identifier) return null;
      return {
        identifier,
        enabled: entry?.enabled ?? true,
      };
    })
    .filter((entry): entry is OfficialPromptOrderEntry => !!entry);
}

export function applyOfficialPromptOrder<T extends OfficialCompatiblePrompt>(prompts: T[], promptOrder: unknown): T[] {
  const order = normalizeOfficialPromptOrder(promptOrder);
  if (!order.length) return [...prompts];

  const byKey = new Map(prompts.map(prompt => [getOfficialPromptKey(prompt), prompt]));
  const used = new Set<string>();
  const ordered: T[] = [];

  for (const entry of order) {
    const prompt = byKey.get(entry.identifier);
    if (!prompt) continue;
    ordered.push({
      ...prompt,
      enabled: entry.enabled,
    } as T);
    used.add(entry.identifier);
  }

  for (const prompt of prompts) {
    const key = getOfficialPromptKey(prompt);
    if (!used.has(key)) ordered.push(prompt);
  }

  return ordered;
}

export function splitPromptsByOfficialOrder<T extends OfficialCompatiblePrompt>(
  prompts: T[],
  promptOrder: unknown,
): { active: T[]; unused: T[] } {
  const order = normalizeOfficialPromptOrder(promptOrder);
  if (!order.length) return { active: [...prompts], unused: [] };

  const ordered = applyOfficialPromptOrder(prompts, order);
  const activeKeys = new Set(order.map(entry => entry.identifier));

  return {
    active: ordered.filter(prompt => activeKeys.has(getOfficialPromptKey(prompt))),
    unused: ordered.filter(prompt => !activeKeys.has(getOfficialPromptKey(prompt))),
  };
}

export function readOfficialPromptImport(importData: unknown): OfficialPromptImport {
  const data = importData as any;
  const exportData = data?.data && Array.isArray(data.data.prompts) ? data.data : data;
  const rawPrompts = Array.isArray(exportData?.prompts)
    ? exportData.prompts
    : Array.isArray(data)
      ? data
      : [];

  return {
    version: Number(data?.version ?? OFFICIAL_EXPORT_VERSION),
    type: String(data?.type ?? 'full'),
    prompts: rawPrompts.map((prompt: any) => normalizeOfficialPrompt(prompt)),
    promptOrder: normalizeOfficialPromptOrder(exportData?.prompt_order),
  };
}

export function buildOfficialPromptExport(
  prompts: OfficialCompatiblePrompt[],
  type: 'full' | 'character' = 'full',
  orderedPrompts: OfficialCompatiblePrompt[] = prompts,
): OfficialPromptExport {
  const userPrompts = prompts
    .filter(prompt => !isOfficialSystemOrMarkerPrompt(prompt))
    .map(prompt => klona(prompt));

  return {
    version: OFFICIAL_EXPORT_VERSION,
    type,
    data: {
      prompts: userPrompts,
      prompt_order: getOfficialPromptOrder(orderedPrompts),
    },
  };
}

export function splitPromptsByOfficialDefaultOrder<T extends OfficialCompatiblePrompt>(prompts: T[]): { active: T[]; unused: T[] } {
  const byKey = new Map(prompts.map(prompt => [getOfficialPromptKey(prompt), prompt]));
  const used = new Set<string>();
  const active: T[] = [];

  for (const entry of OFFICIAL_DEFAULT_PROMPT_ORDER) {
    const prompt = byKey.get(entry.identifier);
    if (!prompt) continue;
    active.push({
      ...prompt,
      enabled: entry.enabled,
    } as T);
    used.add(entry.identifier);
  }

  return {
    active,
    unused: prompts.filter(prompt => !used.has(getOfficialPromptKey(prompt))),
  };
}
