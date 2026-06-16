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

function expectBefore(content: string, first: string, second: string) {
  const firstIndex = content.indexOf(first);
  const secondIndex = content.indexOf(second);
  if (firstIndex === -1 || secondIndex === -1 || firstIndex >= secondIndex) {
    throw new Error(`Expected "${first}" to appear before "${second}"`);
  }
}

function cssBlock(content: string, selector: string) {
  const start = content.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Expected CSS selector to exist: ${selector}`);
  const end = content.indexOf('\n}', start);
  if (end === -1) throw new Error(`Expected CSS selector to close: ${selector}`);
  return content.slice(start, end + 2);
}

function cssBlockAfter(content: string, selector: string, after: string) {
  const afterIndex = content.indexOf(after);
  if (afterIndex === -1) throw new Error(`Expected anchor to exist: ${after}`);
  const start = content.indexOf(`${selector} {`, afterIndex);
  if (start === -1) throw new Error(`Expected CSS selector to exist after anchor: ${selector}`);
  const end = content.indexOf('\n}', start);
  if (end === -1) throw new Error(`Expected CSS selector to close: ${selector}`);
  return content.slice(start, end + 2);
}

const app = readProjectFile('src/preset-manager/App.vue');
const manager = readProjectFile('src/preset-manager/stores/manager.ts');
const migrationPanel = readProjectFile('src/preset-manager/components/PresetMigrationPanel.vue');
const presetPanel = readProjectFile('src/preset-manager/components/PresetPanel.vue');
const promptItem = readProjectFile('src/preset-manager/components/PromptItem.vue');
const migrationTypeFilterBlock = cssBlockAfter(migrationPanel, '.migration-type-filter', '.migration-controls button:disabled');
const migrationTypeButtonBlock = cssBlock(migrationPanel, '.migration-type-filter button');
const migrationTypeActiveBlock = cssBlock(migrationPanel, '.migration-type-filter button.active');
const migrationMultiSelectBlock = cssBlock(migrationPanel, '.migration-multi-toggle');
const migrationMarkerRailBlock = cssBlock(migrationPanel, '.migration-marker-rail');
const migrationScrollMapBlock = cssBlock(migrationPanel, '.migration-scroll-map');

expectIncludes(manager, 'async applyPromptMigration(nextPrompts: PresetPrompt[], targetPreset:');
expectIncludes(app, "import PresetMigrationPanel from './components/PresetMigrationPanel.vue';");
expectIncludes(app, "type RightAuxTabType = 'empty' | 'preset' | 'chat';");
expectIncludes(app, 'class="right-aux-tab-strip"');
expectIncludes(app, 'class="right-preset-migration-action"');
expectIncludes(app, '<PresetMigrationPanel');
expectIncludes(app, '@focus-main-prompt="focusMainPromptFromMigration"');
expectIncludes(app, ':migration-active="activeRightAuxTab.migrationOpen"');
expectIncludes(app, ':migration-diff-items="presetMigrationDiff.items"');
expectIncludes(app, '<PresetPanel');
expectNotIncludes(app, '<PresetMigrationPanel\n                    v-if="activeRightAuxTab.migrationOpen"');
expectNotIncludes(app, '<PresetPanel\n                    v-else');
expectIncludes(app, 'const mainPresetPanelRef = ref');
expectIncludes(app, 'const secondPresetPanelRef = ref');
expectIncludes(app, 'const presetMigrationDiff = computed');
expectIncludes(app, 'function focusMainPromptFromMigration');
expectIncludes(migrationPanel, 'class="migration-panel"');
expectIncludes(migrationPanel, 'buildPresetMigrationDiff');
expectIncludes(migrationPanel, 'applyPresetMigrationSelection');
expectIncludes(migrationPanel, 'buildPromptContentDiffLines');
expectNotIncludes(migrationPanel, 'class="migration-jump-status"');
expectNotIncludes(migrationPanel, 'class="migration-kicker"');
expectNotIncludes(migrationPanel, 'activeItemIndexLabel');
expectNotIncludes(migrationPanel, 'emptyStatusText');
expectIncludes(migrationPanel, '上一个');
expectIncludes(migrationPanel, '下一个');
expectIncludes(migrationPanel, 'class="migration-type-filter"');
expectIncludes(migrationPanel, 'class="migration-scroll-map"');
expectIncludes(migrationPanel, 'class="migration-scroll-marker"');
expectIncludes(migrationPanel, 'class="migration-multi-toggle"');
expectIncludes(migrationPanel, 'class="migration-status-dot"');
expectIncludes(migrationPanel, '多选');
expectIncludes(migrationPanel, 'class="migration-apply-trigger"');
expectIncludes(migrationPanel, '迁移选中');
expectIncludes(migrationPanel, '`迁移 ${selectedCount} 项`');
expectNotIncludes(migrationPanel, 'class="migration-apply-menu"');
expectNotIncludes(migrationPanel, 'class="migration-apply-popover"');
expectNotIncludes(migrationPanel, 'aria-label="迁移操作区"');
expectNotIncludes(migrationPanel, '只应用当前');
expectNotIncludes(migrationPanel, '应用当前筛选');
expectNotIncludes(migrationPanel, '应用全部可迁移');
expectNotIncludes(migrationPanel, '把右侧可迁移差异一次同步到左侧主预设');
expectNotIncludes(migrationPanel, '只同步当前筛选胶囊里的差异');
expectNotIncludes(migrationPanel, '只同步当前高亮条目');
expectIncludes(migrationPanel, 'class="migration-marker-select"');
expectIncludes(migrationPanel, '全选');
expectIncludes(migrationPanel, '全选当前筛选的可迁移项');
expectBefore(migrationPanel, 'class="migration-marker-select"', 'class="migration-scroll-map"');
expectIncludes(migrationPanel, ':title="filter.description"');
expectIncludes(migrationPanel, ':aria-label="`${filter.label}：${filter.description}`"');
expectIncludes(migrationPanel, "description: '主预设和右侧预设的所有差异'");
expectIncludes(migrationPanel, "description: '右侧有、主预设没有；迁移后会加入主预设'");
expectIncludes(migrationPanel, "description: '主预设有、右侧没有；迁移后会从主预设移除'");
expectIncludes(migrationPanel, "description: '同一条提示词内容不同；迁移后按右侧覆盖'");
expectIncludes(migrationPanel, "description: '启用或禁用状态不同；迁移后按右侧覆盖'");
expectIncludes(migrationPanel, "description: '同一条同时有内容、状态等多种差异'");
expectIncludes(migrationPanel, '右侧无');
expectNotIncludes(migrationPanel, "label: '位置'");
expectNotIncludes(migrationPanel, "label: '顺序'");
expectNotIncludes(migrationPanel, "value: 'order', label");
expectNotIncludes(migrationPanel, 'class="migration-row"');
expectNotIncludes(migrationPanel, '<input');
expectNotIncludes(migrationPanel, "label: '删除'");
expectNotIncludes(migrationPanel, "label: '顺序'");
expectIncludes(migrationPanel, "store.isPromptLocked(item.key, 'main')");
expectIncludes(migrationPanel, 'history.recordOperation');
expectIncludes(migrationPanel, 'store.applyPromptMigration');
expectIncludes(migrationPanel, '锁定');
expectIncludes(migrationPanel, 'getMigrationVisualTone');
expectIncludes(migrationPanel, 'content');
expectIncludes(migrationPanel, 'added');
expectIncludes(migrationPanel, 'removed');
expectIncludes(migrationPanel, 'enabled');
expectNotIncludes(migrationPanel, "value: 'order'");
expectNotIncludes(migrationPanel, 'tone-order');
expectIncludes(migrationPanel, 'mixed');
expectNotIncludes(migrationPanel, "value: 'duplicate'");
expectNotIncludes(migrationPanel, "label: '重复'");
expectIncludes(migrationPanel, 'class="filter-tone"');
expectIncludes(migrationPanel, 'filterToneClass(filter.value)');
expectIncludes(migrationPanel, 'selectedKeys');
expectIncludes(migrationPanel, 'selectedSet');
expectIncludes(migrationPanel, 'toggleMultiSelect');
expectIncludes(migrationPanel, 'toggleSelectFiltered');
expectIncludes(migrationPanel, 'toggleSelectItem');
expectIncludes(migrationPanel, 'applySelected');
expectIncludes(migrationPanel, 'getConfirmAnchor');
expectNotIncludes(migrationPanel, '复制当前筛选新增');
expectNotIncludes(migrationPanel, 'copySelectionToMain');
expectNotIncludes(migrationPanel, 'selectedCopyItems');
expectIncludes(migrationPanel, '.migration-type-filter button::before');
expectIncludes(migrationPanel, '.migration-type-filter button.filter-added');
expectIncludes(migrationPanel, '.migration-type-filter button.filter-removed');
expectIncludes(migrationPanel, '.migration-type-filter button.filter-content');
expectIncludes(migrationPanel, '.migration-type-filter button.filter-enabled');
expectIncludes(migrationPanel, '.migration-type-filter button.filter-mixed');
expectIncludes(migrationTypeFilterBlock, 'scrollbar-width: none;');
expectIncludes(migrationPanel, '.migration-type-filter::-webkit-scrollbar');
expectIncludes(migrationTypeButtonBlock, 'border: 0;');
expectIncludes(migrationTypeButtonBlock, 'outline: 0;');
expectIncludes(migrationTypeButtonBlock, 'background: color-mix(in srgb, #000 48%, var(--pm-bg-elevated));');
expectIncludes(migrationTypeActiveBlock, 'background: color-mix(in srgb, #000 36%, var(--pm-bg-elevated));');
expectNotIncludes(migrationTypeButtonBlock, 'border: 1px solid');
expectNotIncludes(migrationTypeActiveBlock, 'border-color:');
expectNotIncludes(migrationTypeActiveBlock, '0 0 0 1px');
expectNotIncludes(migrationTypeButtonBlock, 'background: color-mix(in srgb, var(--filter-tone)');
expectNotIncludes(migrationTypeActiveBlock, 'background: color-mix(in srgb, var(--filter-tone)');
expectIncludes(migrationMultiSelectBlock, 'border: 0;');
expectIncludes(migrationMultiSelectBlock, 'border-radius: 999px;');
expectIncludes(migrationMultiSelectBlock, 'background: color-mix(in srgb, #000 44%, var(--pm-bg-elevated));');
expectIncludes(migrationPanel, '.migration-multi-toggle.on .migration-status-dot');
expectIncludes(migrationPanel, '.migration-multi-toggle:not(.on) .migration-status-dot');
expectIncludes(migrationMarkerRailBlock, 'display: grid;');
expectIncludes(migrationMarkerRailBlock, 'grid-template-columns: auto minmax(0, 1fr);');
expectIncludes(migrationScrollMapBlock, 'overflow: hidden;');
expectIncludes(migrationScrollMapBlock, 'scrollbar-width: none;');
expectIncludes(migrationPanel, '.migration-scroll-map::-webkit-scrollbar');
expectNotIncludes(migrationScrollMapBlock, 'overflow: auto;');
expectIncludes(migrationPanel, ':class="[`tone-${getMigrationVisualTone(item.kind)}`, { active: activeItem?.key === item.key, locked: isDiffItemLocked(item), selected: selectedSet.has(item.key) }]"');

expectIncludes(migrationPanel, 'const emit = defineEmits<{');
expectIncludes(migrationPanel, 'focusMainPrompt:');
expectIncludes(migrationPanel, 'focusSecondPrompt:');
expectIncludes(migrationPanel, 'jumpToMigrationItem');
expectIncludes(migrationPanel, 'scrollMigrationItemIntoView');
expectIncludes(migrationPanel, 'mainAnchorIndex: item.mainAnchorIndex');
expectIncludes(migrationPanel, 'secondIndex: item.secondIndex');
expectIncludes(app, 'getMigrationAlignViewportTop');
expectIncludes(app, 'alignViewportTop');
expectIncludes(presetPanel, 'getPromptListViewportTop');
expectIncludes(presetPanel, 'alignViewportTop');
expectIncludes(presetPanel, 'data-preset-prompt-key');
expectIncludes(presetPanel, 'data-preset-prompt-index');
expectIncludes(presetPanel, 'migration-diff-items');
expectIncludes(presetPanel, 'migration-active');
expectIncludes(presetPanel, 'getMigrationItemForPrompt(prompt)');
expectIncludes(presetPanel, 'getMigrationDiffLinesForPrompt(prompt)');
expectIncludes(presetPanel, 'buildPromptContentDiffLines');
expectIncludes(presetPanel, 'getMigrationVisualTone');
expectIncludes(presetPanel, 'function scrollToPromptAnchor');
expectIncludes(presetPanel, 'defineExpose({');
expectIncludes(presetPanel, "if (relation === 'same-id' || relation === 'same-content') return '';");
expectIncludes(promptItem, 'v-if="!(isGroupHeader && collapsedGroupCount)"');
expectIncludes(promptItem, 'v-else-if="isGroupHeader && collapsedGroupCount"');
expectIncludes(promptItem, 'class="prompt-migration-badge"');
expectIncludes(promptItem, 'migrationDiffLines');
expectIncludes(promptItem, 'class="prompt-content prompt-content-diff"');
expectNotIncludes(promptItem, 'class="inline-diff-preview"');
expectNotIncludes(promptItem, '.inline-diff-preview');
expectIncludes(promptItem, 'class="inline-content-diff-overlay"');
expectIncludes(promptItem, 'diffTextForCurrentSide');
expectIncludes(promptItem, "line.kind === 'removed'");
expectIncludes(promptItem, "line.kind === 'added'");

console.info('presetMigrationPanel tests passed');
