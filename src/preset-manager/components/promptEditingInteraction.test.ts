declare const require: any;
declare const process: any;

// eslint-disable-next-line import-x/no-nodejs-modules
const fs = require('fs');
// eslint-disable-next-line import-x/no-nodejs-modules
const path = require('path');

function readProjectFile(file: string) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8') as string;
}

function expectIncludes(content: string, expected: string) {
  if (!content.includes(expected)) {
    throw new Error(`Expected file to include: ${expected}`);
  }
}

function expectExcludes(content: string, unexpected: string) {
  if (content.includes(unexpected)) {
    throw new Error(`Expected file to exclude: ${unexpected}`);
  }
}

const promptItem = readProjectFile('src/preset-manager/components/PromptItem.vue');
const editDialog = readProjectFile('src/preset-manager/components/PromptEditDialog.vue');
const presetPanel = readProjectFile('src/preset-manager/components/PresetPanel.vue');

expectExcludes(editDialog, '<Teleport to="body">');
expectIncludes(editDialog, 'class="dialog-layer"');
expectIncludes(editDialog, '.dialog-layer');
expectIncludes(presetPanel, '.preset-panel {');
expectIncludes(presetPanel, 'position: relative;');
expectIncludes(presetPanel, 'overflow: hidden;');
expectIncludes(promptItem, 'title="编辑条目"');
expectIncludes(promptItem, 'class="content-preview expanded-content"');
expectIncludes(promptItem, 'max-height: clamp(220px, 34vh, 460px);');
expectExcludes(promptItem, 'class="prompt-quick-actions"');
expectExcludes(promptItem, 'class="quick-action-btn"');
expectExcludes(promptItem, 'title="放大查看"');
expectExcludes(promptItem, '<span>放大</span>');
expectExcludes(promptItem, '<span>{{ prompt.enabled ? \'禁用\' : \'启用\' }}</span>');
expectExcludes(promptItem, '<span>{{ isFavorited ? \'取消收藏\' : \'收藏\' }}</span>');

console.info('promptEditingInteraction tests passed');
