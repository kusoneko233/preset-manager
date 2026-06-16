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

function cssBlock(content: string, selector: string) {
  const start = content.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Expected CSS selector to exist: ${selector}`);
  const end = content.indexOf('\n}', start);
  if (end === -1) throw new Error(`Expected CSS selector to close: ${selector}`);
  return content.slice(start, end + 2);
}

const app = readProjectFile('src/preset-manager/App.vue');
const panel = readProjectFile('src/preset-manager/components/PresetPanel.vue');
const promptItem = readProjectFile('src/preset-manager/components/PromptItem.vue');

expectIncludes(panel, 'const selectionMode = ref(false);');
expectIncludes(panel, 'v-if="selectionMode && selectedPromptKeys.length"');
expectIncludes(panel, 'v-if="selectionMode && !isPresetPlaceholderPrompt(prompt)"');
expectIncludes(panel, 'selecting: selectionMode');
expectIncludes(panel, '@contextmenu.prevent.stop="openPromptContextMenu($event, prompt)"');
expectIncludes(panel, 'class="prompt-context-backdrop"');
expectIncludes(panel, 'class="prompt-context-menu"');
expectIncludes(panel, "function enterSelectionMode");
expectIncludes(panel, "function exitSelectionMode");
expectIncludes(panel, "async function bulkDeleteSelected");
expectIncludes(panel, "confirmDialog.confirm({");
expectIncludes(panel, "store.deletePromptEverywhere(getPromptKey(prompt), props.panelId)");
expectIncludes(panel, "@click=\"finishSelectionMode\"");
expectIncludes(panel, "@click=\"bulkDeleteSelected\"");
expectIncludes(panel, 'function togglePromptLockFromContext()');
expectIncludes(panel, '@click="togglePromptLockFromContext"');
expectIncludes(panel, "contextPrompt && isPromptLocked(contextPrompt) ? 'lock-open' : 'lock'");
expectIncludes(panel, "contextPrompt && isPromptLocked(contextPrompt)");
expectIncludes(panel, 'function getPanelDocument()');
expectIncludes(panel, "getPanelDocument().addEventListener('pointerdown', closePromptContextMenuFromPointer, true)");
expectIncludes(panel, "getPanelDocument().defaultView?.addEventListener('keydown', closePromptContextMenuFromKey, true)");
expectIncludes(panel, "parentDocument.addEventListener('pointerdown', closePromptContextMenuFromPointer, true)");
expectIncludes(app, '.app-root > :deep(.prompt-context-menu)');
expectIncludes(app, '.app-root > :deep(.prompt-context-backdrop)');
expectNotIncludes(panel, "v-if=\"!isPresetPlaceholderPrompt(prompt)\"\n          class=\"prompt-select-toggle\"");
expectNotIncludes(panel, '<span v-else class="prompt-select-spacer" />');

const normalSlotBlock = cssBlock(panel, '.prompt-drop-slot');
expectIncludes(normalSlotBlock, 'grid-template-columns: minmax(0, 1fr);');
expectIncludes(panel, '.prompt-drop-slot.selecting {');
expectIncludes(panel, 'grid-template-columns: 22px minmax(0, 1fr);');

const promptItemBlock = cssBlock(promptItem, '.prompt-item');
const promptItemHoverBlock = cssBlock(promptItem, '.prompt-item:hover');
expectIncludes(promptItemBlock, 'background: var(--pm-bg-card);');
expectIncludes(promptItemHoverBlock, 'background: color-mix(in srgb, var(--pm-bg-card-hover) 86%, var(--pm-text) 4%);');

console.info('promptSelectionMode tests passed');
