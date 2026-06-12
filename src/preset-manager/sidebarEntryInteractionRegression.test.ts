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
  if (start === -1) {
    throw new Error(`Expected CSS block: ${selector}`);
  }
  const end = content.indexOf('\n}', start);
  if (end === -1) {
    throw new Error(`Expected CSS block to close: ${selector}`);
  }
  return content.slice(start, end + 2);
}

const workbench = readProjectFile('src/preset-manager/components/WorkbenchPanel.vue');
const favoriteFolder = readProjectFile('src/preset-manager/components/FavoriteFolder.vue');
const leftSidebar = readProjectFile('src/preset-manager/components/LeftSidebar.vue');
const presetPanel = readProjectFile('src/preset-manager/components/PresetPanel.vue');

expectIncludes(workbench, 'class="draft-rename-action"');
expectIncludes(workbench, '@pointerdown.prevent.stop');
expectIncludes(workbench, '@mousedown.prevent.stop');
expectIncludes(favoriteFolder, 'class="fav-rename-action"');
expectIncludes(favoriteFolder, '@pointerdown.prevent.stop');
expectIncludes(favoriteFolder, '@mousedown.prevent.stop');

expectIncludes(workbench, 'function closeDraftPopupMenus');
expectIncludes(workbench, 'closeDraftCapsuleMenus(event);');
expectIncludes(workbench, 'if (event.key === \'Escape\') closeDraftPopupMenus();');
expectIncludes(favoriteFolder, 'function closeFavoritePopupMenus');
expectIncludes(favoriteFolder, 'closeFavoriteCapsuleMenus(event);');
expectIncludes(favoriteFolder, 'if (event.key === \'Escape\') closeFavoritePopupMenus();');
expectIncludes(favoriteFolder, "const parentDocument = inject<Document>('parentDocument', document);");
expectIncludes(favoriteFolder, "parentDocument.addEventListener('pointerdown', closeFavoritePopupMenus, true);");
expectIncludes(favoriteFolder, "parentDocument.addEventListener('mousedown', closeFavoritePopupMenus, true);");
expectIncludes(favoriteFolder, "parentDocument.addEventListener('click', closeFavoritePopupMenus, true);");
expectIncludes(favoriteFolder, "parentDocument.defaultView?.addEventListener('pointerdown', closeFavoritePopupMenus, true);");
expectIncludes(favoriteFolder, "parentDocument.defaultView?.addEventListener('keydown', closeFavoritePopupMenusFromKey, true);");
expectIncludes(favoriteFolder, "parentDocument.removeEventListener('pointerdown', closeFavoritePopupMenus, true);");
expectIncludes(favoriteFolder, "parentDocument.removeEventListener('mousedown', closeFavoritePopupMenus, true);");
expectIncludes(favoriteFolder, "parentDocument.removeEventListener('click', closeFavoritePopupMenus, true);");
expectIncludes(favoriteFolder, "parentDocument.defaultView?.removeEventListener('pointerdown', closeFavoritePopupMenus, true);");
expectIncludes(favoriteFolder, "parentDocument.defaultView?.removeEventListener('keydown', closeFavoritePopupMenusFromKey, true);");

const draftCapsuleBlock = cssBlock(workbench, '.draft-capsule-menu');
expectIncludes(draftCapsuleBlock, 'left: 0;');
expectIncludes(draftCapsuleBlock, 'top: calc(100% + 5px);');
expectIncludes(draftCapsuleBlock, 'background: var(--pm-left-entry-editor-bg);');
expectIncludes(draftCapsuleBlock, 'backdrop-filter: blur(32px) saturate(140%);');
expectNotIncludes(draftCapsuleBlock, 'right: 0;');
const draftTriggerBlock = cssBlock(workbench, '.draft-trigger-panel');
expectIncludes(draftTriggerBlock, 'right: 0;');
expectIncludes(draftTriggerBlock, 'top: calc(100% + 6px);');
expectIncludes(draftTriggerBlock, 'background: var(--pm-left-entry-editor-bg);');
expectIncludes(draftTriggerBlock, 'backdrop-filter: blur(32px) saturate(140%);');
expectNotIncludes(draftTriggerBlock, 'bottom: calc(100% + 6px);');

