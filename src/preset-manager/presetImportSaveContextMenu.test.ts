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

function expectOrder(content: string, first: string, second: string) {
  const firstIndex = content.indexOf(first);
  const secondIndex = content.indexOf(second);
  if (firstIndex < 0) throw new Error(`Expected file to include first marker: ${first}`);
  if (secondIndex < 0) throw new Error(`Expected file to include second marker: ${second}`);
  if (firstIndex > secondIndex) throw new Error(`Expected "${first}" to appear before "${second}"`);
}

function extractFunctionBlock(content: string, name: string) {
  const start = content.indexOf(`function ${name}`);
  if (start < 0) throw new Error(`Expected function to exist: ${name}`);
  const nextFunction = content.indexOf('\nfunction ', start + 1);
  return content.slice(start, nextFunction < 0 ? undefined : nextFunction);
}

function cssBlock(content: string, selector: string) {
  const start = content.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`Expected CSS selector to exist: ${selector}`);
  const end = content.indexOf('\n}', start);
  if (end < 0) throw new Error(`Expected CSS selector to close: ${selector}`);
  return content.slice(start, end + 2);
}

const app = readProjectFile('src/preset-manager/App.vue');
const titleBar = readProjectFile('src/preset-manager/components/TitleBar.vue');
const sidebarPresetList = readProjectFile('src/preset-manager/components/SidebarPresetList.vue');
const presetPanel = readProjectFile('src/preset-manager/components/PresetPanel.vue');
const managerStore = readProjectFile('src/preset-manager/stores/manager.ts');

expectIncludes(titleBar, 'savePreset: [];');
expectIncludes(titleBar, 'IconButton name="save"');
expectIncludes(titleBar, 'title="保存当前预设"');
expectIncludes(titleBar, '@click="$emit(\'savePreset\')"');
expectOrder(titleBar, 'IconButton name="corner-up-right"', 'IconButton name="save"');
expectOrder(titleBar, 'IconButton name="save"', 'class="sidebar-toggle-button"');

expectIncludes(app, '@save-preset="saveCurrentPresetToTavern"');
expectIncludes(app, 'const presetImportInput = ref<HTMLInputElement | null>(null);');
expectIncludes(app, 'ref="presetImportInput"');
expectIncludes(app, '@change="handleImportPresetFile"');
expectIncludes(app, 'async function saveCurrentPresetToTavern()');
expectIncludes(extractFunctionBlock(app, 'saveCurrentPresetToTavern'), "klona(manager.preset ?? getPreset('in_use'))");
expectIncludes(extractFunctionBlock(app, 'saveCurrentPresetToTavern'), "replacePreset(presetName, nextPreset, { render: 'immediate' });");
expectIncludes(extractFunctionBlock(app, 'saveCurrentPresetToTavern'), "replacePreset('in_use', nextPreset, { render: 'immediate' });");
expectIncludes(app, 'function triggerPresetImport()');
expectIncludes(extractFunctionBlock(app, 'triggerPresetImport'), 'presetImportInput.value?.click();');
expectIncludes(app, 'async function handleImportPresetFile(event: Event)');
expectIncludes(extractFunctionBlock(app, 'handleImportPresetFile'), 'importRawPreset(presetName, await file.text())');
expectIncludes(extractFunctionBlock(app, 'handleImportPresetFile'), 'manager.refreshPresetList();');
expectIncludes(extractFunctionBlock(app, 'runSidebarPresetAction'), "if (payload.action === 'importPreset') triggerPresetImport();");

