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

export const TAVERN_API_PROFILE_ID = 'tavern_api_profile';
const TAVERN_API_PROFILE_NAME = '酒馆 API';
const TAVERN_API_PROFILE_GROUP = '酒馆';

export type TavernApiProfileSnapshot = {
  apiUrl: string;
  key: string;
  source: string;
  model: string;
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

export function addModelsToProfile(profile: AiApiProfile, names: string[], group = profile.group) {
  return names
    .map(name => addModelToProfile(profile, name, group))
    .filter((model): model is AiApiModel => Boolean(model));
}

export function createTavernApiProfile(snapshot: Partial<TavernApiProfileSnapshot> = {}): AiApiProfile {
  const profile = createAiApiProfile({
    id: TAVERN_API_PROFILE_ID,
    name: TAVERN_API_PROFILE_NAME,
    group: TAVERN_API_PROFILE_GROUP,
    apiUrl: snapshot.apiUrl || '',
    key: snapshot.key || '',
    source: snapshot.source || 'openai',
  });
  if (snapshot.model) addModelToProfile(profile, snapshot.model, TAVERN_API_PROFILE_GROUP);
  return profile;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const text = asString(value).trim();
    if (text) return text;
  }
  return '';
}

function getRuntimeTavernContext() {
  try {
    return (globalThis as any).SillyTavern?.getContext?.() ?? null;
  } catch {
    return null;
  }
}

function callString(fn: (() => unknown) | undefined) {
  if (!fn) return '';
  try {
    return asString(fn()).trim();
  } catch {
    return '';
  }
}

function readChatModelBySource(settings: Record<string, any>, source: string) {
  const modelBySource: Record<string, string[]> = {
    claude: ['claude_model'],
    openai: ['openai_model'],
    makersuite: ['google_model'],
    google: ['google_model'],
    vertexai: ['vertexai_model'],
    openrouter: ['openrouter_model'],
    ai21: ['ai21_model'],
    mistralai: ['mistralai_model'],
    custom: ['custom_model'],
    cohere: ['cohere_model'],
    perplexity: ['perplexity_model'],
    groq: ['groq_model'],
    siliconflow: ['siliconflow_model'],
    electronhub: ['electronhub_model'],
    chutes: ['chutes_model'],
    nanogpt: ['nanogpt_model'],
    deepseek: ['deepseek_model'],
    aimlapi: ['aimlapi_model'],
    xai: ['xai_model'],
    pollinations: ['pollinations_model'],
    cometapi: ['cometapi_model'],
    moonshot: ['moonshot_model'],
    fireworks: ['fireworks_model'],
    azure_openai: ['azure_openai_model'],
    zai: ['zai_model'],
  };
  return firstString(...(modelBySource[source] || []).map(key => settings[key]));
}

function readTextCompletionModel(settings: Record<string, any>) {
  return firstString(
    settings.custom_model,
    settings.generic_model,
    settings.mancer_model,
    settings.togetherai_model,
    settings.infermaticai_model,
    settings.dreamgen_model,
    settings.openrouter_model,
    settings.vllm_model,
    settings.aphrodite_model,
    settings.ollama_model,
    settings.featherless_model,
    settings.tabby_model,
    settings.llamacpp_model,
  );
}

export function readTavernApiProfileSnapshot(context?: any): TavernApiProfileSnapshot | null {
  const ctx = context ?? getRuntimeTavernContext();
  if (!ctx || typeof ctx !== 'object') return null;

  const chatSettings = (ctx.chatCompletionSettings ?? ctx.oai_settings ?? ctx.oaiSettings ?? {}) as Record<string, any>;
  const textSettings = (
    ctx.textCompletionSettings ??
    ctx.textgenerationwebui_settings ??
    ctx.textCompletionSettings ??
    {}
  ) as Record<string, any>;
  const runtimeMainApi = firstString((globalThis as any).main_api, ctx.main_api, ctx.mainApi);

  if (runtimeMainApi === 'textgenerationwebui' && textSettings && Object.keys(textSettings).length) {
    const source = firstString(textSettings.type, 'textgenerationwebui');
    return {
      apiUrl: firstString(
        callString(() => ctx.getTextGenServer?.(source)),
        textSettings.server_urls?.[source],
        textSettings.api_server,
      ),
      key: firstString(textSettings.key, textSettings.api_key, textSettings.apiKey),
      source,
      model: readTextCompletionModel(textSettings),
    };
  }

  if (!chatSettings || !Object.keys(chatSettings).length) return null;
  const source = firstString(chatSettings.chat_completion_source, chatSettings.source, 'openai');
  const model = firstString(
    callString(() => ctx.getChatCompletionModel?.(chatSettings)),
    callString(() => ctx.getChatCompletionModel?.()),
    readChatModelBySource(chatSettings, source),
  );

  return {
    apiUrl: firstString(
      chatSettings.reverse_proxy,
      chatSettings.custom_url,
      chatSettings.azure_base_url,
      chatSettings.zai_endpoint,
      chatSettings.apiUrl,
      chatSettings.api_url,
    ),
    key: firstString(
      chatSettings.proxy_password,
      chatSettings.key,
      chatSettings.api_key,
      chatSettings.apiKey,
      chatSettings.custom_api_key,
    ),
    source,
    model,
  };
}

