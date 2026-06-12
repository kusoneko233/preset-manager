declare const require: any;

const {
  applyOfficialPromptOrder,
  buildOfficialPromptExport,
  getOfficialPromptOrder,
  isOfficialPromptDeletable,
  isPresetPlaceholderPrompt,
  readOfficialPromptImport,
  splitPromptsByOfficialDefaultOrder,
  splitPromptsByOfficialOrder,
} = require('./officialPromptManager');

function expectEqual<T>(actual: T, expected: T) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const prompts = [
  { id: 'local-a', identifier: 'a', name: 'A', enabled: true, role: 'system', content: 'A' },
  { id: 'local-b', identifier: 'b', name: 'B', enabled: true, role: 'system', content: 'B' },
  { id: 'local-c', identifier: 'c', name: 'C', enabled: true, role: 'system', content: 'C' },
];

expectEqual(getOfficialPromptOrder(prompts), [
  { identifier: 'a', enabled: true },
  { identifier: 'b', enabled: true },
  { identifier: 'c', enabled: true },
]);

const ordered = applyOfficialPromptOrder(prompts, [
  { identifier: 'b', enabled: false },
  { identifier: 'a', enabled: true },
]);
expectEqual(ordered.map((prompt: any) => [prompt.identifier, prompt.enabled]), [
  ['b', false],
  ['a', true],
  ['c', true],
]);

const exportData = buildOfficialPromptExport([
  ...prompts,
  { id: 'main', identifier: 'main', name: 'Main', system_prompt: true, enabled: true },
  { id: 'chatHistory', identifier: 'chatHistory', name: 'Chat History', marker: true, enabled: true },
]);
expectEqual(exportData.type, 'full');
expectEqual(exportData.data.prompt_order, [
  { identifier: 'a', enabled: true },
  { identifier: 'b', enabled: true },
  { identifier: 'c', enabled: true },
  { identifier: 'main', enabled: true },
  { identifier: 'chatHistory', enabled: true },
]);
expectEqual(exportData.data.prompts.map((prompt: any) => prompt.identifier), ['a', 'b', 'c']);

const importData = readOfficialPromptImport({
  version: 1,
  type: 'character',
  data: {
    prompts: [{ identifier: 'imported', name: 'Imported', content: 'content' }],
    prompt_order: [{ identifier: 'imported', enabled: false }],
  },
});
expectEqual(importData.type, 'character');
expectEqual(importData.promptOrder, [{ identifier: 'imported', enabled: false }]);

expectEqual(isOfficialPromptDeletable({ id: 'custom', identifier: 'custom' }), true);
expectEqual(isOfficialPromptDeletable({ id: 'main', identifier: 'main', system_prompt: true }), false);
expectEqual(isOfficialPromptDeletable({ id: 'worldInfoBefore', identifier: 'worldInfoBefore', marker: true }), false);
expectEqual(isPresetPlaceholderPrompt({ id: 'main', identifier: 'main', system_prompt: true }), false);
expectEqual(isPresetPlaceholderPrompt({ id: 'worldInfoBefore', identifier: 'worldInfoBefore', marker: true }), true);
expectEqual(isPresetPlaceholderPrompt({ id: 'custom', identifier: 'custom', marker: false }), false);

const splitByImport = splitPromptsByOfficialOrder(prompts, [{ identifier: 'c', enabled: false }]);
expectEqual(splitByImport.active.map((prompt: any) => [prompt.identifier, prompt.enabled]), [['c', false]]);
expectEqual(splitByImport.unused.map((prompt: any) => prompt.identifier), ['a', 'b']);

const splitDefault = splitPromptsByOfficialDefaultOrder([
  { id: 'custom', identifier: 'custom', name: 'Custom', enabled: true },
  { id: 'main', identifier: 'main', name: 'Main', enabled: false },
  { id: 'jailbreak', identifier: 'jailbreak', name: 'Jailbreak', enabled: false },
]);
expectEqual(splitDefault.active.map((prompt: any) => [prompt.identifier, prompt.enabled]), [
  ['main', true],
  ['jailbreak', true],
]);
expectEqual(splitDefault.unused.map((prompt: any) => prompt.identifier), ['custom']);

console.info('officialPromptManager tests passed');
