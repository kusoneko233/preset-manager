declare const require: any;

const {
  parsePresetManagerAiConfig,
  parsePresetManagerFavorites,
  parsePresetManagerPromptLocks,
  parsePresetManagerSnapshots,
} = require('./scriptVariableSchemas');

function expectEqual<T>(actual: T, expected: T) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const aiConfig = parsePresetManagerAiConfig({
  apiUrl: 'https://example.test/v1',
  key: 123,
  model: 'gpt-test',
  useProxyPreset: 'yes',
  apiProfiles: [
    {
      id: 'api-a',
      name: 'OpenAI',
      group: '默认',
      apiUrl: 'https://api.test/v1',
      key: 'secret',
      source: 'openai',
      models: ['gpt-5', { id: 'model-a', name: 'claude', group: 'anthropic' }, { bad: true }],
    },
  ],
});

expectEqual(aiConfig?.key, undefined);
expectEqual(aiConfig?.useProxyPreset, undefined);
expectEqual(aiConfig?.apiProfiles?.[0]?.models?.map((model: any) => typeof model === 'string' ? model : model.name), ['gpt-5', 'claude']);

const favorites = parsePresetManagerFavorites([
  {
    id: 'fav-a',
    name: '常用',
    collapsed: true,
    items: [
      { id: 'p1', identifier: 'p1', name: '世界观', role: 'system', content: 'abc', enabled: true },
      null,
      { bad: true },
    ],
  },
  'bad-folder',
]);

expectEqual(favorites.length, 1);
expectEqual(favorites[0].items.length, 1);
expectEqual(favorites[0].items[0].name, '世界观');

const snapshots = parsePresetManagerSnapshots([
  {
    id: 'snap-a',
    name: '自动备份',
    presetName: '主预设',
    timestamp: 1000,
    auto: true,
    preset: { prompts: [{ identifier: 'p1', name: '条目' }] },
  },
  { id: 'bad', presetName: '', preset: null },
]);

expectEqual(snapshots.length, 1);
expectEqual(snapshots[0].id, 'snap-a');

expectEqual(parsePresetManagerPromptLocks({ 'Main::p1': true, 'Main::p2': false, bad: 'yes' }), { 'Main::p1': true });

console.info('scriptVariableSchemas tests passed');
