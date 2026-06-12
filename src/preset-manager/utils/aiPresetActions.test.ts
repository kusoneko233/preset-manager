declare const require: any;

const {
  buildAiActionSystemPrompt,
  buildAiPresetActionPreviewItems,
  parseAiPresetActionResponse,
  stripAiActionBlocks,
  summarizeAiPresetAction,
} = require('./aiPresetActions');

function expectEqual<T>(actual: T, expected: T) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function expectIncludes(actual: string, expected: string) {
  if (!actual.includes(expected)) {
    throw new Error(`Expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}

function expectTrue(value: boolean, message: string) {
  if (!value) throw new Error(message);
}

const responseWithAction = `
我会先新增一个文风锚点，确认后才会写入。

\`\`\`preset-manager-action
{
  "summary": "新增文风锚点",
  "actions": [
    {
      "type": "insert-prompt",
      "targetPreset": "main",
      "index": 2,
      "prompt": {
        "name": "文风锚点",
        "role": "system",
        "enabled": true,
        "content": "保持克制、具体、可感知的叙事。"
      }
    }
  ]
}
\`\`\`
`;

const parsed = parseAiPresetActionResponse(responseWithAction);
expectEqual(parsed.errors, []);
expectEqual(parsed.plan?.summary, '新增文风锚点');
expectEqual(parsed.plan?.actions.length, 1);
expectEqual(parsed.plan?.actions[0].type, 'insert-prompt');
expectEqual(parsed.plan?.actions[0].targetPreset, 'main');
expectIncludes(summarizeAiPresetAction(parsed.plan!.actions[0]), '插入条目');
expectIncludes(summarizeAiPresetAction(parsed.plan!.actions[0]), '文风锚点');

const previewItems = buildAiPresetActionPreviewItems(parsed.plan!.actions, {
  isPromptLocked: ({ promptName }: any) => promptName === '锁定条目',
});
expectEqual(previewItems[0].skipped, false);
expectIncludes(previewItems[0].summary, '插入条目');

const lockedPreviewItems = buildAiPresetActionPreviewItems([
  {
    type: 'update-prompt',
    targetPreset: 'main',
    promptName: '锁定条目',
    updates: { content: 'new' },
  },
  {
    type: 'toggle-prompt',
    targetPreset: 'main',
    promptName: '普通条目',
    enabled: false,
  },
], {
  isPromptLocked: ({ promptName }: any) => promptName === '锁定条目',
});
expectEqual(lockedPreviewItems.map((item: any) => [item.skipped, item.reason]), [
  [true, '锁定条目会跳过'],
  [false, undefined],
]);
expectIncludes(lockedPreviewItems[0].summary, '跳过');
expectIncludes(lockedPreviewItems[0].summary, '锁定');

const stripped = stripAiActionBlocks(responseWithAction);
expectIncludes(stripped, '我会先新增一个文风锚点');
expectTrue(!stripped.includes('preset-manager-action'), 'Action block should be stripped from visible chat text');

const noAction = parseAiPresetActionResponse('只是普通建议，不包含动作。');
expectEqual(noAction.plan, null);
expectEqual(noAction.errors, []);

const multipleBlocks = parseAiPresetActionResponse(`
\`\`\`preset-manager-action
{ "summary": "第一段", "actions": [{ "type": "clear-prompts", "targetPreset": "main" }] }
\`\`\`
\`\`\`preset-manager-action
{ "summary": "第二段", "actions": [{ "type": "clear-prompts", "targetPreset": "second" }] }
\`\`\`
`);
expectEqual(multipleBlocks.plan, null);
expectIncludes(multipleBlocks.errors[0], '一次回复只能包含一个');

const malformedBlock = parseAiPresetActionResponse(`
\`\`\`preset-manager-action
{ "summary": "坏 JSON", "actions": [
\`\`\`
`);
expectEqual(malformedBlock.plan, null);
expectIncludes(malformedBlock.errors[0], '动作 JSON 解析失败');

const repairedJsonBlock = parseAiPresetActionResponse(`
确认后我会把文风锚点移动到最前面。

\`\`\`preset-manager-action
{
  "summary": "移动文风锚点",
  "actions": [
    {
      "type": "move-prompt",
      "targetPreset": "main",
      "promptName": "文风锚点",
      "toIndex": 0,
    },
  ],
}
\`\`\`
`);
expectEqual(repairedJsonBlock.errors, []);
expectEqual(repairedJsonBlock.plan?.actions[0].type, 'move-prompt');
expectEqual((repairedJsonBlock.plan?.actions[0] as any).promptName, '文风锚点');

const highRisk = parseAiPresetActionResponse(`
\`\`\`preset-manager-action
{
  "summary": "整理旧条目",
  "actions": [
    { "type": "delete-prompt", "targetPreset": "main", "promptId": "abc" },
    { "type": "clear-prompts", "targetPreset": "second" },
    { "type": "reorder-prompts", "targetPreset": "main", "promptNames": ["开场", "设定", "文风"] }
  ]
}
\`\`\`
`);
expectEqual(highRisk.errors, []);
expectEqual(highRisk.plan?.actions.map((action: any) => action.type), ['delete-prompt', 'clear-prompts', 'reorder-prompts']);
expectIncludes(summarizeAiPresetAction(highRisk.plan!.actions[0]), '删除');
expectIncludes(summarizeAiPresetAction(highRisk.plan!.actions[1]), '清空');
expectIncludes(summarizeAiPresetAction(highRisk.plan!.actions[2]), '重排');

const systemPrompt = buildAiActionSystemPrompt();
expectIncludes(systemPrompt, 'preset-manager-action');
expectIncludes(systemPrompt, '必须等待用户确认');
expectIncludes(systemPrompt, 'delete-prompt');
expectIncludes(systemPrompt, 'clear-prompts');
expectIncludes(systemPrompt, 'reorder-prompts');
expectIncludes(systemPrompt, '锁定条目');
expectIncludes(systemPrompt, 'switch-main-preset');
expectIncludes(systemPrompt, 'insert-prompt');

console.info('aiPresetActions tests passed');
