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
  if (start < 0) throw new Error(`Expected CSS selector to exist: ${selector}`);
  const end = content.indexOf('\n}', start);
  if (end < 0) throw new Error(`Expected CSS selector to close: ${selector}`);
  return content.slice(start, end + 2);
}

function extractFunctionBlock(content: string, name: string) {
  const start = content.indexOf(`function ${name}`);
  if (start < 0) throw new Error(`Expected function to exist: ${name}`);
  const nextFunction = content.indexOf('\nfunction ', start + 1);
  return content.slice(start, nextFunction < 0 ? undefined : nextFunction);
}

const confirmStore = readProjectFile('src/preset-manager/stores/confirm.ts');
const confirmDialog = readProjectFile('src/preset-manager/components/ConfirmDialog.vue');
const app = readProjectFile('src/preset-manager/App.vue');
const promptItem = readProjectFile('src/preset-manager/components/PromptItem.vue');
const sidebarPresetList = readProjectFile('src/preset-manager/components/SidebarPresetList.vue');
const favoriteFolder = readProjectFile('src/preset-manager/components/FavoriteFolder.vue');
const favoritesPanel = readProjectFile('src/preset-manager/components/FavoritesPanel.vue');

expectIncludes(confirmStore, 'anchor?: ConfirmAnchor;');
expectIncludes(confirmStore, 'export type ConfirmAnchor = {');
expectIncludes(confirmDialog, ':class="{ danger: confirmDialog.options?.tone === \'danger\', anchored: confirmDialog.options?.anchor }"');
expectIncludes(confirmDialog, ':style="confirmCardStyle"');
expectIncludes(confirmDialog, 'const confirmCardStyle = computed');
expectIncludes(confirmDialog, 'position: absolute;');
expectIncludes(confirmDialog, 'left: var(--confirm-left);');
expectIncludes(confirmDialog, 'top: var(--confirm-top);');
expectIncludes(confirmDialog, '.confirm-backdrop.anchored');
expectIncludes(confirmDialog, 'background: transparent;');
expectIncludes(app, 'confirmDialog.confirm({');
expectIncludes(app, 'anchor,');
expectIncludes(sidebarPresetList, 'anchor: getPresetContextActionAnchor(action, event)');
expectIncludes(sidebarPresetList, 'anchor?: ConfirmAnchor');

const promptItemHoverBlock = cssBlock(promptItem, '.prompt-item:hover');
expectIncludes(promptItemHoverBlock, 'background: color-mix(in srgb, var(--pm-bg-card-hover) 86%, var(--pm-text) 4%);');

const statusToggleBlock = cssBlock(promptItem, '.status-toggle');
const statusDotBlock = cssBlock(promptItem, '.status-dot');
const statusToggleHoverBlock = cssBlock(promptItem, '.status-toggle:hover');
expectIncludes(statusToggleBlock, 'background: color-mix(in srgb, #54585f 54%, #000);');
expectIncludes(statusToggleBlock, 'opacity: 0.72;');
expectIncludes(statusDotBlock, 'background: color-mix(in srgb, #ffffff 58%, #54585f);');
expectIncludes(statusToggleHoverBlock, 'opacity: 0.86;');

expectIncludes(sidebarPresetList, 'const presetDropIndex = ref<number | null>(null);');
expectIncludes(sidebarPresetList, 'const presetDragPointer = reactive');
expectIncludes(sidebarPresetList, ':style="getPresetItemStyle(name, i)"');
expectIncludes(sidebarPresetList, 'function getPresetItemStyle(name: string, index: number)');
expectIncludes(sidebarPresetList, "import { startParentDrag } from '../utils/drag';");
expectIncludes(sidebarPresetList, 'const PRESET_DRAG_START_DISTANCE = 4;');
expectIncludes(sidebarPresetList, 'const presetMouseDrag = reactive');
expectIncludes(sidebarPresetList, 'function startPresetMouseDrag');
expectIncludes(sidebarPresetList, 'function onPresetMouseMove');
expectIncludes(sidebarPresetList, 'function finishPresetMouseDrag');
expectIncludes(sidebarPresetList, 'function resolvePresetMouseDropIndex(clientY: number)');
expectIncludes(sidebarPresetList, 'startParentDrag(parentDocument, {');
expectIncludes(sidebarPresetList, 'function getPresetReflowOffset(name: string, index: number)');
expectIncludes(sidebarPresetList, 'class="preset-drag-spacer"');
expectIncludes(sidebarPresetList, 'class="preset-drop-indicator"');
expectIncludes(sidebarPresetList, 'requestAnimationFrame(() => updatePresetDragPreviewPosition');
expectIncludes(sidebarPresetList, 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)');
expectNotIncludes(cssBlock(sidebarPresetList, '.sidebar-preset-item.dragging'), 'visibility: hidden;');
expectIncludes(cssBlock(sidebarPresetList, '.sidebar-preset-item.dragging'), 'opacity: 0;');
expectNotIncludes(cssBlock(sidebarPresetList, '.sidebar-preset-item.dragging'), 'filter: blur');
expectNotIncludes(cssBlock(sidebarPresetList, '.sidebar-preset-item.dragging'), 'opacity: 0.18;');
expectIncludes(extractFunctionBlock(sidebarPresetList, 'finishPresetMouseDrag'), 'store.reorderPresetDisplayToIndex(sourceName, targetIndex)');
expectNotIncludes(sidebarPresetList, 'const presetPointerDrag = reactive');
expectNotIncludes(sidebarPresetList, 'function onPresetPointerMove');
expectNotIncludes(sidebarPresetList, 'function onPresetDrop');

expectIncludes(favoriteFolder, 'const favoriteDragPreview = reactive');
expectIncludes(favoriteFolder, 'const favoriteDropIndex = ref<number | null>(null);');
expectIncludes(favoriteFolder, 'class="fav-drag-preview"');
expectIncludes(favoriteFolder, 'class="fav-drag-spacer fav-drop-indicator"');
expectIncludes(favoriteFolder, 'class="fav-drop-indicator"');
expectIncludes(favoriteFolder, ':style="getFavoriteItemStyle(item, i)"');
expectIncludes(favoriteFolder, 'function resolveFavoriteDropIndex(event: DragEvent, targetIndex: number)');
expectIncludes(favoriteFolder, 'function getFavoriteReflowOffset(index: number)');
expectIncludes(favoriteFolder, 'function updateFavoriteDragPreviewPosition');
expectIncludes(favoriteFolder, 'data.targetIndex = favoriteDropIndex.value ?? props.folder.items.length;');
expectIncludes(favoriteFolder, 'store.moveFavoriteItem(data.source, data.index, props.folder.id, data.targetIndex);');
expectIncludes(favoritesPanel, 'const targetIndex = data.targetIndex');
expectIncludes(favoritesPanel, 'typeof targetIndex === \'number\' ? targetIndex : folder?.items.length ?? 0');

console.info('codexInteractionRefinement tests passed');
