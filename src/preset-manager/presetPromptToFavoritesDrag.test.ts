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

function extractConstBlock(content: string, name: string) {
  const start = content.indexOf(`const ${name}`);
  if (start < 0) throw new Error(`Expected const block to exist: ${name}`);
  const nextConst = content.indexOf('\nconst ', start + 1);
  const nextFunction = content.indexOf('\nfunction ', start + 1);
  const candidates = [nextConst, nextFunction].filter(index => index > start);
  const end = candidates.length ? Math.min(...candidates) : undefined;
  return content.slice(start, end);
}

const presetPanel = readProjectFile('src/preset-manager/components/PresetPanel.vue');
const favoriteFolder = readProjectFile('src/preset-manager/components/FavoriteFolder.vue');
const favoritesPanel = readProjectFile('src/preset-manager/components/FavoritesPanel.vue');

expectIncludes(presetPanel, "const PRESET_PROMPT_FAVORITE_DRAG_OVER_EVENT = 'preset-manager-preset-prompt-dragover';");
expectIncludes(presetPanel, "const PRESET_PROMPT_FAVORITE_DROP_EVENT = 'preset-manager-preset-prompt-drop';");
expectIncludes(presetPanel, "const PRESET_PROMPT_FAVORITE_DRAG_END_EVENT = 'preset-manager-preset-prompt-dragend';");
expectIncludes(presetPanel, 'let activePresetPromptDropFavoriteTarget: HTMLElement | null = null;');
expectIncludes(presetPanel, 'function getPresetPromptDropFavoriteTarget');
expectIncludes(presetPanel, 'function dispatchPresetPromptFavoriteDragOver');
expectIncludes(presetPanel, 'function dispatchPresetPromptFavoriteDrop');
expectIncludes(presetPanel, 'function clearPresetPromptFavoriteDragTarget');
expectIncludes(extractFunctionBlock(presetPanel, 'updatePresetPromptDragFromPoint'), 'const overFavoriteTarget = dispatchPresetPromptFavoriteDragOver(clientX, clientY);');
expectIncludes(extractFunctionBlock(presetPanel, 'updatePresetPromptDragFromPoint'), 'dropIndex.value = overFavoriteTarget ? null : resolvePresetPromptMouseDropIndex(clientY);');
expectIncludes(extractFunctionBlock(presetPanel, 'finishPresetPromptMouseDrag'), 'const handledFavoriteDrop = wasDragging && dispatchPresetPromptFavoriteDrop();');
expectIncludes(extractFunctionBlock(presetPanel, 'finishPresetPromptMouseDrag'), 'if (wasDragging && !handledFavoriteDrop && prompt && isPresetPromptPointerInsidePanel()) {');
expectIncludes(extractFunctionBlock(presetPanel, 'resetPresetPromptMouseDrag'), 'clearPresetPromptFavoriteDragTarget();');
expectIncludes(presetPanel, 'target.dispatchEvent(new CustomEvent(PRESET_PROMPT_FAVORITE_DRAG_OVER_EVENT');
expectIncludes(presetPanel, 'target.dispatchEvent(dropEvent);');
expectIncludes(presetPanel, 'return dropEvent.defaultPrevented;');
expectIncludes(presetPanel, 'prompt: prompt && !isPresetPlaceholderPrompt(prompt) ? klona(prompt as any) : undefined,');
expectIncludes(presetPanel, 'prompt: klona(prompt as any),');