function createLegacyProfile(raw: Partial<AiConfigShape>) {
  const hasEndpoint = Boolean(
    asString(raw.apiUrl).trim() ||
    asString(raw.key).trim() ||
    asString(raw.model).trim() ||
    asString(raw.source).trim()
  );
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

function ensureTavernApiProfile(profiles: AiApiProfile[], snapshot?: Partial<TavernApiProfileSnapshot>) {
  const existingIndex = profiles.findIndex(profile => profile.id === TAVERN_API_PROFILE_ID);
  if (existingIndex < 0) return [createTavernApiProfile(snapshot), ...profiles];
  if (existingIndex === 0) return profiles;

  const nextProfiles = profiles.slice();
  const [tavernProfile] = nextProfiles.splice(existingIndex, 1);
  nextProfiles.unshift(tavernProfile);
  return nextProfiles;
}

export function normalizeAiConfig(raw: Partial<AiConfigShape> | null | undefined): AiConfigShape {
  const source = raw ?? {};
  const profiles = Array.isArray(source.apiProfiles)
    ? source.apiProfiles.map((profile, index) => normalizeProfile(profile, index))
    : [];
  const legacyProfile = profiles.length > 0 ? null : createLegacyProfile(source);
  const userProfiles = legacyProfile ? [legacyProfile] : profiles;
  const apiProfiles = ensureTavernApiProfile(userProfiles);
  const requestedActiveProfileId = asString(source.activeProfileId);
  const fallbackActiveProfileId = legacyProfile?.id || profiles[0]?.id || TAVERN_API_PROFILE_ID;
  const activeProfileId = apiProfiles.some(profile => profile.id === requestedActiveProfileId)
    ? requestedActiveProfileId
    : apiProfiles.some(profile => profile.id === fallbackActiveProfileId)
      ? fallbackActiveProfileId
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

export function applyTavernApiProfileSnapshot(config: AiConfigShape, snapshot: TavernApiProfileSnapshot | null): boolean {
  let changed = false;
  let profile = config.apiProfiles.find(item => item.id === TAVERN_API_PROFILE_ID);

  if (!profile) {
    profile = createTavernApiProfile(snapshot ?? {});
    config.apiProfiles.unshift(profile);
    if (!config.activeProfileId) config.activeProfileId = profile.id;
    changed = true;
  } else {
    const currentIndex = config.apiProfiles.findIndex(item => item.id === TAVERN_API_PROFILE_ID);
    if (currentIndex > 0) {
      config.apiProfiles.splice(currentIndex, 1);
      config.apiProfiles.unshift(profile);
      changed = true;
    }
  }

  if (!config.activeProfileId) {
    config.activeProfileId = profile.id;
    changed = true;
  }

  if (!profile || !snapshot) return changed;

  const nextFields: Partial<AiApiProfile> = {
    name: TAVERN_API_PROFILE_NAME,
    group: TAVERN_API_PROFILE_GROUP,
    apiUrl: snapshot.apiUrl,
    key: snapshot.key,
    source: snapshot.source || 'openai',
  };

  for (const [key, value] of Object.entries(nextFields) as Array<[keyof AiApiProfile, string]>) {
    if (profile[key] !== value) {
      (profile[key] as string) = value;
      changed = true;
    }
  }

  if (snapshot.model) {
    const modelCount = profile.models.length;
    addModelToProfile(profile, snapshot.model, TAVERN_API_PROFILE_GROUP);
    changed = profile.models.length !== modelCount || changed;
    if (config.activeProfileId === TAVERN_API_PROFILE_ID && config.model !== snapshot.model) {
      config.model = snapshot.model;
      changed = true;
    }
  }

  return changed;
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
    if (profile?.id !== TAVERN_API_PROFILE_ID) {
      if (profile?.apiUrl.trim()) customApi.apiurl = profile.apiUrl.trim();
      if (profile?.key) customApi.key = profile.key;
      if (profile?.source.trim()) customApi.source = profile.source.trim();
    }
  }
  if (model) customApi.model = model;
  return customApi;
}
