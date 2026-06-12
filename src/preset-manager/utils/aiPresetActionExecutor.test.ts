declare const require: any;

const { executeAiPresetActionPlan } = require('./aiPresetActionExecutor');

function expectEqual<T>(actual: T, expected: T) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function expectTrue(value: boolean, message: string) {
  if (!value) throw new Error(message);
}

type FakePrompt = {
  id: string;
  identifier?: string;
  name: string;
  enabled: boolean;
  role: 'system' | 'user' | 'assistant';
  content: string;
  position?: { type: 'relative' };
};

type FakePreset = {
  prompts: FakePrompt[];
  prompts_unused: FakePrompt[];
};

const calls: string[] = [];
const presetData: Record<string, FakePreset> = {
  Main: {
    prompts: [
      { id: 'p1', identifier: 'p1', name: '旧条目', enabled: true, role: 'system', content: 'old' },
      { id: 'p2', identifier: 'p2', name: '移动条目', enabled: true, role: 'system', content: 'move' },
    ],
    prompts_unused: [],
  },
  Second: {
    prompts: [{ id: 's1', identifier: 's1', name: '第二条目', enabled: true, role: 'system', content: 'second' }],
    prompts_unused: [],
  },
};

(globalThis as any).klona = (value: any) => JSON.parse(JSON.stringify(value));
(globalThis as any).getPreset = (name: string) => JSON.parse(JSON.stringify(presetData[name]));

const manager = {
  presetName: 'Main',
  secondPresetName: 'Second',
  loadMainPreset(name: string) {
    calls.push(`loadMain:${name}`);
    this.presetName = name;
    return true;
  },
  loadSecondPreset(name: string) {
    calls.push(`loadSecond:${name}`);
    this.secondPresetName = name;
    return true;
  },
  async insertPromptToPreset(prompt: FakePrompt, targetPreset: 'main' | 'second', index?: number) {
    calls.push(`insert:${targetPreset}:${prompt.name}:${index}`);
    const preset = targetPreset === 'main' ? presetData.Main : presetData.Second;
    preset.prompts.splice(index ?? preset.prompts.length, 0, {
      ...prompt,
      id: `new-${prompt.name}`,
      identifier: `new-${prompt.name}`,
      enabled: prompt.enabled ?? true,
      position: { type: 'relative' },
    });
  },
  async updatePromptInPreset(promptId: string, updates: Partial<FakePrompt>, targetPreset: 'main' | 'second') {
    calls.push(`update:${targetPreset}:${promptId}:${Object.keys(updates).sort().join(',')}`);
    const preset = targetPreset === 'main' ? presetData.Main : presetData.Second;
    const prompt = preset.prompts.find(item => item.id === promptId || item.identifier === promptId);
    if (prompt) Object.assign(prompt, updates);
  },
  async reorderPromptInPreset(targetPreset: 'main' | 'second', fromIndex: number, toIndex: number) {
    calls.push(`move:${targetPreset}:${fromIndex}:${toIndex}`);
    const preset = targetPreset === 'main' ? presetData.Main : presetData.Second;
    const [prompt] = preset.prompts.splice(fromIndex, 1);
    preset.prompts.splice(toIndex, 0, prompt);
    return true;
  },
  async deletePromptEverywhere(promptId: string, targetPreset: 'main' | 'second') {
    calls.push(`delete:${targetPreset}:${promptId}`);
    const preset = targetPreset === 'main' ? presetData.Main : presetData.Second;
    const before = preset.prompts.length + preset.prompts_unused.length;
    preset.prompts = preset.prompts.filter(item => item.id !== promptId && item.identifier !== promptId);
    preset.prompts_unused = preset.prompts_unused.filter(item => item.id !== promptId && item.identifier !== promptId);
    return preset.prompts.length + preset.prompts_unused.length < before;
  },
  async applyPromptMigration(nextPrompts: FakePrompt[], targetPreset: 'main' | 'second') {
    calls.push(`apply:${targetPreset}:${nextPrompts.map(prompt => prompt.name).join('>')}`);
    const preset = targetPreset === 'main' ? presetData.Main : presetData.Second;
    preset.prompts = nextPrompts.map(prompt => ({ ...prompt }));
    return true;
  },
  refreshMainPreset() {
    calls.push('refreshMain');
  },
  refreshSecondPreset() {
    calls.push('refreshSecond');
  },
  isPromptLocked(promptId: string, targetPreset: 'main' | 'second') {
    return targetPreset === 'main' && promptId === 'locked';
  },
};