expectIncludes(sidebarPresetList, "export type SidebarPresetAction = 'createPreset' | 'importPreset' | 'openSecondPreset' | 'renamePreset' | 'deletePreset';");
expectIncludes(sidebarPresetList, 'class="sidebar-section-actions"');
expectIncludes(sidebarPresetList, 'class="sidebar-section-import"');
expectIncludes(sidebarPresetList, 'title="导入预设"');
expectIncludes(sidebarPresetList, 'aria-label="导入预设"');
expectIncludes(sidebarPresetList, '@click.stop="importPreset"');
expectIncludes(sidebarPresetList, '@contextmenu.prevent.stop="openEmptyPresetContextMenu($event)"');
expectIncludes(sidebarPresetList, 'const contextMenuKind = ref<');
expectIncludes(sidebarPresetList, "contextMenuKind.value = 'preset';");
expectIncludes(sidebarPresetList, "contextMenuKind.value = 'empty';");
expectIncludes(sidebarPresetList, 'function openEmptyPresetContextMenu(event: MouseEvent)');
expectIncludes(sidebarPresetList, "runPresetAction('importPreset', $event)");
expectIncludes(sidebarPresetList, '<span>导入预设</span>');
expectIncludes(sidebarPresetList, "emit('preset-action', { action: 'importPreset', presetName: props.activePresetName });");
expectIncludes(sidebarPresetList, 'const iframeEl = inject<HTMLIFrameElement>(\'iframeElement\')!;');
expectIncludes(sidebarPresetList, 'function getPanelDocument()');
expectIncludes(sidebarPresetList, "getPanelDocument().addEventListener('pointerdown', closePresetContextMenuFromPointer, true);");
expectIncludes(sidebarPresetList, "getPanelDocument().addEventListener('click', closePresetContextMenuFromPointer, true);");
expectIncludes(sidebarPresetList, "getPanelDocument().defaultView?.addEventListener('keydown', closePresetContextMenuFromKey, true);");
expectNotIncludes(sidebarPresetList, "document.addEventListener('pointerdown', closePresetContextMenuFromPointer, true);");

const contextMenuBlock = cssBlock(sidebarPresetList, '.preset-context-menu');
const contextItemBlock = cssBlock(sidebarPresetList, '.preset-context-item');
expectIncludes(contextMenuBlock, 'width: 172px;');
expectIncludes(contextMenuBlock, 'padding: 3px;');
expectIncludes(contextMenuBlock, 'border: 0;');
expectIncludes(contextMenuBlock, 'background: color-mix(in srgb, #000 72%, var(--pm-bg-elevated));');
expectIncludes(contextMenuBlock, 'box-shadow: 0 10px 28px rgba(0, 0, 0, 0.32);');
expectNotIncludes(contextMenuBlock, 'blur(32px)');
expectIncludes(contextItemBlock, 'min-height: 28px;');
expectIncludes(contextItemBlock, 'padding: 0 8px;');

const promptContextMenuBlock = cssBlock(presetPanel, '.prompt-context-menu');
const promptContextItemBlock = cssBlock(presetPanel, '.prompt-context-item');
expectIncludes(presetPanel, 'function getPanelDocument()');
expectIncludes(presetPanel, "getPanelDocument().addEventListener('pointerdown', closePromptContextMenuFromPointer, true);");
expectIncludes(presetPanel, "getPanelDocument().addEventListener('click', closePromptContextMenuFromPointer, true);");
expectIncludes(presetPanel, "getPanelDocument().defaultView?.addEventListener('keydown', closePromptContextMenuFromKey, true);");
expectIncludes(promptContextMenuBlock, 'width: 156px;');
expectIncludes(promptContextMenuBlock, 'padding: 3px;');
expectIncludes(promptContextMenuBlock, 'border: 0;');
expectIncludes(promptContextMenuBlock, 'background: color-mix(in srgb, #000 72%, var(--pm-bg-elevated));');
expectIncludes(promptContextMenuBlock, 'box-shadow: 0 10px 28px rgba(0, 0, 0, 0.32);');
expectNotIncludes(promptContextMenuBlock, 'blur(16px)');
expectIncludes(promptContextItemBlock, 'min-height: 28px;');
expectIncludes(promptContextItemBlock, 'padding: 0 8px;');

expectIncludes(managerStore, 'refreshPresetList()');
expectIncludes(managerStore, 'const names = getLoadablePresetNames();');

console.info('presetImportSaveContextMenu tests passed');
