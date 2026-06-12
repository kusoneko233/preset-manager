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

const app = readProjectFile('src/preset-manager/App.vue');
const overlay = readProjectFile('src/preset-manager/components/AnnotationOverlay.vue');
const overlayStart = overlay.indexOf('.annotation-overlay {');
const overlayEnd = overlay.indexOf('.annotation-overlay.erasing', overlayStart);
const overlayBlock = overlay.slice(overlayStart, overlayEnd);
const baseLayerStart = app.indexOf('.app-root > * {');
const appOverlayStart = app.indexOf('.app-root > .annotation-overlay {');
const appOverlayEnd = app.indexOf('.app-root.fullscreen', appOverlayStart);
const baseLayerBlock = app.slice(baseLayerStart, appOverlayStart);
const appOverlayBlock = app.slice(appOverlayStart, appOverlayEnd);

expectIncludes(app, '.app-root > * {');
expectNotIncludes(app, '.app-root > :not(.annotation-overlay)');
expectIncludes(app, '.app-root > .annotation-overlay');
expectIncludes(baseLayerBlock, 'position: relative;');
expectIncludes(baseLayerBlock, 'z-index: 1;');
expectIncludes(appOverlayBlock, 'position: absolute;');
expectIncludes(appOverlayBlock, 'inset: 0;');
expectIncludes(appOverlayBlock, 'z-index: 950;');
if (baseLayerStart < 0 || appOverlayStart < 0 || appOverlayStart < baseLayerStart) {
  throw new Error('Expected annotation overlay override to be declared after the base app child layer rule.');
}

expectIncludes(overlayBlock, 'position: absolute;');
expectIncludes(overlayBlock, 'z-index: 950;');
expectIncludes(overlayBlock, 'background: transparent;');
expectIncludes(overlayBlock, 'inset: 0;');
expectNotIncludes(overlayBlock, 'position: absolute !important;');
expectNotIncludes(overlayBlock, 'background: rgba(0, 0, 0, 0.04);');
expectNotIncludes(overlayBlock, 'overflow: hidden;');

console.info('annotationOverlayLayout tests passed');
