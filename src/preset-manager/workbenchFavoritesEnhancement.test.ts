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

const manager = readProjectFile('src/preset-manager/stores/manager.ts');
const workbench = readProjectFile('src/preset-manager/components/WorkbenchPanel.vue');
const favoritesPanel = readProjectFile('src/preset-manager/components/FavoritesPanel.vue');
const favoriteFolder = readProjectFile('src/preset-manager/components/FavoriteFolder.vue');
const webpackConfig = readProjectFile('webpack.config.ts');

expectIncludes(manager, 'duplicateDraft(id: string)');
expectIncludes(manager, 'updateFavoriteItem(folderId: string, index: number, updates: Partial<PresetPrompt>)');
expectIncludes(manager, 'addToFavorites(folderId: string, prompt: PresetNormalPrompt)');
expectIncludes(manager, 'const promptKey = getPromptKey(prompt as any);');
expectIncludes(manager, 'return false;');
expectIncludes(manager, 'this.favorites = [...this.favorites, folder];');
expectIncludes(manager, 'this.drafts = [...this.drafts, draft];');
expectIncludes(manager, 'this.favorites = this.favorites.map(folder =>');
expectIncludes(manager, 'this.drafts = this.drafts.map(draft =>');

expectIncludes(workbench, 'const drafts = computed(() => store.drafts);');
expectIncludes(workbench, 'class="draft-item"');
expectIncludes(workbench, '@contextmenu.prevent="openDraftContextMenu($event, draft)"');
expectIncludes(workbench, 'class="draft-row"');
expectIncludes(workbench, 'class="draft-preview left-entry-preview"');
expectIncludes(workbench, 'placeholder="未命名"');
expectIncludes(workbench, 'class="draft-title-text"');
expectIncludes(workbench, 'class="draft-rename-action"');
expectIncludes(workbench, 'class="draft-entry-actions"');
expectIncludes(workbench, 'class="draft-delete-action draft-entry-action-danger"');
expectIncludes(workbench, 'function deleteDraftInline(draft: DraftPrompt)');
expectIncludes(workbench, 'function startDraftNameEdit');
expectIncludes(workbench, 'function finishDraftNameEdit');
expectIncludes(workbench, 'function openDraftContextMenu');
expectIncludes(workbench, 'class="draft-context-menu sidebar-entry-context-menu"');
expectNotIncludes(workbench, 'class="draft-chevron"');
expectNotIncludes(workbench, 'class="draft-action draft-action-danger"');
expectIncludes(workbench, 'class="draft-role-pill sidebar-entry-pill has-arrow"');
expectNotIncludes(workbench, 'class="draft-lock-pill sidebar-entry-pill"');
expectNotIncludes(workbench, 'function toggleDraftLock');
expectNotIncludes(workbench, 'draft.forbid_overrides');
expectNotIncludes(workbench, '<select');
expectIncludes(workbench, 'type SidebarCapsuleOption');
expectIncludes(workbench, 'class="draft-capsule-menu"');
expectIncludes(workbench, 'setDraftRole(draft, option.value)');
expectIncludes(workbench, 'setDraftPosition(draft, option.value)');
expectIncludes(workbench, '{{ roleLabel(draft.role) }}');
expectIncludes(workbench, "function roleLabel(role: DraftPrompt['role'])");
expectNotIncludes(workbench, '点击 + 新建草稿');
expectNotIncludes(workbench, 'class="empty-hint"');
expectNotIncludes(workbench, 'duplicateDraft(draft.id)');
expectNotIncludes(workbench, 'insertDraftToMain(draft)');
expectNotIncludes(workbench, 'insertAllDraftsToMain');
expectNotIncludes(workbench, 'useHistoryStore');
expectNotIncludes(workbench, 'recordDraftInsert');

