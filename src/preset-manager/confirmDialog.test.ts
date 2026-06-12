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

function expectNotIncludes(content: string, unexpected: string) {
  if (content.includes(unexpected)) {
    throw new Error(`Expected file not to include: ${unexpected}`);
  }
}

function expectNoNativeConfirm(content: string, file: string) {
  if (/(^|[^.\w])confirm\s*\(/m.test(content)) {
    throw new Error(`Expected ${file} not to use native confirm()`);
  }
}

const store = readProjectFile('src/preset-manager/stores/confirm.ts');
const dialog = readProjectFile('src/preset-manager/components/ConfirmDialog.vue');
const app = readProjectFile('src/preset-manager/App.vue');
const migrationPanel = readProjectFile('src/preset-manager/components/PresetMigrationPanel.vue');
const presetPanel = readProjectFile('src/preset-manager/components/PresetPanel.vue');
const favoritesPanel = readProjectFile('src/preset-manager/components/FavoritesPanel.vue');
const historyPanel = readProjectFile('src/preset-manager/components/HistoryPanel.vue');
const devThemePanel = readProjectFile('src/preset-manager/components/DevThemePanel.vue');

expectIncludes(store, 'type ConfirmTone =');
expectIncludes(store, 'confirm(options: string | ConfirmOptions)');
expectIncludes(store, 'resolve(false)');
expectIncludes(store, 'resolve(true)');

expectIncludes(dialog, 'role="dialog"');
expectNotIncludes(dialog, '<Teleport');
expectNotIncludes(dialog, 'parentFloatingRoot');
expectIncludes(dialog, 'data-preset-manager-floating-panel="confirm"');
expectIncludes(dialog, '@keydown.esc.stop.prevent="confirmDialog.cancel"');
expectIncludes(dialog, 'confirmDialog.confirmAction');
expectIncludes(dialog, 'confirmDialog.cancel');
expectIncludes(dialog, 'confirmDialog.options?.tone');
expectIncludes(dialog, '确认');
expectIncludes(dialog, 'width: min(340px, 100%);');
expectIncludes(dialog, 'border-radius: 10px;');
expectIncludes(dialog, 'padding: 12px 12px 9px;');
expectNotIncludes(dialog, 'width: min(420px, 100%);');
expectNotIncludes(dialog, 'padding: 10px 11px;');
expectNotIncludes(dialog, 'background: var(--pm-bg-soft);');

expectIncludes(app, "import ConfirmDialog from './components/ConfirmDialog.vue';");
expectIncludes(app, '<ConfirmDialog />');

expectIncludes(migrationPanel, 'const confirmDialog = useConfirmStore();');
expectIncludes(migrationPanel, 'await confirmDialog.confirm');
expectNoNativeConfirm(migrationPanel, 'PresetMigrationPanel.vue');
expectIncludes(presetPanel, 'const confirmDialog = useConfirmStore();');
expectIncludes(presetPanel, 'await confirmDialog.confirm');
expectNoNativeConfirm(presetPanel, 'PresetPanel.vue');
expectIncludes(favoritesPanel, 'const confirmDialog = useConfirmStore();');
expectIncludes(favoritesPanel, 'await confirmDialog.confirm');
expectNoNativeConfirm(favoritesPanel, 'FavoritesPanel.vue');
expectIncludes(historyPanel, 'const confirmDialog = useConfirmStore();');
expectIncludes(historyPanel, 'await confirmDialog.confirm');
expectNoNativeConfirm(historyPanel, 'HistoryPanel.vue');
expectIncludes(devThemePanel, 'const confirmDialog = useConfirmStore();');
expectIncludes(devThemePanel, 'await confirmDialog.confirm');
expectNoNativeConfirm(devThemePanel, 'DevThemePanel.vue');

console.info('confirmDialog tests passed');
