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

const titleBar = readProjectFile('src/preset-manager/components/TitleBar.vue');
const presetPanel = readProjectFile('src/preset-manager/components/PresetPanel.vue');
const promptItem = readProjectFile('src/preset-manager/components/PromptItem.vue');
const sidebarPresetList = readProjectFile('src/preset-manager/components/SidebarPresetList.vue');
const presetItemStart = sidebarPresetList.indexOf('.sidebar-preset-item {');
const presetItemEnd = sidebarPresetList.indexOf('.sidebar-preset-item:hover', presetItemStart);
const presetItemBlock = sidebarPresetList.slice(presetItemStart, presetItemEnd);
const promptItemStart = promptItem.indexOf('.prompt-item {');
const promptItemEnd = promptItem.indexOf('.prompt-item:hover', promptItemStart);
const promptItemBlock = promptItem.slice(promptItemStart, promptItemEnd);
const promptItemHoverStart = promptItem.indexOf('.prompt-item:hover {');
const promptItemHoverEnd = promptItem.indexOf('.prompt-item.expanded', promptItemHoverStart);
const promptItemHoverBlock = promptItem.slice(promptItemHoverStart, promptItemHoverEnd);
const promptItemExpandedStart = promptItem.indexOf('.prompt-item.expanded {');
const promptItemExpandedEnd = promptItem.indexOf('.prompt-item.locked', promptItemExpandedStart);
const promptItemExpandedBlock = promptItem.slice(promptItemExpandedStart, promptItemExpandedEnd);
const promptItemLockedStart = promptItem.indexOf('.prompt-item.locked {');
const promptItemLockedEnd = promptItem.indexOf('.prompt-item.locked.expanded', promptItemLockedStart);
const promptItemLockedBlock = promptItem.slice(promptItemLockedStart, promptItemLockedEnd);

expectIncludes(titleBar, '@click.stop="togglePresetMenu"');
expectIncludes(titleBar, 'type="button"');
expectIncludes(titleBar, '@pointerdown.stop');
expectIncludes(titleBar, '@click.stop="selectPreset(name)"');
expectIncludes(titleBar, 'emit(\'selectPreset\', name)');

expectNotIncludes(presetPanel, '<header v-if="panelId === \'main\'" class="preset-panel-head">');
expectNotIncludes(presetPanel, '<span class="preset-panel-kicker">主预设</span>');
expectIncludes(presetPanel, '<header v-if="panelId === \'second\' && showSecondHeader" class="preset-panel-head">');
expectIncludes(presetPanel, 'const showSecondHeader = computed(() => props.showSecondHeader ?? true);');
expectIncludes(presetPanel, '.preset-panel.main-panel .prompt-list');

expectIncludes(promptItem, '.prompt-item.disabled {');
expectIncludes(promptItem, 'opacity: 1;');
expectIncludes(promptItem, 'color: color-mix(in srgb, var(--pm-text-muted) 56%, transparent);');
expectIncludes(promptItem, 'color: color-mix(in srgb, var(--pm-text-muted) 44%, transparent);');
expectIncludes(promptItemBlock, 'border: 0;');
expectIncludes(promptItemBlock, 'background: var(--pm-bg-card);');
expectIncludes(promptItemBlock, 'transition: background 0.14s ease, opacity 0.14s ease;');
expectNotIncludes(promptItemBlock, 'border: 1px solid');
expectIncludes(promptItemHoverBlock, 'background: color-mix(in srgb, var(--pm-bg-card-hover) 86%, var(--pm-text) 4%);');
expectNotIncludes(promptItemHoverBlock, 'border-color');
expectIncludes(promptItemExpandedBlock, 'background: var(--pm-bg-card);');
expectIncludes(promptItemExpandedBlock, 'box-shadow: none;');
expectNotIncludes(promptItemExpandedBlock, 'border-color');
expectNotIncludes(promptItemExpandedBlock, 'color-mix(in srgb, var(--pm-border-strong)');
expectIncludes(promptItemLockedBlock, 'box-shadow: none;');
expectNotIncludes(promptItemLockedBlock, 'border-color');
expectNotIncludes(promptItemLockedBlock, 'var(--pm-warning)');

expectIncludes(sidebarPresetList, 'color: var(--pm-text);');
expectIncludes(sidebarPresetList, '.sidebar-preset-item.active {\n  background: var(--pm-row-active);');
expectNotIncludes(sidebarPresetList, '.sidebar-preset-item.active::before');
expectNotIncludes(sidebarPresetList, 'background: color-mix(in srgb, var(--pm-text) 7%, transparent);');
expectNotIncludes(sidebarPresetList, 'background: color-mix(in srgb, var(--pm-text) 12%, transparent);');
expectNotIncludes(sidebarPresetList, 'border: 1px solid color-mix(in srgb, var(--pm-text) 9%, transparent);');
expectNotIncludes(sidebarPresetList, 'box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);');
expectIncludes(sidebarPresetList, '.preset-icon {');
expectIncludes(sidebarPresetList, '.preset-name {');
expectIncludes(sidebarPresetList, 'font-weight: 520;');
expectNotIncludes(sidebarPresetList, 'height: 50%;');
expectNotIncludes(sidebarPresetList, 'top: 34%;');
expectNotIncludes(sidebarPresetList, '0 8px 18px');
expectNotIncludes(sidebarPresetList, 'class="preset-badge"');
expectNotIncludes(sidebarPresetList, '主</span>');
expectNotIncludes(sidebarPresetList, '副</span>');
expectNotIncludes(presetItemBlock, 'color: var(--pm-text-muted);');
expectNotIncludes(sidebarPresetList, '.sidebar-preset-item.secondary:not(.active)');

console.info('codexAnnotatedLayout tests passed');
