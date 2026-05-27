declare const require: any;

const {
  addModelToProfile,
  buildAiCustomApi,
  createAiApiProfile,
  flattenAiModelOptions,
  getActiveAiApiProfile,
  normalizeAiConfig,
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

expectEqual(migrated.apiProfiles.length, 1);
expectEqual(migrated.apiProfiles[0].apiUrl, 'https://api.example.com/v1');
expectEqual(migrated.apiProfiles[0].key, 'sk-test');
expectEqual(migrated.apiProfiles[0].source, 'openai');
expectEqual(migrated.apiProfiles[0].models[0].name, 'gpt-test');
expectEqual(getActiveAiApiProfile(migrated)?.id, migrated.activeProfileId);

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

console.info('aiApiConfig tests passed');
