export type AiApiModel = {
  id: string;
  name: string;
  group: string;
};

export type AiApiProfile = {
  id: string;
  name: string;
  group: string;
  apiUrl: string;
  key: string;
  source: string;
  models: AiApiModel[];
};

export type AiConfigShape = {
  apiUrl: string;
  key: string;
  model: string;
  source: string;
  useProxyPreset: boolean;
  proxyPreset: string;
  activeProfileId: string;
  apiProfiles: AiApiProfile[];
};

export type AiModelFlatOption = {
  value: string;
  label: string;
  name: string;
  group: string;
  profileId: string;
  profileName: string;
};

export type AiCustomApiConfig = {
  proxy_preset?: string;
  apiurl?: string;
  key?: string;
  model?: string;
  source?: string;
};

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function normalizeModel(model: Partial<AiApiModel> | string, fallbackGroup: string): AiApiModel | null {
  const name = typeof model === 'string' ? model.trim() : asString(model.name).trim();
  if (!name) return null;
  const group = typeof model === 'string' ? fallbackGroup : asString(model.group, fallbackGroup).trim() || fallbackGroup;
  return {
    id: typeof model === 'string' ? createId('model') : asString(model.id) || createId('model'),
    name,
    group,
  };
}

function normalizeProfile(profile: Partial<AiApiProfile>, index: number): AiApiProfile {
  const group = asString(profile.group, '默认').trim() || '默认';
  const models = Array.isArray(profile.models)
    ? profile.models
      .map(model => normalizeModel(model as Partial<AiApiModel> | string, group))
      .filter((model): model is AiApiModel => Boolean(model))
    : [];

  return {
    id: asString(profile.id) || createId('api'),
    name: asString(profile.name, `API ${index + 1}`).trim() || `API ${index + 1}`,
    group,
    apiUrl: asString(profile.apiUrl).trim(),
    key: asString(profile.key),
    source: asString(profile.source, 'openai').trim() || 'openai',
    models,
  };
}

export function createAiApiProfile(input: Partial<AiApiProfile> = {}): AiApiProfile {
  return normalizeProfile({
    id: input.id || createId('api'),
    name: input.name || '新 API',
    group: input.group || '默认',
    apiUrl: input.apiUrl || '',
    key: input.key || '',
    source: input.source || 'openai',
    models: input.models || [],
  }, 0);
}

export function addModelToProfile(profile: AiApiProfile, name: string, group = profile.group) {
  const normalizedName = name.trim();
  if (!normalizedName) return null;
  const normalizedGroup = group.trim() || profile.group || '默认';
  const existing = profile.models.find(model => model.name === normalizedName && model.group === normalizedGroup);
  if (existing) return existing;
  const model = { id: createId('model'), name: normalizedName, group: normalizedGroup };
  profile.models.push(model);
  return model;
}

function createLegacyProfile(raw: Partial<AiConfigShape>) {
  const hasEndpoint = Boolean(asString(raw.apiUrl).trim() || asString(raw.key).trim() || asString(raw.source, 'openai').trim());
  if (!hasEndpoint) return null;
  const profile = createAiApiProfile({
    name: '默认 API',
    group: '默认',
    apiUrl: asString(raw.apiUrl).trim(),
    key: asString(raw.key),
    source: asString(raw.source, 'openai').trim() || 'openai',
  });
  if (asString(raw.model).trim()) addModelToProfile(profile, asString(raw.model).trim(), profile.group);
  return profile;
}

export function normalizeAiConfig(raw: Partial<AiConfigShape> | null | undefined): AiConfigShape {
  const source = raw ?? {};
  const profiles = Array.isArray(source.apiProfiles)
    ? source.apiProfiles.map((profile, index) => normalizeProfile(profile, index))
    : [];
  const legacyProfile = profiles.length > 0 ? null : createLegacyProfile(source);
  const apiProfiles = legacyProfile ? [legacyProfile] : profiles;
  const activeProfileId = apiProfiles.some(profile => profile.id === source.activeProfileId)
    ? asString(source.activeProfileId)
    : apiProfiles[0]?.id ?? '';

  return {
    apiUrl: asString(source.apiUrl),
    key: asString(source.key),
    model: asString(source.model),
    source: asString(source.source, 'openai') || 'openai',
    useProxyPreset: Boolean(source.useProxyPreset),
    proxyPreset: asString(source.proxyPreset),
    activeProfileId,
    apiProfiles,
  };
}

export function getActiveAiApiProfile(config: Pick<AiConfigShape, 'activeProfileId' | 'apiProfiles'>) {
  return config.apiProfiles.find(profile => profile.id === config.activeProfileId) ?? config.apiProfiles[0] ?? null;
}

export function flattenAiModelOptions(profiles: AiApiProfile[]): AiModelFlatOption[] {
  return profiles.flatMap(profile => profile.models.map(model => ({
    value: model.name,
    label: `${model.name} ${model.group}`,
    name: model.name,
    group: model.group,
    profileId: profile.id,
    profileName: profile.name,
  })));
}

export function buildAiCustomApi(config: Pick<AiConfigShape, 'apiProfiles' | 'activeProfileId' | 'useProxyPreset' | 'proxyPreset' | 'model'>): AiCustomApiConfig {
  const customApi: AiCustomApiConfig = {};
  const model = config.model.trim();
  if (config.useProxyPreset && config.proxyPreset.trim()) {
    customApi.proxy_preset = config.proxyPreset.trim();
  } else {
    const profile = getActiveAiApiProfile(config);
    if (profile?.apiUrl.trim()) customApi.apiurl = profile.apiUrl.trim();
    if (profile?.key) customApi.key = profile.key;
    if (profile?.source.trim()) customApi.source = profile.source.trim();
  }
  if (model) customApi.model = model;
  return customApi;
}
