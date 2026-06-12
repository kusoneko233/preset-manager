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

const app = readProjectFile('src/preset-manager/App.vue');
const manager = readProjectFile('src/preset-manager/stores/manager.ts');
const migrationPanel = readProjectFile('src/preset-manager/components/PresetMigrationPanel.vue');
const presetPanel = readProjectFile('src/preset-manager/components/PresetPanel.vue');
const promptItem = readProjectFile('src/preset-manager/components/PromptItem.vue');

expectIncludes(manager, 'async applyPromptMigration(nextPrompts: PresetPrompt[], targetPreset:');
expectIncludes(app, "import PresetMigrationPanel from './components/PresetMigrationPanel.vue';");
expectIncludes(app, "type RightAuxTabType = 'empty' | 'preset' | 'chat';");
expectIncludes(app, 'class="right-aux-tab-strip"');
expectIncludes(app, 'class="right-preset-migration-action"');
expectIncludes(app, '<PresetMigrationPanel');
expectIncludes(app, '@focus-main-prompt="focusMainPromptFromMigration"');
expectIncludes(app, 'const mainPresetPanelRef = ref');
expectIncludes(app, 'function focusMainPromptFromMigration');
expectIncludes(migrationPanel, 'class="migration-panel"');
expectIncludes(migrationPanel, 'buildPresetMigrationDiff');
expectIncludes(migrationPanel, 'applyPresetMigrationSelection');
expectIncludes(migrationPanel, 'buildPromptContentDiffLines');
expectIncludes(migrationPanel, 'diff.summary.duplicate');
expectIncludes(migrationPanel, 'diff.summary.conflict');
expectIncludes(migrationPanel, 'item.textDelta');
expectIncludes(migrationPanel, 'text-delta');
expectIncludes(migrationPanel, 'selectedKeys');
expectIncludes(migrationPanel, ':disabled="!item.selectable"');
expectIncludes(migrationPanel, "store.isPromptLocked(item.key, 'main')");
expectIncludes(migrationPanel, 'history.recordOperation');
expectIncludes(migrationPanel, 'store.applyPromptMigration');
expectIncludes(migrationPanel, '锁定');

expectIncludes(migrationPanel, 'const emit = defineEmits<{');
expectIncludes(migrationPanel, 'focusMainPrompt:');
expectIncludes(migrationPanel, 'class="migration-bookmark"');
expectIncludes(migrationPanel, '@click.prevent="focusMigrationItem(item)"');
expectIncludes(migrationPanel, 'data-migration-key');
expectIncludes(migrationPanel, 'class="migration-diff-code old"');
expectIncludes(migrationPanel, 'class="migration-diff-code new"');
expectIncludes(migrationPanel, "line.kind === 'removed'");
expectIncludes(migrationPanel, "line.kind === 'added'");
expectIncludes(migrationPanel, 'scrollMigrationItemIntoView');
expectIncludes(migrationPanel, 'mainAnchorIndex: item.mainAnchorIndex');
expectIncludes(presetPanel, 'data-preset-prompt-key');
expectIncludes(presetPanel, 'data-preset-prompt-index');
expectIncludes(presetPanel, 'function scrollToPromptAnchor');
expectIncludes(presetPanel, 'defineExpose({');
expectIncludes(presetPanel, "if (relation === 'same-id' || relation === 'same-content') return '';");
expectIncludes(promptItem, 'v-if="!(isGroupHeader && collapsedGroupCount)"');
expectIncludes(promptItem, 'v-else-if="isGroupHeader && collapsedGroupCount"');

console.info('presetMigrationPanel tests passed');
