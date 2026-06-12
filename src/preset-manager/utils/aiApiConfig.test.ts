declare const require: any;

const {
  addModelToProfile,
  addModelsToProfile,
  buildAiCustomApi,
  createAiApiProfile,
  flattenAiModelOptions,
  getActiveAiApiProfile,
  normalizeAiConfig,
  applyTavernApiProfileSnapshot,
  readTavernApiProfileSnapshot,
  TAVERN_API_PROFILE_ID,
} = require('./aiApiConfig');

function expectEqual<T>(actual: T, expected: T) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function expectIncludes(content: string, expected: string) {
  if (!content.includes(expected)) {
    throw new Error(`Expected ${JSON.stringify(content)} to include ${JSON.stringify(expected)}`);
  }
}

const migrated = normalizeAiConfig({
  apiUrl: 'https://api.example.com/v1',
  key: 'sk-test',
  source: 'openai',
  model: 'gpt-test',
  useProxyPreset: false,
  proxyPreset: '',
});

expectEqual(migrated.apiProfiles.length, 2);
expectEqual(migrated.apiProfiles[0].id, TAVERN_API_PROFILE_ID);
expectEqual(migrated.apiProfiles[1].apiUrl, 'https://api.example.com/v1');
expectEqual(migrated.apiProfiles[1].key, 'sk-test');
expectEqual(migrated.apiProfiles[1].source, 'openai');
expectEqual(migrated.apiProfiles[1].models[0].name, 'gpt-test');
expectEqual(getActiveAiApiProfile(migrated)?.id, migrated.activeProfileId);
expectEqual(getActiveAiApiProfile(migrated)?.apiUrl, 'https://api.example.com/v1');

const defaultConfig = normalizeAiConfig(null);
expectEqual(defaultConfig.apiProfiles.length, 1);
expectEqual(defaultConfig.apiProfiles[0].id, TAVERN_API_PROFILE_ID);
expectEqual(defaultConfig.apiProfiles[0].name, '酒馆 API');
expectEqual(defaultConfig.activeProfileId, TAVERN_API_PROFILE_ID);

const tavernSnapshot = readTavernApiProfileSnapshot({
  chatCompletionSettings: {
    chat_completion_source: 'custom',
    custom_url: 'https://custom.example.com/v1',
    custom_model: 'custom-model',
    proxy_password: 'proxy-pass',
  },
  getChatCompletionModel: () => 'custom-model',
});
expectEqual(tavernSnapshot, {
  apiUrl: 'https://custom.example.com/v1',
  key: 'proxy-pass',
  source: 'custom',
  model: 'custom-model',
});
expectEqual(applyTavernApiProfileSnapshot(defaultConfig, tavernSnapshot), true);
expectEqual(defaultConfig.apiProfiles[0].apiUrl, 'https://custom.example.com/v1');
expectEqual(defaultConfig.apiProfiles[0].key, 'proxy-pass');
expectEqual(defaultConfig.apiProfiles[0].source, 'custom');
expectEqual(defaultConfig.model, 'custom-model');

const customOnlyConfig = normalizeAiConfig({
  apiProfiles: [
    createAiApiProfile({
      id: 'custom_profile',
      name: 'Custom API',
      apiUrl: 'https://custom-only.example.com',
      key: 'sk-custom-only',
      source: 'openai',
    }),
  ],
  activeProfileId: 'custom_profile',
});
expectEqual(customOnlyConfig.apiProfiles.some((item: any) => item.id === TAVERN_API_PROFILE_ID), true);
expectEqual(customOnlyConfig.activeProfileId, 'custom_profile');
expectEqual(
  applyTavernApiProfileSnapshot(customOnlyConfig, {
    apiUrl: 'https://synced.example.com',
    key: 'synced-key',
    source: 'custom',
    model: 'synced-model',
  }),
  true,
);
expectEqual(customOnlyConfig.apiProfiles[0].id, TAVERN_API_PROFILE_ID);
expectEqual(customOnlyConfig.apiProfiles[0].apiUrl, 'https://synced.example.com');
expectEqual(customOnlyConfig.activeProfileId, 'custom_profile');

const profile = createAiApiProfile({
  name: '中转站',
  group: 'OpenAI',
  apiUrl: 'https://proxy.example.com',
  key: 'sk-proxy',
  source: 'openai',
});
addModelToProfile(profile, 'gpt-4.1', '旗舰');
addModelToProfile(profile, 'gpt-4.1', '旗舰');
addModelToProfile(profile, 'deepseek-chat', 'DeepSeek');
expectEqual(profile.models.length, 2);

const flat = flattenAiModelOptions([profile]);
expectEqual(flat.map((item: any) => `${item.name}:${item.group}`), ['gpt-4.1:旗舰', 'deepseek-chat:DeepSeek']);
expectIncludes(flat[0].label, 'gpt-4.1');
expectIncludes(flat[0].label, '旗舰');

const selectedModelConfig = normalizeAiConfig({
  apiProfiles: [profile],
  activeProfileId: profile.id,
  model: 'gpt-5.5',
});
const selectedProfile = getActiveAiApiProfile(selectedModelConfig)!;
addModelsToProfile(selectedProfile, ['gpt-5.4', 'gpt-5.5'], selectedProfile.group);
expectEqual(selectedModelConfig.model, 'gpt-5.5');

const customApi = buildAiCustomApi({
  ...migrated,
  activeProfileId: profile.id,
  apiProfiles: [profile],
  model: 'deepseek-chat',
});
expectEqual(customApi, {
  apiurl: 'https://proxy.example.com',
  key: 'sk-proxy',
  source: 'openai',
  model: 'deepseek-chat',
});

const proxyApi = buildAiCustomApi({
  ...migrated,
  useProxyPreset: true,
  proxyPreset: '酒馆代理',
  model: 'claude-test',
});
expectEqual(proxyApi, {
  proxy_preset: '酒馆代理',
  model: 'claude-test',
});

const tavernApi = buildAiCustomApi({
  ...defaultConfig,
  activeProfileId: TAVERN_API_PROFILE_ID,
  model: 'custom-model',
});
expectEqual(tavernApi, { model: 'custom-model' });

console.info('aiApiConfig tests passed');
