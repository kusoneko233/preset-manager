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
const promptPreviewBlock = extractBlock(promptItem, 'class="prompt-preview"', '</div>');
const toggleBlock = extractBlock(promptItem, 'function toggle() {', '\n}\n\nfunction normalizeRole');
const buildDraftUpdatesBlock = extractBlock(promptItem, 'function buildDraftUpdates() {', '\n}\n\nfunction hasDraftChanges');
const inlineEditorBlock = extractBlock(promptItem, 'class="prompt-inline-editor"', 'class="prompt-actions"');
const promptActionsBlock = extractBlock(promptItem, 'class="prompt-actions"', '</div>');
const promptRowBlock = extractBlock(promptItem, 'class="prompt-row"', '</div>');

expectExcludes(presetPanel, 'PromptEditDialog');
expectExcludes(presetPanel, 'editingPrompt');
expectExcludes(presetPanel, 'editingInitialFocus');
expectExcludes(presetPanel, 'function openEditor');
expectExcludes(presetPanel, '@edit-content=');
expectIncludes(presetPanel, '@save-edits="savePromptEdits(prompt, $event)"');
expectIncludes(presetPanel, 'async function savePromptEdits(prompt: PresetPrompt, updates: Partial<PresetPrompt>)');

expectIncludes(promptItem, 'const editing = ref(false);');
expectIncludes(promptItem, 'saveEdits: [updates: Partial<PresetPrompt>];');
expectIncludes(promptItem, 'class="prompt-inline-editor"');
expectIncludes(promptItem, 'class="prompt-title-edit"');
expectIncludes(promptItem, 'class="prompt-title-edit-icon"');
expectIncludes(promptItem, 'class="prompt-title-input"');
expectIncludes(promptItem, 'const editingTitleName = ref(false);');
expectIncludes(promptItem, 'const titleInput = ref<HTMLInputElement>();');
expectIncludes(promptItem, 'function startTitleNameEdit()');
expectIncludes(promptItem, 'function stopTitleNameEdit()');
expectIncludes(promptItem, 'const triggerPanelOpen = ref(false);');
expectIncludes(promptItem, 'const promptItemRoot = ref<HTMLElement | null>(null);');
expectIncludes(promptItem, 'function closeTriggerPanelFromOutside(event: Event)');
expectIncludes(promptItem, "document.addEventListener('pointerdown', closeTriggerPanelFromOutside, true);");
expectIncludes(promptItem, "document.addEventListener('mousedown', closeTriggerPanelFromOutside, true);");
expectIncludes(promptItem, "document.addEventListener('click', closeTriggerPanelFromOutside, true);");
expectIncludes(promptItem, "window.addEventListener('keydown', closeTriggerPanelFromKey, true);");
expectIncludes(promptItem, "if (event.key === 'Escape') triggerPanelOpen.value = false;");
expectIncludes(promptItem, "target?.closest?.('.inline-trigger-field')");
expectIncludes(promptItem, 'inline-trigger-summary');
expectIncludes(promptItem, 'class="inline-trigger-panel"');
expectIncludes(promptItem, 'triggerSummaryLabel');
expectIncludes(promptItem, 'class="inline-trigger-pill"');
expectIncludes(promptItem, 'class="inline-trigger-checkbox"');
expectIncludes(promptItem, 'class="inline-content-input"');
expectIncludes(promptItem, 'class="inline-content-diff-overlay"');
expectIncludes(promptItem, 'diffTextForCurrentSide');
expectExcludes(promptItem, 'contentInputHiddenForDiff');
expectIncludes(promptItem, 'class="inline-meta-controls"');
expectIncludes(promptItem, 'class="inline-select inline-control-capsule"');
expectIncludes(promptItem, 'class="inline-lock-toggle inline-control-capsule"');
expectIncludes(promptItem, 'class="inline-trigger-summary inline-control-capsule"');
expectIncludes(promptItem, '.prompt-item.expanded .prompt-left-marker');
expectExcludes(promptItem, 'class="inline-editor-actions"');
expectIncludes(promptItem, '@click.stop="startInlineEdit(\'content\')"');
expectIncludes(promptItem, '@keydown.enter.stop.prevent="startInlineEdit(\'content\')"');
expectIncludes(promptPreviewBlock, 'role="button"');
expectIncludes(promptPreviewBlock, 'tabindex="0"');
expectIncludes(promptPreviewBlock, '@click.stop="startInlineEdit(\'content\')"');
expectIncludes(promptPreviewBlock, '@keydown.enter.stop.prevent="startInlineEdit(\'content\')"');
expectExcludes(promptItem, 'name="pen-line" size="sm" title=');
expectExcludes(promptItem, '@click.stop="startInlineEdit(\'name\')"');
expectIncludes(toggleBlock, "startInlineEdit('content');");
expectIncludes(toggleBlock, 'editing.value = false;');
expectIncludes(toggleBlock, 'expanded.value = false;');
expectExcludes(toggleBlock, 'expanded.value = !expanded.value;');
expectIncludes(promptItem, "type InlineEditFocus = 'content';");
expectIncludes(promptItem, "function startInlineEdit(initialFocus: InlineEditFocus = 'content')");
expectIncludes(presetPanel, "if (prompt) startInlineEditForPrompt(prompt, 'content');");
expectExcludes(presetPanel, 'if (prompt) startInlineEditForPrompt(prompt);');
expectIncludes(presetPanel, 'const copiedPromptClipboard = ref<PresetNormalPrompt | null>(null);');
expectIncludes(presetPanel, 'const contextPasteIndex = ref(0);');
expectIncludes(presetPanel, 'function resolveContextPasteIndex(event: MouseEvent, prompt: PresetPrompt)');
expectIncludes(presetPanel, 'function copyPromptFromContext()');
expectIncludes(presetPanel, 'async function pastePromptFromContext()');
expectIncludes(presetPanel, 'function openPromptTailContextMenu(event: MouseEvent)');
expectIncludes(presetPanel, '@contextmenu.prevent.stop="openPromptTailContextMenu"');
expectIncludes(presetPanel, 'contextPasteIndex.value = resolveContextPasteIndex(event, prompt);');
expectIncludes(presetPanel, 'await store.insertPromptToPreset(normalizePrompt(promptToPaste), props.panelId, index);');
expectIncludes(presetPanel, 'Icon name="clipboard-paste"');
expectIncludes(promptItem, 'const AUTO_SAVE_DELAY_MS');
expectIncludes(promptItem, 'function scheduleAutoSave()');
expectIncludes(promptItem, 'function flushAutoSave()');
expectIncludes(promptItem, 'function buildDraftUpdates()');
expectIncludes(promptItem, 'function hasDraftChanges()');
expectIncludes(promptItem, 'watchDraftForAutoSave');
expectExcludes(buildDraftUpdatesBlock, 'forbid_overrides:');
expectIncludes(promptItem, "emit('saveEdits'");
expectIncludes(promptItem, 'min-height: clamp(260px, 42vh, 560px);');
expectIncludes(inlineEditorBlock, '<option value="system">\\u7cfb\\u7edf</option>'.replace(/\\u([0-9a-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))));
expectIncludes(inlineEditorBlock, '<option value="user">\\u7528\\u6237</option>'.replace(/\\u([0-9a-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))));
expectIncludes(inlineEditorBlock, '<option value="assistant">AI\\u52a9\\u624b</option>'.replace(/\\u([0-9a-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))));
expectIncludes(promptRowBlock, 'class="prompt-title-cluster"');
expectIncludes(promptRowBlock, 'class="prompt-group-toggle"');
expectIncludes(promptRowBlock, 'class="prompt-group-count"');
expectExcludes(promptRowBlock, 'class="prompt-lock-btn"');
expectExcludes(promptItem, 'class="prompt-chevron"');
expectIncludes(inlineEditorBlock, 'class="inline-field inline-content-field"');
expectIncludes(inlineEditorBlock, 'class="inline-content-shell"');
expectIncludes(inlineEditorBlock, 'class="inline-content-diff-overlay"');
expectIncludes(inlineEditorBlock, ':class="{ \'has-diff-overlay\': diffLinesForCurrentSide.length }"');
expectIncludes(inlineEditorBlock, 'v-if="diffLinesForCurrentSide.length"');
expectExcludes(inlineEditorBlock, '@focus="contentInputHiddenForDiff = true"');
expectExcludes(inlineEditorBlock, '@blur="contentInputHiddenForDiff = false"');
expectExcludes(inlineEditorBlock, 'class="inline-diff-preview"');
expectIncludes(inlineEditorBlock, 'class="inline-meta-controls"');
if (inlineEditorBlock.indexOf('class="inline-field inline-content-field"') > inlineEditorBlock.indexOf('class="inline-meta-controls"')) {
  throw new Error('Expected content editor to appear before role/position/lock controls');
}
expectIncludes(inlineEditorBlock, 'class="inline-trigger-field"');
if (inlineEditorBlock.indexOf('class="inline-trigger-field"') < inlineEditorBlock.indexOf('class="inline-meta-controls"')) {
  throw new Error('Expected trigger capsule to live in the same control row as role/position/lock');
}
expectExcludes(inlineEditorBlock, 'draft.forbidOverrides');
expectExcludes(inlineEditorBlock, 'forbid_overrides');
expectExcludes(inlineEditorBlock, 'type="submit"');
expectExcludes(inlineEditorBlock, 'inline-editor-btn');
expectExcludes(inlineEditorBlock, '>\\u53d6\\u6d88<'.replace(/\\u([0-9a-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))));
expectExcludes(inlineEditorBlock, '>\\u4fdd\\u5b58<'.replace(/\\u([0-9a-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))));
expectExcludes(promptActionsBlock, 'name="minus"');
expectExcludes(promptActionsBlock, '@click.stop="$emit(\'detach\')"');
expectExcludes(promptItem, 'class="inline-field inline-name-field"');
expectExcludes(promptItem, 'ref="nameInput"');
expectExcludes(promptItem, 'const nameInput = ref<HTMLInputElement>();');
expectExcludes(promptItem, "type InlineEditFocus = 'name' | 'content';");
expectExcludes(promptItem, 'class="inline-state-toggle"');
expectExcludes(promptItem, 'class="inline-state-dot"');
expectExcludes(promptItem, 'enabled: draft.enabled,');
expectExcludes(promptItem, 'class="inline-trigger-options"');
expectExcludes(promptItem, 'class="inline-trigger-pill-group"');
expectExcludes(promptItem, 'editContent: [];');
expectExcludes(promptItem, "$emit('editContent')");
expectExcludes(promptItem, "$emit('edit')");

console.info('promptEditingInteraction tests passed');
