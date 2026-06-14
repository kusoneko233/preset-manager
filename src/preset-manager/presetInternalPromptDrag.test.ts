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

function extractFunctionBlock(content: string, name: string) {
  const start = content.indexOf(`function ${name}`);
  if (start < 0) throw new Error(`Expected function to exist: ${name}`);
  const nextFunction = content.indexOf('\nfunction ', start + 1);
  return content.slice(start, nextFunction < 0 ? undefined : nextFunction);
}

const presetPanel = readProjectFile('src/preset-manager/components/PresetPanel.vue');
const promptItem = readProjectFile('src/preset-manager/components/PromptItem.vue');

expectIncludes(presetPanel, "import { startParentDrag } from '../utils/drag';");
expectIncludes(presetPanel, 'const PRESET_PROMPT_DRAG_START_DISTANCE = 4;');
expectIncludes(presetPanel, 'const presetPromptMouseDrag = reactive');
expectIncludes(presetPanel, 'const presetPromptDragPreview = reactive');
expectIncludes(presetPanel, '@mousedown="onPresetPromptMouseDown($event, prompt, i)"');
expectIncludes(presetPanel, ':manual-drag="true"');
expectIncludes(presetPanel, ':class="{ \'drop-before\': dropIndex === i, focused: isPromptFocused(prompt), selecting: selectionMode, dragging: isPresetPromptDragging(prompt, i) }"');
expectIncludes(presetPanel, ':style="getPresetPromptSlotStyle(prompt, i)"');
expectIncludes(presetPanel, 'class="preset-prompt-drag-preview preset-drag-preview"');
expectIncludes(presetPanel, 'v-if="presetPromptDragPreview.visible && presetPromptDragPreview.prompt"');
expectIncludes(presetPanel, ':prompt="presetPromptDragPreview.prompt"');
expectIncludes(presetPanel, ':preview="true"');
expectIncludes(presetPanel, 'function onPresetPromptMouseDown');
expectIncludes(presetPanel, 'function startPresetPromptMouseDrag');
expectIncludes(presetPanel, 'function onPresetPromptMouseMove');
expectIncludes(presetPanel, 'function finishPresetPromptMouseDrag');
expectIncludes(presetPanel, 'function resetPresetPromptMouseDrag');
expectIncludes(presetPanel, 'function resolvePresetPromptMouseDropIndex(clientY: number)');
expectIncludes(presetPanel, 'function getPresetPromptReflowOffset(index: number)');
expectIncludes(presetPanel, 'function isPresetPromptDragging(prompt: PresetPrompt, index: number)');
expectIncludes(presetPanel, 'requestAnimationFrame(() => updatePresetPromptDragPreviewPosition(clientX, clientY));');
expectIncludes(presetPanel, 'presetPromptDragPreview.x = clientX - presetPromptMouseDrag.offsetX;');
expectIncludes(presetPanel, 'presetPromptDragPreview.y = clientY - presetPromptMouseDrag.offsetY;');
expectIncludes(presetPanel, 'store.reorderPromptInPreset(props.panelId, presetPromptMouseDrag.startIndex, targetIndex);');
expectIncludes(extractFunctionBlock(presetPanel, 'onPresetPromptMouseDown'), 'startParentDrag(parentDocument, {');
expectNotIncludes(extractFunctionBlock(presetPanel, 'handleDrop'), 'store.reorderPromptInPreset(props.panelId, data.index, index);');
expectNotIncludes(presetPanel, 'presetPromptDragPreview.x = clientX +');
expectNotIncludes(presetPanel, 'presetPromptDragPreview.y = clientY +');

expectIncludes(cssBlock(presetPanel, '.prompt-drop-slot'), 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);');
expectIncludes(cssBlock(presetPanel, '.prompt-drop-slot'), 'will-change: transform;');
expectIncludes(cssBlock(presetPanel, '.prompt-drop-slot.dragging'), 'opacity: 0;');
expectIncludes(cssBlock(presetPanel, '.prompt-drop-slot.dragging'), 'pointer-events: none;');
expectNotIncludes(cssBlock(presetPanel, '.prompt-drop-slot.dragging'), 'visibility: hidden;');
expectIncludes(cssBlock(presetPanel, '.preset-prompt-drag-preview'), 'position: fixed;');
expectIncludes(cssBlock(presetPanel, '.preset-prompt-drag-preview'), 'pointer-events: none;');
expectIncludes(cssBlock(presetPanel, '.preset-prompt-drag-preview'), 'transform: translate3d(var(--preset-prompt-drag-x, 0), var(--preset-prompt-drag-y, 0), 0);');

expectIncludes(promptItem, 'manualDrag?: boolean;');
expectIncludes(promptItem, ':draggable="!isPlaceholder && !isPreview && !manualDrag"');
expectIncludes(promptItem, 'const manualDrag = computed(() => !!props.manualDrag);');
expectIncludes(promptItem, 'if (isPreview.value || isPlaceholder.value || manualDrag.value) {');

console.info('presetInternalPromptDrag tests passed');