expectIncludes(favoritesPanel, 'const folders = computed(() => store.favorites);');
expectIncludes(favoritesPanel, '@dragover.prevent="onPanelDragOver"');
expectIncludes(favoritesPanel, '@drop.prevent="onPanelDrop"');
expectNotIncludes(favoritesPanel, 'panelDragOver');
expectNotIncludes(favoritesPanel, 'panel-drag-over');
expectIncludes(favoritesPanel, 'function findDropFolderId');
expectIncludes(favoritesPanel, 'function findDropFolderId(e: DragEvent)');
expectIncludes(favoritesPanel, 'const clientY = e.clientY;');
expectIncludes(favoritesPanel, "querySelectorAll<HTMLElement>('.folder-list [data-folder-id]')");
expectIncludes(favoritesPanel, 'getBoundingClientRect()');
expectIncludes(favoritesPanel, 'if (rect.top <= clientY)');
expectIncludes(favoritesPanel, 'const activeDropFolderId = ref(\'\');');
expectIncludes(favoritesPanel, ':drag-active="activeDropFolderId === folder.id"');
expectIncludes(favoritesPanel, '@drag-focus="setActiveDropFolder"');
expectIncludes(favoritesPanel, '@drag-clear="clearActiveDropFolder"');
expectIncludes(favoritesPanel, 'activeDropFolderId.value = findDropFolderId(e);');
expectIncludes(favoritesPanel, 'const folderId = activeDropFolderId.value || findDropFolderId(e);');
expectNotIncludes(favoritesPanel, 'findDropFolderId(e.target)');
expectIncludes(favoritesPanel, 'function addDroppedPromptToFolder');
expectNotIncludes(favoritesPanel, '点击 + 新建收藏夹');
expectNotIncludes(favoritesPanel, 'class="empty-hint"');
expectIncludes(favoritesPanel, '.sidebar-section-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  min-height: 26px;\n  padding: 0 0 3px 12px;');
expectIncludes(favoritesPanel, 'color: var(--pm-text-subtle);');
expectIncludes(webpackConfig, "request === 'pinia'");

