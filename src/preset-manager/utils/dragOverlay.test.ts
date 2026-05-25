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

const drag = readProjectFile('src/preset-manager/utils/drag.ts');
const index = readProjectFile('src/preset-manager/index.ts');

expectIncludes(drag, "export const DRAG_OVERLAY_ATTRIBUTE = 'data-preset-manager-drag-overlay';");
expectIncludes(drag, 'function isLegacyDragOverlay(element: Element, parentDoc: Document)');
expectIncludes(drag, "export function cleanupPresetManagerDragOverlays(parentDoc: Document)");
expectIncludes(drag, 'if (isLegacyDragOverlay(element, parentDoc)) element.remove();');
expectIncludes(drag, "overlay.setAttribute(DRAG_OVERLAY_ATTRIBUTE, 'true');");
expectIncludes(drag, "pointerEvents: 'none',");
expectIncludes(drag, 'const failsafeTimer = parentDoc.defaultView?.setTimeout(finish, DRAG_OVERLAY_FAILSAFE_MS);');
expectIncludes(drag, 'parentDoc.defaultView?.clearTimeout(failsafeTimer);');
expectIncludes(index, 'cleanupPresetManagerDragOverlays(window.parent.document);');

console.info('dragOverlay tests passed');
