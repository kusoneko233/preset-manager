declare const require: any;

const { executeAiPresetActionPlan } = require('./utils/aiPresetActionExecutor');
const { parseAiPresetActionResponse, stripAiActionBlocks } = require('./utils/aiPresetActions');
const { detectPresetWritingIntent, shouldUsePresetWritingSkill } = require('./utils/presetWritingSkill');

function expectEqual<T>(actual: T, expected: T) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function expectTrue(value: boolean, message: string) {
  if (!value) throw new Error(message);
}

type ScenarioPrompt = {
  id: string;
  identifier?: string;
  name: string;
  enabled: boolean;
  role: 'system' | 'user' | 'assistant';
  content: string;
  position?: { type: 'relative' };
};

type ScenarioPreset = {
  prompts: ScenarioPrompt[];
  prompts_unused: ScenarioPrompt[];
};

const scenarioPresets: Record<string, ScenarioPreset> = {
  Izumi: {
    prompts: [
      { id: 'base', identifier: 'base', name: '基础设定', enabled: true, role: 'system', content: 'old base' },
      { id: 'style', identifier: 'style', name: '文风锚点', enabled: true, role: 'system', content: 'old style' },
      { id: 'format', identifier: 'format', name: '输出格式', enabled: true, role: 'system', content: 'old format' },
    ],
    prompts_unused: [
      { id: 'dup', identifier: 'dup', name: '重复条目', enabled: false, role: 'system', content: 'unused duplicate' },
    ],
  },
  'Izumi-v2': {
    prompts: [
      { id: 'base2', identifier: 'base2', name: '基础设定', enabled: true, role: 'system', content: 'new base' },
      { id: 'style2', identifier: 'style2', name: '文风锚点', enabled: true, role: 'system', content: 'new style' },
    ],
    prompts_unused: [],
  },
};

(globalThis as any).getPreset = (name: string) => JSON.parse(JSON.stringify(scenarioPresets[name]));

const calls: string[] = [];
const manager = {
  presetName: 'Izumi',
  secondPresetName: 'Izumi-v2',
  loadMainPreset(name: string) {
    calls.push(`loadMain:${name}`);
    this.presetName = name;
    return Boolean(scenarioPresets[name]);
  },
  loadSecondPreset(name: string) {
    calls.push(`loadSecond:${name}`);
    this.secondPresetName = name;
    return Boolean(scenarioPresets[name]);
  },
  async insertPromptToPreset(prompt: ScenarioPrompt, targetPreset: 'main' | 'second', index?: number) {
    calls.push(`insert:${targetPreset}:${prompt.name}:${index}`);
    const preset = targetPreset === 'main' ? scenarioPresets[this.presetName] : scenarioPresets[this.secondPresetName];
    const nextPrompt = {
      ...prompt,
      id: prompt.id || `new-${prompt.name}`,
      identifier: prompt.identifier || prompt.id || `new-${prompt.name}`,
    };
    preset.prompts.splice(index ?? preset.prompts.length, 0, nextPrompt);
  },
  async updatePromptInPreset(promptId: string, updates: Partial<ScenarioPrompt>, targetPreset: 'main' | 'second') {
    calls.push(`update:${targetPreset}:${promptId}:${Object.keys(updates).sort().join(',')}`);
    const preset = targetPreset === 'main' ? scenarioPresets[this.presetName] : scenarioPresets[this.secondPresetName];
    const prompt = [...preset.prompts, ...preset.prompts_unused].find(item => item.identifier === promptId || item.id === promptId);
    if (prompt) Object.assign(prompt, updates);
  },
  async reorderPromptInPreset(targetPreset: 'main' | 'second', fromIndex: number, toIndex: number) {
    calls.push(`move:${targetPreset}:${fromIndex}:${toIndex}`);
    const preset = targetPreset === 'main' ? scenarioPresets[this.presetName] : scenarioPresets[this.secondPresetName];
    const boundedTarget = Math.max(0, Math.min(toIndex, preset.prompts.length));
    const insertIndex = boundedTarget > fromIndex ? boundedTarget - 1 : boundedTarget;
    if (insertIndex === fromIndex) return false;
    const [prompt] = preset.prompts.splice(fromIndex, 1);
    preset.prompts.splice(insertIndex, 0, prompt);
    return true;
  },
  async deletePromptEverywhere(promptId: string, targetPreset: 'main' | 'second') {
    calls.push(`delete:${targetPreset}:${promptId}`);
    const preset = targetPreset === 'main' ? scenarioPresets[this.presetName] : scenarioPresets[this.secondPresetName];
    const before = preset.prompts.length + preset.prompts_unused.length;
    preset.prompts = preset.prompts.filter(item => item.identifier !== promptId && item.id !== promptId);
    preset.prompts_unused = preset.prompts_unused.filter(item => item.identifier !== promptId && item.id !== promptId);
    return before !== preset.prompts.length + preset.prompts_unused.length;
  },
  async applyPromptMigration(nextPrompts: ScenarioPrompt[], targetPreset: 'main' | 'second') {
    calls.push(`apply:${targetPreset}:${nextPrompts.map(prompt => prompt.name).join('>')}`);
    const preset = targetPreset === 'main' ? scenarioPresets[this.presetName] : scenarioPresets[this.secondPresetName];
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
    return targetPreset === 'main' && promptId === 'base';
  },
};

