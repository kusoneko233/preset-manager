declare const require: any;

function expectEqual<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function expectIncludes(actual: string, expected: string) {
  if (!actual.includes(expected)) {
    throw new Error(`Expected text to include ${JSON.stringify(expected)}`);
  }
}

async function main() {
  const { buildPresetWritingSkillPrompt, detectPresetWritingIntent, shouldUsePresetWritingSkill } = require('./presetWritingSkill');

  expectEqual(detectPresetWritingIntent('帮我从零写一个互动小说预设'), 'create');
  expectEqual(detectPresetWritingIntent('教我怎么写预设，完全新手'), 'learn');
  expectEqual(detectPresetWritingIntent('分析一下这个预设为什么容易抢话'), 'diagnose');
  expectEqual(detectPresetWritingIntent('优化这个提示词的文风控制'), 'style');
  expectEqual(detectPresetWritingIntent('Claude 的 role 顺序和 API 上下文怎么适配'), 'model');
  expectEqual(detectPresetWritingIntent('帮我查一下 lost in the middle 导致的重复和遗忘'), 'diagnose');
  expectEqual(detectPresetWritingIntent('今天天气怎么样'), 'none');

  expectEqual(shouldUsePresetWritingSkill('帮我写预设'), true);
  expectEqual(shouldUsePresetWritingSkill('解释一下这个条目的 role 和位置'), true);
  expectEqual(shouldUsePresetWritingSkill('怎么给这个角色做叙事风格锚点'), true);
  expectEqual(shouldUsePresetWritingSkill('打开设置'), false);

  const skillPrompt = buildPresetWritingSkillPrompt({
    presetContext: '预设名: Demo\n条目数: 3',
    userInput: '帮我检查预设结构',
  });

  expectIncludes(skillPrompt, '预设写作专用工作流');
  expectIncludes(skillPrompt, '用户的预设写作 handler');
  expectIncludes(skillPrompt, '判断用户现在处在哪个阶段');
  expectIncludes(skillPrompt, '预设写作知识库');
  expectIncludes(skillPrompt, '知识库版本');
  expectIncludes(skillPrompt, '语言模型与提示词分析入门教程');
  expectIncludes(skillPrompt, '主附件，只提炼安全可用于预设写作和诊断的部分');
  expectIncludes(skillPrompt, 'Transformer');
  expectIncludes(skillPrompt, 'decoder-only');
  expectIncludes(skillPrompt, '文本向量化');
  expectIncludes(skillPrompt, '自回归');
  expectIncludes(skillPrompt, '输入 + LLM -> 输出');
  expectIncludes(skillPrompt, 'role、content 和 token');
  expectIncludes(skillPrompt, '靶向提示');
  expectIncludes(skillPrompt, '元提示');
  expectIncludes(skillPrompt, '基调、文体特征、叙述规则');
  expectIncludes(skillPrompt, '核心事件、催化事件、叙事话语、文风文笔');
  expectIncludes(skillPrompt, 'API 的先手优势');
  expectIncludes(skillPrompt, 'Kemini 来源当前只读到视频索引');
  expectIncludes(skillPrompt, 'role、位置、提示词');
  expectIncludes(skillPrompt, '不要直接堆叠提示词');
  expectIncludes(skillPrompt, '控制台或实际发送上下文是第一证据');
  expectIncludes(skillPrompt, 'U 型注意力');
  expectIncludes(skillPrompt, '问题现象 -> 可能原因 -> 靶向条目');
  expectIncludes(skillPrompt, '叙事策略');
  expectIncludes(skillPrompt, '局部条目优先');
  expectIncludes(skillPrompt, '条目名、role、启用状态、建议位置、content');
  expectIncludes(skillPrompt, '不得提供绕过平台安全机制');
  expectIncludes(skillPrompt, '不得把破限、反 RLHF、反过滤材料转成可操作规避步骤');
  expectIncludes(skillPrompt, '不得输出可直接复制使用的越狱、反过滤、反催眠或绕过对齐模板');
  expectIncludes(skillPrompt, '预设名: Demo');

  expectIncludes(buildPresetWritingSkillPrompt({ userInput: '教我怎么写预设' }), '当前处理策略：新手引导');
  expectIncludes(buildPresetWritingSkillPrompt({ userInput: '帮我从零写一个预设' }), '当前处理策略：从零创建');
  expectIncludes(buildPresetWritingSkillPrompt({ userInput: '优化这个条目' }), '当前处理策略：局部优化');
  expectIncludes(buildPresetWritingSkillPrompt({ userInput: '诊断为什么重复' }), '当前处理策略：故障诊断');
  expectIncludes(buildPresetWritingSkillPrompt({ userInput: '写一个文风锚点' }), '当前处理策略：文风塑形');
  expectIncludes(buildPresetWritingSkillPrompt({ userInput: 'Claude role 怎么放' }), '当前处理策略：模型适配');

  console.info('presetWritingSkill tests passed');
}

void main();
