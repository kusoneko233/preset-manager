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

const manager = readProjectFile('src/preset-manager/stores/manager.ts');
const sidebarPresetList = readProjectFile('src/preset-manager/components/SidebarPresetList.vue');
const favoriteFolder = readProjectFile('src/preset-manager/components/FavoriteFolder.vue');
const workbench = readProjectFile('src/preset-manager/components/WorkbenchPanel.vue');

expectIncludes(manager, 'reorderFavoriteItem(folderId: string, fromIndex: number, targetIndex: number)');
expectIncludes(manager, 'reorderDraftToIndex(sourceId: string, targetIndex: number)');

expectIncludes(sidebarPresetList, 'function shouldIgnorePresetBlur(event: Event)');
expectIncludes(sidebarPresetList, 'if (event.currentTarget === window) return true;');
expectIncludes(sidebarPresetList, 'if (event.currentTarget !== parentDocument.defaultView) return false;');
expectIncludes(sidebarPresetList, "if (shouldIgnorePresetBlur(event)) return;");
expectIncludes(sidebarPresetList, "expectFocusInsideSourceFrame: true,");

expectIncludes(favoriteFolder, "import { startParentDrag } from '../utils/drag';");
expectIncludes(favoriteFolder, 'const FAVORITE_DRAG_START_DISTANCE = 4;');
expectIncludes(favoriteFolder, 'const favoriteMouseDrag = reactive');
expectIncludes(favoriteFolder, 'offsetX: 0,');
expectIncludes(favoriteFolder, 'offsetY: 0,');
expectIncludes(favoriteFolder, "const FAVORITE_PROMPT_DRAG_OVER_EVENT = 'preset-manager-favorite-dragover';");
expectIncludes(favoriteFolder, "const FAVORITE_PROMPT_DROP_EVENT = 'preset-manager-favorite-drop';");
expectIncludes(favoriteFolder, "const FAVORITE_PROMPT_DRAG_END_EVENT = 'preset-manager-favorite-dragend';");
expectIncludes(favoriteFolder, "const iframeElement = inject<HTMLIFrameElement | null>('iframeElement', null);");
expectIncludes(favoriteFolder, 'const localDoc: Document = iframeElement?.contentDocument ?? document;');
expectIncludes(favoriteFolder, 'localDoc.elementFromPoint(clientX, clientY)');
expectIncludes(favoriteFolder, 'prompt: item && !isPresetPlaceholderPrompt(item) ? klona(item as any) : undefined,');
expectIncludes(favoriteFolder, '@mousedown="onFavoriteMouseDown($event, item, i)"');
expectIncludes(favoriteFolder, ':draggable="false"');
expectIncludes(favoriteFolder, 'class="fav-drop-indicator"');
expectIncludes(favoriteFolder, 'function startFavoriteMouseDrag');
expectIncludes(favoriteFolder, 'function onFavoriteMouseMove');
expectIncludes(favoriteFolder, 'function finishFavoriteMouseDrag');
expectIncludes(favoriteFolder, 'function resolveFavoriteMouseDropIndex(clientY: number)');
expectIncludes(favoriteFolder, 'function dispatchFavoritePromptDrop()');
expectIncludes(favoriteFolder, 'dispatchFavoritePromptDragOver(clientX, clientY);');
expectIncludes(favoriteFolder, 'const handledPresetDrop = favoriteMouseDrag.dragging && dispatchFavoritePromptDrop();');
expectIncludes(favoriteFolder, 'if (!handledPresetDrop && isFavoritePointerInsideFolder()) {');
expectIncludes(favoriteFolder, 'favoriteDragPreview.x = clientX - favoriteMouseDrag.offsetX;');
expectIncludes(favoriteFolder, 'favoriteDragPreview.y = clientY - favoriteMouseDrag.offsetY;');
expectNotIncludes(favoriteFolder, 'favoriteDragPreview.x = clientX + 10;');
expectNotIncludes(favoriteFolder, 'favoriteDragPreview.y = clientY + 8;');
expectIncludes(favoriteFolder, 'store.reorderFavoriteItem(props.folder.id, favoriteMouseDrag.startIndex, targetIndex);');
expectNotIncludes(favoriteFolder, '@dragstart="onItemDragStart($event, item, i)"');
expectNotIncludes(favoriteFolder, '@drag="onFavoriteDrag($event)"');
expectNotIncludes(favoriteFolder, '@dragend="onFavoriteDragEnd"');
expectIncludes(cssBlock(favoriteFolder, '.fav-item'), 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);');
expectNotIncludes(cssBlock(favoriteFolder, '.fav-item.dragging'), 'visibility: hidden;');
expectIncludes(cssBlock(favoriteFolder, '.fav-item.dragging'), 'opacity: 0;');
expectNotIncludes(cssBlock(favoriteFolder, '.fav-item.dragging'), 'filter: blur');
expectIncludes(cssBlock(favoriteFolder, '.fav-drag-preview'), 'pointer-events: none;');
expectIncludes(cssBlock(favoriteFolder, '.fav-drag-preview'), 'transform: translate3d');
expectIncludes(cssBlock(favoriteFolder, '.fav-drag-preview'), 'border: 0;');
expectIncludes(cssBlock(favoriteFolder, '.fav-drag-preview'), 'background: var(--pm-control-highlight-hover);');
expectIncludes(cssBlock(favoriteFolder, '.fav-drag-preview'), 'box-shadow: none;');
expectIncludes(cssBlock(favoriteFolder, '.fav-drag-preview'), 'backdrop-filter: none;');
expectNotIncludes(cssBlock(favoriteFolder, '.fav-drag-preview'), 'scale(1.01)');
expectIncludes(cssBlock(favoriteFolder, '.fav-drop-indicator'), 'height: 2px;');
expectNotIncludes(cssBlock(favoriteFolder, '.fav-drop-indicator'), 'box-shadow:');