const scenarioHistory = {
  records: [] as any[],
  recordOperation(presetName: string, before: ScenarioPreset, after: ScenarioPreset, description: string) {
    this.records.push({ presetName, before, after, description });
  },
  recordMultiOperation(description: string, changes: any[]) {
    this.records.push({ description, changes });
  },
};

async function main() {
  expectEqual(detectPresetWritingIntent('接管这个 izumi 预设，先解析结构再说哪里不好用'), 'diagnose');
  expectEqual(detectPresetWritingIntent('帮我把 izumi 整理成 Claude 更稳的结构'), 'model');
  expectTrue(shouldUsePresetWritingSkill('把文风锚点移动到最前面，然后解释为什么这么放'), 'move scenario should use preset skill');

  const deepSeekLikeResponse = `
先给你一个确认卡片，确认后我会只移动和更新，不会直接覆盖整套预设。

\`\`\`preset-manager-action
{
  "summary": "整理 Izumi 的文风与顺序",
  "actions": [
    {
      "type": "move-prompt",
      "targetPreset": "main",
      "promptName": "文风锚点",
      "toIndex": 0,
    },
    {
      "type": "update-prompt",
      "targetPreset": "main",
      "promptName": "文风锚点",
      "updates": {
        "content": "用具体动作和环境反馈推进叙事，减少抽象形容词。",
      },
    },
    {
      "type": "insert-prompt",
      "targetPreset": "second",
      "index": 1,
      "prompt": {
        "name": "迁移备注",
        "role": "system",
        "enabled": true,
        "content": "记录从新版预设迁移来的差异。",
      },
    },
  ],
}
\`\`\`
`;

  const parsed = parseAiPresetActionResponse(deepSeekLikeResponse);
  expectEqual(parsed.errors, []);
  expectEqual(stripAiActionBlocks(deepSeekLikeResponse).includes('preset-manager-action'), false);
  expectEqual(parsed.plan?.actions.map((action: any) => action.type), ['move-prompt', 'update-prompt', 'insert-prompt']);

  const result = await executeAiPresetActionPlan(parsed.plan, { manager, history: scenarioHistory });
  expectEqual(result.ok, true);
  expectEqual(scenarioPresets.Izumi.prompts.map(prompt => prompt.name), ['文风锚点', '基础设定', '输出格式']);
  expectEqual(scenarioPresets.Izumi.prompts[0].content, '用具体动作和环境反馈推进叙事，减少抽象形容词。');
  expectEqual(scenarioPresets['Izumi-v2'].prompts.map(prompt => prompt.name), ['基础设定', '迁移备注', '文风锚点']);
  expectTrue(calls.includes('move:main:1:0'), 'Move to top should be passed as top drop index');

  const promptCountBeforeInvalidPlan = scenarioPresets.Izumi.prompts.length;
  const invalidResult = await executeAiPresetActionPlan(
    {
      summary: '先插入再改不存在条目',
      actions: [
        {
          type: 'insert-prompt',
          targetPreset: 'main',
          prompt: { name: '不应落地', role: 'system', enabled: true, content: 'x' },
        },
        { type: 'update-prompt', targetPreset: 'main', promptName: '不存在条目', updates: { content: 'x' } },
      ],
    },
    { manager, history: scenarioHistory },
  );
  expectEqual(invalidResult.ok, false);
  expectEqual(scenarioPresets.Izumi.prompts.length, promptCountBeforeInvalidPlan);

  const lockedResult = await executeAiPresetActionPlan(
    {
      summary: '锁定条目不应被禁用',
      actions: [{ type: 'toggle-prompt', targetPreset: 'main', promptName: '基础设定', enabled: false }],
    },
    { manager, history: scenarioHistory },
  );
  expectEqual(lockedResult.ok, true);
  expectEqual(lockedResult.skipped, 1);
  expectEqual(scenarioPresets.Izumi.prompts.find(prompt => prompt.identifier === 'base')?.enabled, true);

  console.info('aiAgentScenario tests passed');
}

void main();
