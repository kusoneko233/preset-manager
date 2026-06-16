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

function expectNotIncludes(content: string, unexpected: string) {
  if (content.includes(unexpected)) {
    throw new Error(`Expected file not to include: ${unexpected}`);
  }
}

const panel = readProjectFile('src/preset-manager/components/PresetMigrationPanel.vue');
const promptItem = readProjectFile('src/preset-manager/components/PromptItem.vue');
const roadmap = readProjectFile('docs/roadmap.md');

expectIncludes(panel, 'class="migration-multi-toggle"');
expectIncludes(panel, 'class="migration-status-dot"');
expectIncludes(panel, '多选');
expectIncludes(panel, '迁移选中');
expectIncludes(panel, '`迁移 ${selectedCount} 项`');
expectIncludes(panel, 'class="migration-marker-select"');
expectIncludes(panel, '全选当前筛选的可迁移项');
expectIncludes(panel, ':title="filter.description"');
expectIncludes(panel, 'anchor: getConfirmAnchor()');
expectNotIncludes(panel, 'class="migration-apply-menu"');
expectNotIncludes(panel, 'aria-label="迁移操作区"');
expectNotIncludes(panel, '只应用当前');
expectNotIncludes(panel, '应用当前筛选');
expectNotIncludes(panel, '应用全部可迁移');
expectNotIncludes(panel, '复制当前筛选新增');
expectNotIncludes(panel, 'copySelectionToMain');
expectIncludes(promptItem, 'migrationDiffLines');
expectIncludes(promptItem, 'class="prompt-content prompt-content-diff"');
expectIncludes(promptItem, 'class="inline-content-diff-overlay"');
expectIncludes(promptItem, 'diffTextForCurrentSide');
if (promptItem.includes('contentInputHiddenForDiff')) {
  throw new Error('Expected diff overlay to remain visible while editing, including textarea focus');
}
expectIncludes(promptItem, 'diffLinesForCurrentSide.length');
expectIncludes(promptItem, "background: transparent;");
expectIncludes(promptItem, "color: transparent;");
expectIncludes(promptItem, "caret-color: var(--pm-text);");
if (promptItem.includes('class="inline-diff-preview"') || promptItem.includes('.inline-diff-preview')) {
  throw new Error('Expected inline diff preview block to be removed');
}
expectIncludes(promptItem, "line.kind === 'removed'");
expectIncludes(promptItem, "line.kind === 'added'");

expectIncludes(roadmap, '文本差异对比');
expectIncludes(roadmap, '批量复制');
expectIncludes(roadmap, '批量迁移');
expectIncludes(roadmap, '冲突处理界面进一步可视化');

console.info('migrationEnhancement tests passed');
