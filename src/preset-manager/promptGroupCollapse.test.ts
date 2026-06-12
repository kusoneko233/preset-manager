declare const require: any;
declare const process: any;

const fs = require('fs');
const path = require('path');

function readProjectFile(file: string) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8') as string;
}

function expectIncludes(content: string, expected: string) {
  if (!content.includes(expected)) {
    throw new Error(`Expected file to include: ${expected}`);
  }
}

function extractBlock(content: string, startToken: string, endToken: string) {
  const start = content.indexOf(startToken);
  if (start === -1) {
    throw new Error(`Expected block to start with: ${startToken}`);
  }
  const end = content.indexOf(endToken, start + startToken.length);
  if (end === -1) {
    throw new Error(`Expected block after ${startToken} to end before: ${endToken}`);
  }
  return content.slice(start, end);
}

const promptItem = readProjectFile('src/preset-manager/components/PromptItem.vue');
const presetPanel = readProjectFile('src/preset-manager/components/PresetPanel.vue');
const promptItemPropsBlock = extractBlock(promptItem, 'const props = defineProps<{', '}>();');
const promptItemEmitsBlock = extractBlock(promptItem, 'const emit = defineEmits<{', '}>();');
const rowStartBlock = extractBlock(promptItem, '<div class="prompt-row"', '<div class="prompt-title-cluster">');
const vForBlock = extractBlock(presetPanel, 'v-for="(prompt, i) in prompts"', '<span v-if="dropIndex === i"');

expectIncludes(promptItemPropsBlock, 'isGroupHeader?: boolean;');
expectIncludes(promptItemPropsBlock, 'groupCollapsed?: boolean;');
expectIncludes(promptItemPropsBlock, 'collapsedGroupCount?: number;');
expectIncludes(promptItemEmitsBlock, 'toggleGroupCollapsed: [];');
expectIncludes(promptItem, 'class="prompt-group-toggle"');
expectIncludes(promptItem, ':aria-expanded="!groupCollapsed"');
expectIncludes(promptItem, '@click.stop="$emit(\'toggleGroupCollapsed\')"');
expectIncludes(promptItem, '已收起 {{ collapsedGroupCount }} 条');
expectIncludes(rowStartBlock, 'class="prompt-left-marker"');
expectIncludes(rowStartBlock, 'class="prompt-role-dot"');
expectIncludes(rowStartBlock, 'class="prompt-group-toggle"');

expectIncludes(presetPanel, 'const collapsedPromptGroupKeys = ref<Set<string>>(new Set());');
expectIncludes(presetPanel, 'function isPromptGroupHeader(prompt: PresetPrompt)');
expectIncludes(presetPanel, 'function getPromptGroupState(index: number)');
expectIncludes(presetPanel, 'function isPromptHiddenByCollapsedGroup(index: number)');
expectIncludes(presetPanel, 'function togglePromptGroupCollapsed(prompt: PresetPrompt)');
expectIncludes(presetPanel, 'function pruneCollapsedPromptGroups()');
expectIncludes(vForBlock, 'v-if="!isPromptHiddenByCollapsedGroup(i)"');
expectIncludes(vForBlock, ':is-group-header="getPromptGroupState(i).isHeader"');
expectIncludes(vForBlock, ':group-collapsed="getPromptGroupState(i).collapsed"');
expectIncludes(vForBlock, ':collapsed-group-count="getPromptGroupState(i).count"');
expectIncludes(vForBlock, '@toggle-group-collapsed="togglePromptGroupCollapsed(prompt)"');

console.info('promptGroupCollapse tests passed');