const fakeHistory = {
  records: [] as any[],
  recordOperation(presetName: string, before: FakePreset, after: FakePreset, description: string) {
    this.records.push({ presetName, before, after, description });
  },
  recordMultiOperation(description: string, changes: any[]) {
    this.records.push({ description, changes });
  },
};

async function main() {
  const result = await executeAiPresetActionPlan(
    {
      summary: '测试代操作',
      actions: [
        { type: 'switch-main-preset', presetName: 'Main' },
        { type: 'switch-second-preset', presetName: 'Second' },
        {
          type: 'insert-prompt',
          targetPreset: 'main',
          index: 1,
          prompt: { name: '新条目', role: 'system', enabled: true, content: 'new content' },
        },
        {
          type: 'update-prompt',
          targetPreset: 'main',
          promptName: '旧条目',
          updates: { content: 'updated' },
        },
        {
          type: 'toggle-prompt',
          targetPreset: 'second',
          promptName: '第二条目',
          enabled: false,
        },
        {
          type: 'move-prompt',
          targetPreset: 'main',
          promptName: '移动条目',
          toIndex: 0,
        },
      ],
    },
    { manager, history: fakeHistory },
  );

  expectEqual(result.ok, true);
  expectTrue(calls.includes('loadMain:Main'), 'Main preset should be loaded');
  expectTrue(calls.includes('loadSecond:Second'), 'Second preset should be loaded');
  expectTrue(calls.some(call => call.startsWith('insert:main:新条目:1')), 'Prompt should be inserted');
  expectTrue(calls.some(call => call.startsWith('update:main:p1:content')), 'Prompt should be updated by name');
  expectTrue(calls.some(call => call.startsWith('update:second:s1:enabled')), 'Prompt should be toggled by name');
  expectTrue(calls.some(call => call.startsWith('move:main:2:0')), 'Prompt should be moved by resolved index');
  expectEqual(fakeHistory.records.length, 1);
  expectEqual(fakeHistory.records[0].description, 'AI 代操作: 测试代操作');
  expectEqual(fakeHistory.records[0].changes.length, 2);
  expectEqual(presetData.Main.prompts[0].name, '移动条目');
  expectEqual(presetData.Second.prompts[0].enabled, false);

  const recordCount = fakeHistory.records.length;
  const switchOnly = await executeAiPresetActionPlan(
    {
      summary: '只切换预设',
      actions: [{ type: 'switch-main-preset', presetName: 'Main' }],
    },
    { manager, history: fakeHistory },
  );
  expectEqual(switchOnly.ok, true);
  expectEqual(fakeHistory.records.length, recordCount);

  const mainCountBeforeInvalidPlan = presetData.Main.prompts.length;
  const invalidMixedPlan = await executeAiPresetActionPlan(
    {
      summary: '前半段不应落地',
      actions: [
        {
          type: 'insert-prompt',
          targetPreset: 'main',
          prompt: { name: '不应插入', role: 'system', enabled: true, content: 'x' },
        },
        { type: 'update-prompt', targetPreset: 'main', promptName: '不存在', updates: { content: 'x' } },
      ],
    },
    { manager, history: fakeHistory },
  );
  expectEqual(invalidMixedPlan.ok, false);
  expectEqual(presetData.Main.prompts.length, mainCountBeforeInvalidPlan);
  expectEqual(fakeHistory.records.length, recordCount);

  const failed = await executeAiPresetActionPlan(
    {
      summary: '定位失败',
      actions: [{ type: 'update-prompt', targetPreset: 'main', promptName: '不存在', updates: { content: 'x' } }],
    },
    { manager, history: fakeHistory },
  );
  expectEqual(failed.ok, false);
  expectTrue(failed.errors[0].includes('不存在'), 'Missing prompt should be reported');

  presetData.Main.prompts.push({
    id: 'locked',
    identifier: 'locked',
    name: '锁定条目',
    enabled: true,
    role: 'system',
    content: 'keep me',
  });
  const lockedResult = await executeAiPresetActionPlan(
    {
      summary: '尝试修改锁定条目',
      actions: [
        { type: 'update-prompt', targetPreset: 'main', promptName: '锁定条目', updates: { content: 'new' } },
        { type: 'toggle-prompt', targetPreset: 'main', promptName: '锁定条目', enabled: false },
        { type: 'move-prompt', targetPreset: 'main', promptName: '锁定条目', toIndex: 0 },
      ],
    },
    { manager, history: fakeHistory },
  );
  expectEqual(lockedResult.ok, true);
  expectEqual(lockedResult.executed, 0);
  expectEqual(lockedResult.skipped, 3);
  expectTrue(lockedResult.warnings.every((warning: string) => warning.includes('锁定')), 'Locked skips should be reported');
  const lockedPrompt = presetData.Main.prompts.find(prompt => prompt.identifier === 'locked');
  expectEqual([lockedPrompt?.content, lockedPrompt?.enabled], ['keep me', true]);

  presetData.Main.prompts = [
    { id: 'a', identifier: 'a', name: 'A', enabled: true, role: 'system', content: 'a' },
    { id: 'locked', identifier: 'locked', name: '锁定条目', enabled: true, role: 'system', content: 'keep me' },
    { id: 'b', identifier: 'b', name: 'B', enabled: true, role: 'system', content: 'b' },
    { id: 'c', identifier: 'c', name: 'C', enabled: true, role: 'system', content: 'c' },
  ];
  presetData.Second.prompts = [
    { id: 's1', identifier: 's1', name: '第二条目', enabled: true, role: 'system', content: 'second' },
    { id: 's2', identifier: 's2', name: '第二旧条目', enabled: true, role: 'system', content: 'old second' },
  ];
  const highRiskResult = await executeAiPresetActionPlan(
    {
      summary: '清理和重排',
      actions: [
        { type: 'delete-prompt', targetPreset: 'second', promptName: '第二旧条目' },
        { type: 'clear-prompts', targetPreset: 'second' },
        { type: 'reorder-prompts', targetPreset: 'main', promptNames: ['C', 'B', 'A'] },
      ],
    },
    { manager, history: fakeHistory },
  );
  expectEqual(highRiskResult.ok, true);
  expectTrue(calls.some(call => call === 'delete:second:s2'), 'Prompt should be deleted by name');
  expectTrue(calls.some(call => call === 'delete:second:s1'), 'Clear should delete remaining deletable prompt');
  expectEqual(presetData.Second.prompts.length, 0);
  expectEqual(presetData.Main.prompts.map(prompt => prompt.name), ['C', '锁定条目', 'B', 'A']);

  const moveDownPresetData: Record<string, FakePreset> = {
    Main: {
      prompts: [
        { id: 'a', identifier: 'a', name: 'A', enabled: true, role: 'system', content: 'a' },
        { id: 'b', identifier: 'b', name: 'B', enabled: true, role: 'system', content: 'b' },
        { id: 'c', identifier: 'c', name: 'C', enabled: true, role: 'system', content: 'c' },
      ],
      prompts_unused: [],
    },
  };
  (globalThis as any).getPreset = (name: string) => JSON.parse(JSON.stringify(moveDownPresetData[name]));
  const moveDownCalls: string[] = [];
  const dropIndexManager = {
    ...manager,
    presetName: 'Main',
    secondPresetName: '',
    async reorderPromptInPreset(targetPreset: 'main' | 'second', fromIndex: number, toIndex: number) {
      moveDownCalls.push(`move:${fromIndex}:${toIndex}`);
      if (targetPreset !== 'main') return false;
      const preset = moveDownPresetData.Main;
      const boundedTarget = Math.max(0, Math.min(toIndex, preset.prompts.length));
      const insertIndex = boundedTarget > fromIndex ? boundedTarget - 1 : boundedTarget;
      if (insertIndex === fromIndex) return false;
      const [prompt] = preset.prompts.splice(fromIndex, 1);
      preset.prompts.splice(insertIndex, 0, prompt);
      return true;
    },
    refreshMainPreset() {
      moveDownCalls.push('refreshMain');
    },
    refreshSecondPreset() {},
    isPromptLocked() {
      return false;
    },
  };
  const moveDownResult = await executeAiPresetActionPlan(
    {
      summary: '把 A 移到第三位',
      actions: [{ type: 'move-prompt', targetPreset: 'main', promptName: 'A', toIndex: 2 }],
    },
    { manager: dropIndexManager, history: fakeHistory },
  );
  expectEqual(moveDownResult.ok, true);
  expectEqual(moveDownPresetData.Main.prompts.map(prompt => prompt.name), ['B', 'C', 'A']);
  expectEqual(moveDownCalls[0], 'move:0:3');

  console.info('aiPresetActionExecutor tests passed');
}

void main();