expectIncludes(favoriteFolder, '@preset-manager-preset-prompt-dragover="onPresetPromptFavoriteDragOver"');
expectIncludes(favoriteFolder, '@preset-manager-preset-prompt-drop="onPresetPromptFavoriteDrop"');
expectIncludes(favoriteFolder, '@preset-manager-preset-prompt-dragend="onPresetPromptFavoriteDragEnd"');
expectIncludes(favoriteFolder, "const PRESET_PROMPT_FAVORITE_DRAG_OVER_EVENT = 'preset-manager-preset-prompt-dragover';");
expectIncludes(favoriteFolder, "const PRESET_PROMPT_FAVORITE_DROP_EVENT = 'preset-manager-preset-prompt-drop';");
expectIncludes(favoriteFolder, "const PRESET_PROMPT_FAVORITE_DRAG_END_EVENT = 'preset-manager-preset-prompt-dragend';");
expectIncludes(favoriteFolder, 'function addPromptToCurrentFolder(prompt: PresetPrompt)');
expectIncludes(favoriteFolder, 'function normalizeDroppedPrompt(prompt: PresetPrompt)');
expectIncludes(favoriteFolder, 'function onPresetPromptFavoriteDragOver');
expectIncludes(favoriteFolder, 'function onPresetPromptFavoriteDrop');
expectIncludes(favoriteFolder, 'function onPresetPromptFavoriteDragEnd');
expectIncludes(extractFunctionBlock(favoriteFolder, 'onPresetPromptFavoriteDragOver'), 'isDragOver.value = true;');
expectIncludes(extractFunctionBlock(favoriteFolder, 'onPresetPromptFavoriteDragOver'), "emit('dragFocus', props.folder.id);");
expectIncludes(extractFunctionBlock(favoriteFolder, 'onPresetPromptFavoriteDrop'), 'event.preventDefault();');
expectIncludes(extractFunctionBlock(favoriteFolder, 'onPresetPromptFavoriteDrop'), 'addPromptToCurrentFolder(prompt);');
expectIncludes(extractFunctionBlock(favoriteFolder, 'onPresetPromptFavoriteDragEnd'), "emit('dragClear', props.folder.id);");
expectIncludes(favoriteFolder, 'store.addToFavorites(props.folder.id, normalizeDroppedPrompt(prompt));');
expectIncludes(favoriteFolder, ':class="{ \'drag-over\': isDragOver || dragActive }"');
expectIncludes(cssBlock(favoriteFolder, '.favorite-folder.drag-over'), 'var(--pm-accent)');

expectIncludes(favoritesPanel, '@preset-manager-preset-prompt-dragover="onPresetPromptFavoritePanelDragOver"');
expectIncludes(favoritesPanel, '@preset-manager-preset-prompt-drop="onPresetPromptFavoritePanelDrop"');
expectIncludes(favoritesPanel, '@preset-manager-preset-prompt-dragend="onPresetPromptFavoritePanelDragEnd"');
expectIncludes(favoritesPanel, 'function onPresetPromptFavoritePanelDragOver');
expectIncludes(favoritesPanel, 'function onPresetPromptFavoritePanelDrop');
expectIncludes(favoritesPanel, 'function onPresetPromptFavoritePanelDragEnd');
expectIncludes(extractFunctionBlock(favoritesPanel, 'onPresetPromptFavoritePanelDragOver'), 'activeDropFolderId.value = findDropFolderIdFromPoint(detail.clientY);');
expectIncludes(extractFunctionBlock(favoritesPanel, 'onPresetPromptFavoritePanelDrop'), 'event.preventDefault();');
expectIncludes(extractFunctionBlock(favoritesPanel, 'onPresetPromptFavoritePanelDrop'), 'addDroppedPromptToFolder(folderId, prompt);');
expectIncludes(favoritesPanel, 'function findDropFolderIdFromPoint(clientY: number)');

expectIncludes(presetPanel, 'const pendingScrollAnchor = ref<{ key?: string; index?: number } | null>(null);');
expectIncludes(presetPanel, 'pendingScrollAnchor.value = { key: getPromptKey(prompt), index };');
expectIncludes(extractFunctionBlock(presetPanel, 'syncPromptsFromStore'), 'const scrollAnchor = pendingScrollAnchor.value;');
expectIncludes(extractFunctionBlock(presetPanel, 'syncPromptsFromStore'), 'nextTick(() => scrollToPromptAnchor(scrollAnchor));');

expectIncludes(presetPanel, 'function showPresetPromptReorderSpacer(index: number)');
expectIncludes(presetPanel, 'showPresetPromptReorderSpacer(i)');
expectIncludes(presetPanel, 'showPresetPromptReorderSpacer(prompts.length)');
expectIncludes(presetPanel, 'class="external-insert-spacer preset-reorder"');
expectIncludes(cssBlock(presetPanel, '.external-insert-spacer'), 'border: 1px dashed');
expectIncludes(cssBlock(presetPanel, '.external-insert-spacer.preset-reorder'), 'min-height');

expectIncludes(extractConstBlock(presetPanel, 'dropHintText'), 'const movement = getPresetPromptRelativeMovement(target);');
expectIncludes(presetPanel, 'function getPresetPromptRelativeMovement(targetIndex: number)');
expectIncludes(presetPanel, "if (movement === 0) return '移到原位';");
expectIncludes(presetPanel, "return movement < 0 ? `向上移动 ${Math.abs(movement)} 位` : `向下移动 ${movement} 位`;");
expectNotIncludes(extractConstBlock(presetPanel, 'dropHintText'), '`移到第 ${target + 1} 位`');

console.info('presetPromptToFavoritesDrag tests passed');
