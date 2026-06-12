import { z } from 'zod';

const unknownRecordSchema = z.looseObject({});

const promptSchema = unknownRecordSchema
  .refine(value => typeof value.id === 'string' || typeof value.identifier === 'string' || typeof value.name === 'string')

const aiModelSchema = z.union([
  z.string().min(1),
  z.looseObject({
    id: z.string().optional(),
    name: z.string().min(1),
    group: z.string().optional(),
  }),
]);

const aiApiProfileSchema = z.looseObject({
  id: z.string().optional().catch(undefined),
  name: z.string().optional().catch(undefined),
  group: z.string().optional().catch(undefined),
  apiUrl: z.string().optional().catch(undefined),
  key: z.string().optional().catch(undefined),
  source: z.string().optional().catch(undefined),
  models: z.array(z.unknown()).catch([]).transform(items => parseArrayItems(aiModelSchema, items)),
});

const aiConfigSchema = z.object({
  apiUrl: z.string().optional().catch(undefined),
  key: z.string().optional().catch(undefined),
  model: z.string().optional().catch(undefined),
  source: z.string().optional().catch(undefined),
  useProxyPreset: z.boolean().optional().catch(undefined),
  proxyPreset: z.string().optional().catch(undefined),
  activeProfileId: z.string().optional().catch(undefined),
  apiProfiles: z.array(z.unknown()).catch([]).transform(items => parseArrayItems(aiApiProfileSchema, items)),
}).partial().catch({});

const favoriteFolderSchema = z.object({
  id: z.string().min(1),
  name: z.string().catch('收藏夹'),
  collapsed: z.boolean().catch(false),
  items: z.array(z.unknown()).catch([]).transform(items => parseArrayItems(promptSchema, items)),
});

const snapshotSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  presetName: z.string().min(1),
  preset: unknownRecordSchema,
  timestamp: z.number().catch(() => Date.now()),
  auto: z.boolean().catch(false),
});

const presetOrderItemSchema = z.string().min(1);

export type ParsedAiConfig = z.infer<typeof aiConfigSchema>;
export type ParsedFavoriteFolder = z.infer<typeof favoriteFolderSchema>;
export type ParsedSnapshot = z.infer<typeof snapshotSchema>;

function parseArrayItems<T>(schema: z.ZodType<T>, value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  const parsed: T[] = [];
  for (const item of value) {
    const result = schema.safeParse(item);
    if (result.success) parsed.push(result.data);
  }
  return parsed;
}

export function parsePresetManagerAiConfig(value: unknown): ParsedAiConfig {
  return aiConfigSchema.parse(value);
}

export function parsePresetManagerFavorites(value: unknown): ParsedFavoriteFolder[] {
  return parseArrayItems(favoriteFolderSchema, value);
}

export function parsePresetManagerSnapshots(value: unknown): ParsedSnapshot[] {
  return parseArrayItems(snapshotSchema, value);
}

export function parsePresetManagerPresetOrder(value: unknown): string[] {
  return [...new Set(parseArrayItems(presetOrderItemSchema, value))];
}

export function parsePresetManagerPromptLocks(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, locked]) => Boolean(key) && locked === true),
  ) as Record<string, boolean>;
}
