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

const presetPanel = readProjectFile('src/preset-manager/components/PresetPanel.vue');
const favoriteFolder = readProjectFile('src/preset-manager/components/FavoriteFolder.vue');
const workbench = readProjectFile('src/preset-manager/components/WorkbenchPanel.vue');
const promptItem = readProjectFile('src/preset-manager/components/PromptItem.vue');

expectIncludes(presetPanel, 'const externalPromptInsertPreview = ref<PresetNormalPrompt | null>(null);');
expectIncludes(presetPanel, 'class="external-insert-spacer"');
expectIncludes(presetPanel, 'showExternalPromptInsertSpacer(i)');
expectIncludes(presetPanel, 'showExternalPromptInsertSpacer(prompts.length)');
expectIncludes(presetPanel, 'function showExternalPromptInsertSpacer(index: number)');
expectIncludes(presetPanel, "externalPromptInsertPreview.value = prompt ? normalizePrompt(prompt) : null;");
expectIncludes(presetPanel, 'externalPromptInsertPreview.value = null;');
expectIncludes(presetPanel, 'CustomEvent<{ clientY?: number; prompt?: PresetPrompt }>');
expectNotIncludes(presetPanel, 'class="prompt-insert-preview-slot"');
expectNotIncludes(presetPanel, ':prompt="externalPromptInsertPreview"');

expectIncludes(favoriteFolder, 'prompt: klona(item as any),');
expectIncludes(favoriteFolder, "previewMode: 'preset'");
expectIncludes(favoriteFolder, "previewMode: 'sidebar'");
expectIncludes(favoriteFolder, "favoriteMouseDrag.dragging && favoriteMouseDrag.startIndex === index");
expectIncludes(favoriteFolder, 'v-if="favoriteDragPreview.visible"');
expectIncludes(favoriteFolder, 'class="fav-drag-preview preset-drag-preview"');
expectIncludes(favoriteFolder, ':class="{ preset: favoriteDragPreview.mode === \'preset\' }"');
expectIncludes(favoriteFolder, ':style="favoriteDragPreview.mode === \'preset\' ? favoritePresetDragPreviewStyle : favoriteDragPreviewStyle"');
expectIncludes(favoriteFolder, 'const favoritePresetDragPreviewStyle = computed');
expectIncludes(favoriteFolder, 'presetPreviewPrompt');
expectIncludes(favoriteFolder, 'v-if="favoriteDragPreview.mode === \'sidebar\'"');
expectIncludes(favoriteFolder, 'v-else-if="presetPreviewPrompt"');
expectIncludes(workbench, 'prompt: klona(store.draftToPrompt(draft) as any),');
expectIncludes(workbench, "previewMode: 'preset'");
expectIncludes(workbench, "previewMode: 'sidebar'");
expectIncludes(workbench, "draftMouseDrag.dragging && draftMouseDrag.draftId === draft.id");
expectIncludes(workbench, 'v-if="draftDragPreview.visible"');
expectIncludes(workbench, 'class="draft-drag-preview preset-drag-preview"');
expectIncludes(workbench, ':class="{ preset: draftDragPreview.mode === \'preset\' }"');
expectIncludes(workbench, ':style="draftDragPreview.mode === \'preset\' ? draftPresetDragPreviewStyle : draftDragPreviewStyle"');
expectIncludes(workbench, 'const draftPresetDragPreviewStyle = computed');
expectIncludes(workbench, 'presetPreviewPrompt');
expectIncludes(workbench, 'v-if="draftDragPreview.mode === \'sidebar\'"');
expectIncludes(workbench, 'v-else-if="presetPreviewPrompt"');
expectNotIncludes(favoriteFolder, 'detail: { clientY },');
expectNotIncludes(workbench, 'detail: { clientY },');

expectIncludes(promptItem, 'preview?: boolean;');
expectIncludes(promptItem, 'const isPreview = computed(() => !!props.preview);');
expectIncludes(promptItem, ":draggable=\"!isPlaceholder && !isPreview && !manualDrag\"");
expectIncludes(promptItem, "preview: isPreview");
expectIncludes(promptItem, "if (isPlaceholder.value || isPreview.value) return;");
expectIncludes(promptItem, "if (isPreview.value || isPlaceholder.value || manualDrag.value) {");

console.info('presetPanelExternalInsertPreview tests passed');