expectIncludes(workbench, "import { startParentDrag } from '../utils/drag';");
expectIncludes(workbench, 'const DRAFT_DRAG_START_DISTANCE = 4;');
expectIncludes(workbench, "const DRAFT_PROMPT_DRAG_OVER_EVENT = 'preset-manager-favorite-dragover';");
expectIncludes(workbench, "const DRAFT_PROMPT_DROP_EVENT = 'preset-manager-favorite-drop';");
expectIncludes(workbench, "const DRAFT_PROMPT_DRAG_END_EVENT = 'preset-manager-favorite-dragend';");
expectIncludes(workbench, 'const draftMouseDrag = reactive');
expectIncludes(workbench, 'offsetX: 0,');
expectIncludes(workbench, 'offsetY: 0,');
expectIncludes(workbench, '@mousedown="onDraftMouseDown($event, draft, i)"');
expectIncludes(workbench, ':draggable="false"');
expectIncludes(workbench, 'class="draft-drag-preview preset-drag-preview"');
expectIncludes(workbench, 'class="draft-drop-indicator"');
expectIncludes(workbench, 'function startDraftMouseDrag');
expectIncludes(workbench, 'function onDraftMouseMove');
expectIncludes(workbench, 'function finishDraftMouseDrag');
expectIncludes(workbench, 'function resolveDraftMouseDropIndex(clientY: number)');
expectIncludes(workbench, 'function dispatchDraftPromptDrop()');
expectIncludes(workbench, 'dispatchDraftPromptDragOver(clientX, clientY);');
expectIncludes(workbench, 'const handledPresetDrop = draftMouseDrag.dragging && dispatchDraftPromptDrop();');
expectIncludes(workbench, 'if (!handledPresetDrop && isDraftPointerInsideWorkbench()) {');
expectIncludes(workbench, "const iframeElement = inject<HTMLIFrameElement | null>('iframeElement', null);");
expectIncludes(workbench, 'const localDoc: Document = iframeElement?.contentDocument ?? document;');
expectIncludes(workbench, 'localDoc.elementFromPoint(clientX, clientY)');
expectIncludes(workbench, 'prompt: draft ? klona(store.draftToPrompt(draft) as any) : undefined,');
expectIncludes(workbench, 'prompt: klona(store.draftToPrompt(draft) as any),');
expectIncludes(workbench, 'draftDragPreview.x = clientX - draftMouseDrag.offsetX;');
expectIncludes(workbench, 'draftDragPreview.y = clientY - draftMouseDrag.offsetY;');
expectNotIncludes(workbench, 'draftDragPreview.x = clientX + 10;');
expectNotIncludes(workbench, 'draftDragPreview.y = clientY + 8;');
expectIncludes(workbench, 'store.reorderDraftToIndex(sourceId, targetIndex);');
expectNotIncludes(workbench, '@dragstart="onDragStart($event, draft)"');
expectNotIncludes(workbench, 'function onDragStart(e: DragEvent, draft: DraftPrompt)');
expectIncludes(cssBlock(workbench, '.draft-item'), 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);');
expectNotIncludes(cssBlock(workbench, '.draft-item.dragging'), 'visibility: hidden;');
expectIncludes(cssBlock(workbench, '.draft-item.dragging'), 'opacity: 0;');
expectNotIncludes(cssBlock(workbench, '.draft-item.dragging'), 'filter: blur');
expectIncludes(cssBlock(workbench, '.draft-drag-preview'), 'pointer-events: none;');
expectIncludes(cssBlock(workbench, '.draft-drag-preview'), 'transform: translate3d');
expectIncludes(cssBlock(workbench, '.draft-drag-preview'), 'border: 0;');
expectIncludes(cssBlock(workbench, '.draft-drag-preview'), 'background: var(--pm-control-highlight-hover);');
expectIncludes(cssBlock(workbench, '.draft-drag-preview'), 'box-shadow: none;');
expectIncludes(cssBlock(workbench, '.draft-drag-preview'), 'backdrop-filter: none;');
expectNotIncludes(cssBlock(workbench, '.draft-drag-preview'), 'scale(1.01)');
expectIncludes(cssBlock(workbench, '.draft-drop-indicator'), 'height: 2px;');
expectNotIncludes(cssBlock(workbench, '.draft-drop-indicator'), 'box-shadow:');

console.info('sidebarUnifiedDragAnimation tests passed');