const favCapsuleBlock = cssBlock(favoriteFolder, '.fav-capsule-menu');
expectIncludes(favCapsuleBlock, 'left: 0;');
expectIncludes(favCapsuleBlock, 'top: calc(100% + 5px);');
expectIncludes(favCapsuleBlock, 'background: var(--pm-left-entry-editor-bg);');
expectIncludes(favCapsuleBlock, 'backdrop-filter: blur(32px) saturate(140%);');
expectNotIncludes(favCapsuleBlock, 'right: 0;');
const favTriggerBlock = cssBlock(favoriteFolder, '.fav-trigger-panel');
expectIncludes(favTriggerBlock, 'right: 0;');
expectIncludes(favTriggerBlock, 'top: calc(100% + 6px);');
expectIncludes(favTriggerBlock, 'background: var(--pm-left-entry-editor-bg);');
expectIncludes(favTriggerBlock, 'backdrop-filter: blur(32px) saturate(140%);');
expectNotIncludes(favTriggerBlock, 'bottom: calc(100% + 6px);');

const sidebarSettingsPopoverBlock = cssBlock(leftSidebar, '.sidebar-settings-popover');
expectIncludes(sidebarSettingsPopoverBlock, 'background: var(--pm-left-entry-editor-bg);');
expectIncludes(sidebarSettingsPopoverBlock, 'backdrop-filter: blur(32px) saturate(140%);');

expectIncludes(favoriteFolder, '@dragenter.prevent.stop="onFolderDragEnter"');
expectIncludes(favoriteFolder, '@dragover.prevent.stop="onFolderDragOver"');
expectIncludes(favoriteFolder, '@drop.prevent.stop="onFolderDrop"');
expectIncludes(favoriteFolder, '@dragenter.prevent.stop="onFolderDragEnter"');
expectIncludes(favoriteFolder, 'function onFolderDragEnter(e: DragEvent)');
expectIncludes(favoriteFolder, 'data.targetFolderId = props.folder.id;');
expectIncludes(favoriteFolder, 'data.targetIndex = favoriteDropIndex.value ?? props.folder.items.length;');
expectIncludes(favoriteFolder, 'store.moveFavoriteItem(data.source, data.index, props.folder.id, data.targetIndex);');

const draftListBlock = cssBlock(workbench, '.draft-list');
expectIncludes(draftListBlock, 'gap: 6px;');
const folderItemsBlock = cssBlock(favoriteFolder, '.folder-items');
expectIncludes(folderItemsBlock, 'gap: 2px;');
expectNotIncludes(folderItemsBlock, 'gap: 6px;');

const previewBlock = cssBlock(workbench, '.left-entry-preview');
expectIncludes(previewBlock, 'margin: -2px 35px 6px 13px;');
const favPreviewBlock = cssBlock(favoriteFolder, '.fav-preview');
expectIncludes(favPreviewBlock, 'margin: -2px 35px 2px 13px;');
expectNotIncludes(favPreviewBlock, 'margin: -2px 35px 6px 13px;');

const favExpandedBlock = cssBlock(favoriteFolder, '.fav-item.expanded');
expectNotIncludes(favExpandedBlock, 'margin-bottom: 8px;');

expectIncludes(presetPanel, '@preset-manager-favorite-dragover="onFavoritePromptDragOver"');
expectIncludes(presetPanel, '@preset-manager-favorite-drop="onFavoritePromptDrop"');
expectIncludes(presetPanel, '@preset-manager-favorite-dragend="onFavoritePromptDragEnd"');
expectIncludes(presetPanel, 'function resolvePointerDropIndex(clientY: number)');
expectIncludes(presetPanel, 'async function insertDroppedPrompt(prompt: PresetPrompt, index: number)');
expectIncludes(presetPanel, 'async function onFavoritePromptDrop(event: Event)');

console.info('sidebarEntryInteractionRegression tests passed');