expectIncludes(favoriteFolder, 'dragActive?: boolean;');
expectIncludes(favoriteFolder, ':class="{ \'drag-over\': isDragOver || dragActive }"');
expectIncludes(favoriteFolder, '@dragenter.prevent.stop="onFolderDragEnter"');
expectIncludes(favoriteFolder, '@dragover.prevent.stop="onFolderDragOver"');
expectIncludes(favoriteFolder, '@dragleave="onFolderDragLeave"');
expectIncludes(favoriteFolder, '@drop.prevent.stop="onFolderDrop"');
expectIncludes(favoriteFolder, ':data-folder-id="folder.id"');
expectIncludes(favoriteFolder, 'dragFocus: [folderId: string];');
expectIncludes(favoriteFolder, 'dragClear: [folderId: string];');
expectIncludes(favoriteFolder, "emit('dragFocus', props.folder.id);");
expectIncludes(favoriteFolder, "emit('dragClear', props.folder.id);");
expectIncludes(favoriteFolder, ':title="isEditing ? \'完成重命名\' : \'重命名\'"');
expectIncludes(favoriteFolder, '@click="toggleFolderNameEdit"');
expectIncludes(favoriteFolder, ':name="isEditing ? \'check\' : \'pen-line\'"');
expectIncludes(favoriteFolder, 'function toggleFolderNameEdit()');
expectIncludes(favoriteFolder, 'if (isEditing.value) {');
expectIncludes(favoriteFolder, 'finishEdit();');
expectIncludes(favoriteFolder, 'class="fav-item"');
expectIncludes(favoriteFolder, '@contextmenu.prevent="openFavoriteContextMenu($event, item, i)"');
expectIncludes(favoriteFolder, 'class="fav-row"');
expectIncludes(favoriteFolder, 'class="fav-title-input"');
expectIncludes(favoriteFolder, 'class="fav-title-text"');
expectIncludes(favoriteFolder, 'class="fav-rename-action"');
expectIncludes(favoriteFolder, 'class="fav-entry-actions"');
expectIncludes(favoriteFolder, 'class="fav-delete-action fav-entry-action-danger"');
expectIncludes(favoriteFolder, 'function deleteFavoriteInline(index: number)');
expectIncludes(favoriteFolder, 'function startFavoriteNameEdit');
expectIncludes(favoriteFolder, 'function finishFavoriteNameEdit');
expectIncludes(favoriteFolder, 'function openFavoriteContextMenu');
expectIncludes(favoriteFolder, 'class="fav-context-menu sidebar-entry-context-menu"');
expectNotIncludes(favoriteFolder, 'class="fav-chevron"');
expectIncludes(favoriteFolder, 'placeholder="未命名"');
expectIncludes(favoriteFolder, '@click.stop');
expectIncludes(favoriteFolder, 'class="fav-preview left-entry-preview"');
expectNotIncludes(favoriteFolder, 'class="fav-remove fav-action-danger"');
expectIncludes(favoriteFolder, 'class="fav-body"');
expectIncludes(favoriteFolder, 'class="fav-textarea"');
expectIncludes(favoriteFolder, 'rows="10"');
expectNotIncludes(favoriteFolder, 'rows="14"');
expectIncludes(favoriteFolder, 'class="fav-role-pill sidebar-entry-pill has-arrow"');
expectIncludes(favoriteFolder, 'class="fav-meta-row"');
expectIncludes(favoriteFolder, 'class="fav-position-pill sidebar-entry-pill has-arrow"');
expectNotIncludes(favoriteFolder, 'class="fav-lock-pill sidebar-entry-pill"');
expectNotIncludes(favoriteFolder, 'function toggleFavoriteLock');
expectNotIncludes(favoriteFolder, 'forbid_overrides ?');
expectNotIncludes(favoriteFolder, '<select');
expectIncludes(favoriteFolder, 'type SidebarCapsuleOption');
expectIncludes(favoriteFolder, 'class="fav-capsule-menu"');
expectIncludes(favoriteFolder, 'setFavoriteRole(i, option.value)');
expectIncludes(favoriteFolder, 'setFavoritePosition(i, item, option.value)');
expectIncludes(favoriteFolder, 'class="fav-trigger-summary sidebar-entry-pill"');
expectIncludes(favoriteFolder, 'class="fav-trigger-panel"');
expectIncludes(favoriteFolder, 'favoriteTriggerSummary(item)');
expectIncludes(favoriteFolder, '{{ roleLabel(item.role) }}');
expectIncludes(favoriteFolder, 'function previewText');
expectIncludes(favoriteFolder, "function roleLabel(role: PresetNormalPrompt['role'])");
expectIncludes(workbench, '.draft-list {\n  flex: 1;\n  overflow-y: auto;\n  padding: 2px 0 6px;');
const draftListBlock = cssBlock(workbench, '.draft-list');
expectIncludes(draftListBlock, 'gap: 4px;');
expectIncludes(workbench, ':class="{ expanded: !draft.collapsed, dragging: isDraftDragging(draft), \'drop-target\': draftDropIndex === i }"');
expectIncludes(workbench, '.draft-item {\n  border-radius: 8px;\n  background: transparent;');
expectIncludes(workbench, '.draft-item:not(.expanded) {\n  background: var(--pm-control-highlight);');
expectIncludes(workbench, '.draft-item:not(.expanded):hover {\n  background: var(--pm-control-highlight-hover);');
expectNotIncludes(workbench, '.draft-item:hover {\n  background: var(--pm-control-highlight-hover);');
expectIncludes(workbench, '.draft-item.expanded {\n  background: var(--pm-input-bg);\n  box-shadow: none;');
expectIncludes(workbench, '.draft-row {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  min-height: 32px;\n  padding: 5px 8px;');
expectIncludes(workbench, '.draft-entry-actions {\n  display: inline-flex;\n  align-items: center;\n  gap: 2px;');
const draftPreviewBlock = cssBlock(workbench, '.left-entry-preview');
expectIncludes(draftPreviewBlock, 'margin: -2px 35px 4px 13px;');
expectIncludes(workbench, '.draft-body {\n  padding: 3px 4px 9px;');
expectNotIncludes(workbench, '.draft-body {\n  padding: 4px 8px 10px;');
expectNotIncludes(workbench, '.draft-body {\n  padding: 2px 8px 8px 31px;');
expectIncludes(workbench, '  border: 0;\n  border-radius: 7px;\n  background: var(--pm-left-entry-editor-bg);');
expectNotIncludes(workbench, 'background: color-mix(in srgb, #000 18%, var(--pm-input-bg));');
expectNotIncludes(workbench, '  border: 1px solid var(--pm-border);');
const draftMetaBlock = cssBlock(workbench, '.draft-meta-row');
expectIncludes(draftMetaBlock, 'flex-wrap: wrap;');
expectIncludes(draftMetaBlock, 'overflow: visible;');
expectNotIncludes(draftMetaBlock, 'overflow-x: auto;');
expectIncludes(workbench, 'min-height: 178px;');
expectNotIncludes(workbench, 'min-height: 286px;');
expectIncludes(favoritesPanel, '.folder-list {\n  flex: 1;\n  overflow-y: auto;\n  padding: 0;');
expectIncludes(favoritesPanel, 'gap: 0;');
expectIncludes(favoriteFolder, '.folder-items {\n  min-height: 64px;\n  padding: 3px 0 6px;');
const folderItemsBlock = cssBlock(favoriteFolder, '.folder-items');
expectIncludes(folderItemsBlock, 'gap: 6px;');
expectIncludes(favoriteFolder, '.favorite-folder:not(:last-child) {\n  padding-bottom: 10px;');
expectIncludes(favoriteFolder, '.favorite-folder:last-child {\n  flex: 1 0 auto;');
expectNotIncludes(favoriteFolder, '.favorite-folder:not(:last-child) {\n  margin-bottom: 8px;');
const favoriteFolderBlock = cssBlock(favoriteFolder, '.favorite-folder');
expectIncludes(favoriteFolderBlock, 'flex: 0 0 auto;');
const favItemBlock = cssBlock(favoriteFolder, '.fav-item');
expectIncludes(favItemBlock, 'flex: 0 0 auto;');
expectIncludes(favItemBlock, 'border-radius: 8px;');
expectIncludes(favItemBlock, 'background: transparent;');
expectIncludes(favoriteFolder, '.fav-item:not(.expanded) {\n  background: var(--pm-control-highlight);');
expectIncludes(favoriteFolder, '.fav-item:not(.expanded):hover {\n  background: var(--pm-control-highlight-hover);');
expectNotIncludes(favoriteFolder, '.fav-item:hover,\n.fav-item.expanded {\n  background: var(--pm-control-highlight-hover);');
expectIncludes(favoriteFolder, '.fav-item.expanded {\n  background: var(--pm-input-bg);\n  box-shadow: none;');
expectNotIncludes(favoriteFolder, 'margin-bottom: 8px;');
expectIncludes(favoriteFolder, '.fav-row {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  min-height: 32px;\n  padding: 5px 8px;');
expectIncludes(favoriteFolder, '.fav-entry-actions {\n  display: inline-flex;\n  align-items: center;\n  gap: 2px;');
expectIncludes(favoriteFolder, '.fav-title-input {');
const favPreviewBlock = cssBlock(favoriteFolder, '.fav-preview');
expectIncludes(favPreviewBlock, 'margin: -2px 35px 4px 13px;');
expectIncludes(favoriteFolder, '.fav-body {\n  padding: 3px 4px 9px;');
expectNotIncludes(favoriteFolder, '.fav-body {\n  padding: 4px 8px 10px;');
expectNotIncludes(favoriteFolder, '.fav-body {\n  padding: 2px 8px 8px 31px;');
expectIncludes(favoriteFolder, '  border: 0;\n  border-radius: 7px;\n  background: var(--pm-left-entry-editor-bg);');
expectNotIncludes(favoriteFolder, 'background: color-mix(in srgb, #000 18%, var(--pm-input-bg));');
expectNotIncludes(favoriteFolder, '  border: 1px solid var(--pm-border);');
const favMetaBlock = cssBlock(favoriteFolder, '.fav-meta-row');
expectIncludes(favMetaBlock, 'flex-wrap: wrap;');
expectIncludes(favMetaBlock, 'overflow: visible;');
expectNotIncludes(favMetaBlock, 'overflow-x: auto;');
expectIncludes(favoriteFolder, '.fav-meta-row {\n  display: flex;');
expectNotIncludes(favoriteFolder, '.fav-role-pill {\n  width: auto;');
expectNotIncludes(favoriteFolder, 'padding: 0 19px 0 8px;');
expectIncludes(favoriteFolder, '.sidebar-entry-pill.has-arrow {');
expectIncludes(favoriteFolder, 'gap: 4px;');
expectIncludes(favoriteFolder, '.sidebar-entry-pill {\n  flex: 0 0 auto;');
expectIncludes(favoriteFolder, '  white-space: nowrap;');
expectIncludes(favoriteFolder, 'min-height: 178px;');
expectIncludes(favoriteFolder, 'max-height: 260px;');
expectIncludes(favoriteFolder, 'function toggleFavoriteItem');
expectNotIncludes(favoriteFolder, 'class="fav-input"');
expectNotIncludes(favoriteFolder, 'class="fav-select"');
expectNotIncludes(favoriteFolder, 'rows="4"');
expectNotIncludes(favoriteFolder, 'PromptEditDialog');
expectNotIncludes(favoriteFolder, 'editingFavorite');
expectNotIncludes(favoriteFolder, 'saveFavoriteEdits');
expectIncludes(favoriteFolder, 'store.updateFavoriteItem');
expectIncludes(favoriteFolder, 'store.moveFavoriteItem(data.source, data.index, props.folder.id');
expectIncludes(favoriteFolder, 'toastr.warning');

console.info('workbenchFavoritesEnhancement tests passed');
