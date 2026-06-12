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

const sidebarPresetList = readProjectFile('src/preset-manager/components/SidebarPresetList.vue');

expectIncludes(sidebarPresetList, 'const dragPreview = reactive');
expectIncludes(sidebarPresetList, 'class="preset-drag-preview"');
expectIncludes(sidebarPresetList, ':style="dragPreviewStyle"');
expectIncludes(sidebarPresetList, "import { startParentDrag } from '../utils/drag';");
expectIncludes(sidebarPresetList, 'const PRESET_DRAG_START_DISTANCE = 4;');
expectIncludes(sidebarPresetList, 'const presetMouseDrag = reactive');
expectIncludes(sidebarPresetList, 'offsetX: 0,');
expectIncludes(sidebarPresetList, 'offsetY: 0,');
expectIncludes(sidebarPresetList, 'originX: 0,');
expectIncludes(sidebarPresetList, ':draggable="false"');
expectIncludes(sidebarPresetList, ':class="getPresetItemClass(name, i)"');
expectIncludes(sidebarPresetList, '@mousedown="onPresetMouseDown($event, name)"');
expectIncludes(sidebarPresetList, 'class="preset-drop-indicator"');
expectIncludes(sidebarPresetList, 'function startPresetMouseDrag');
expectIncludes(sidebarPresetList, 'function onPresetMouseMove');
expectIncludes(sidebarPresetList, 'function finishPresetMouseDrag');
expectIncludes(sidebarPresetList, 'startParentDrag(parentDocument, {');
expectIncludes(sidebarPresetList, "cursor: 'grabbing',");
expectIncludes(sidebarPresetList, 'dragPreview.x = presetMouseDrag.originX;');
expectIncludes(sidebarPresetList, 'dragPreview.y = clientY - presetMouseDrag.offsetY;');
expectNotIncludes(sidebarPresetList, 'dragPreview.x = clientX - presetMouseDrag.offsetX;');
expectNotIncludes(sidebarPresetList, 'dragPreview.x = clientX + 10;');
expectNotIncludes(sidebarPresetList, 'dragPreview.y = clientY + 8;');
expectIncludes(sidebarPresetList, 'store.reorderPresetDisplayToIndex(sourceName, targetIndex);');
expectIncludes(sidebarPresetList, 'dragPreview.visible = true;');
expectIncludes(sidebarPresetList, 'dragPreview.visible = false;');
expectNotIncludes(sidebarPresetList, '@pointerdown="onPresetPointerDown($event, name)"');
expectNotIncludes(sidebarPresetList, 'const presetPointerDrag = reactive');
expectNotIncludes(sidebarPresetList, 'document.addEventListener(\'pointermove\', onPresetPointerMove, true);');
expectNotIncludes(sidebarPresetList, 'parentDocument.addEventListener(\'pointermove\', onPresetPointerMove, true);');
expectNotIncludes(sidebarPresetList, '@dragstart=');
expectNotIncludes(sidebarPresetList, '@dragover');
expectNotIncludes(sidebarPresetList, '@drop');
expectNotIncludes(sidebarPresetList, '@dragend');
expectNotIncludes(sidebarPresetList, 'dataTransfer');

const draggingBlock = cssBlock(sidebarPresetList, '.sidebar-preset-item.dragging');
expectNotIncludes(draggingBlock, 'visibility: hidden;');
expectIncludes(draggingBlock, 'opacity: 0;');
expectNotIncludes(draggingBlock, 'filter: blur');
expectIncludes(draggingBlock, 'transform: none;');

const itemBlock = cssBlock(sidebarPresetList, '.sidebar-preset-item');
expectIncludes(itemBlock, 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);');

const previewBlock = cssBlock(sidebarPresetList, '.preset-drag-preview');
expectIncludes(previewBlock, 'position: fixed;');
expectIncludes(previewBlock, 'pointer-events: none;');
expectIncludes(previewBlock, 'transform: translate3d');
expectIncludes(previewBlock, 'overflow: hidden;');
expectIncludes(previewBlock, 'border: 0;');
expectIncludes(previewBlock, 'background: var(--pm-row-hover);');
expectIncludes(previewBlock, 'box-shadow: none;');
expectIncludes(previewBlock, 'backdrop-filter: none;');
expectIncludes(previewBlock, '-webkit-backdrop-filter: none;');
expectNotIncludes(previewBlock, 'scale(1.01)');
expectNotIncludes(previewBlock, '0 18px 44px');
expectIncludes(cssBlock(sidebarPresetList, '.preset-drag-preview.active'), 'background: var(--pm-row-hover);');

const indicatorBlock = cssBlock(sidebarPresetList, '.preset-drop-indicator');
expectIncludes(indicatorBlock, 'height: 2px;');
expectIncludes(indicatorBlock, 'background: color-mix(in srgb, var(--pm-text) 42%, transparent);');
expectNotIncludes(indicatorBlock, 'box-shadow:');

console.info('sidebarPresetDragPreview tests passed');
