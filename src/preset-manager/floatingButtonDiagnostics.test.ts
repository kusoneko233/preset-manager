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

const index = readProjectFile('src/preset-manager/index.ts');

expectIncludes(index, "const FLOATING_BUTTON_ROLE = 'floating-button';");
expectIncludes(index, "const PANEL_ROLE = 'panel';");
expectIncludes(index, 'function cleanupPresetManagerInstanceElements(parentDoc: Document)');
expectIncludes(index, 'const legacySelector = `[data-preset-manager-instance="${INSTANCE_KEY}"]:not([data-preset-manager-role])`;');
expectIncludes(index, 'const instanceSelectors = [');
expectIncludes(index, "selector => parentDoc.querySelectorAll(selector).forEach(element => element.remove())");
expectIncludes(index, ".attr('data-preset-manager-role', FLOATING_BUTTON_ROLE)");
expectIncludes(index, ".attr('data-preset-manager-role', PANEL_ROLE)");
expectIncludes(index, "touchAction: 'none',");
expectIncludes(index, 'const pointerId = evt.pointerId;');
expectIncludes(index, "parentDoc.addEventListener('pointermove', onPointerMove, true);");
expectIncludes(index, "parentDoc.addEventListener('pointerup', finishPointerDrag, true);");
expectIncludes(index, "parentDoc.addEventListener('pointercancel', finishPointerDrag, true);");
expectIncludes(index, 'if (!pointerDragging) {');
expectIncludes(index, "console.info('[Preset Manager] floating button click',");
expectIncludes(index, "openFromFloatingButton('floating-button-pointerup');");
expectIncludes(index, "openFromFloatingButton('floating-button-click');");
expectIncludes(index, 'return;');
expectIncludes(index, 'function mountPanelApp(iframe: HTMLIFrameElement) {');
expectIncludes(index, 'function cleanupPanelApp()');
expectIncludes(index, 'if (app && hasMountedPanelContent(iframe)) {');
expectIncludes(index, "iframe.style.pointerEvents = 'none';");
expectIncludes(index, "throw new Error('panel mounted without app root');");
expectIncludes(index, "iframe.style.pointerEvents = 'auto';");
expectIncludes(index, "console.error('[Preset Manager] panel mount failed:', error);");
expectIncludes(index, '.on(\'load\', function () {');
expectIncludes(index, 'schedulePanelMount(this);');
expectIncludes(index, 'const iframeElement = $iframe[0];');
expectIncludes(index, 'function schedulePanelMount(iframe: HTMLIFrameElement, delay = 0)');
expectIncludes(index, 'schedulePanelMount(iframeElement, 80);');
expectIncludes(index, 'schedulePanelMount(iframeElement, 300);');
expectIncludes(index, 'schedulePanelMount(iframeElement);');
expectIncludes(index, '.appendTo(window.parent.document.body);');
expectIncludes(index, "console.info('[Preset Manager] loaded',");
expectIncludes(index, "console.info('[Preset Manager] floating button mounted',");
expectIncludes(index, "console.info('[Preset Manager] panel shown',");
expectIncludes(index, "console.info('[Preset Manager] panel hidden',");
expectIncludes(index, "console.info('[Preset Manager] panel iframe created',");
expectIncludes(index, 'function isPanelInteractable(iframe: HTMLIFrameElement, parentDoc: Document)');
expectIncludes(index, 'function hasMountedPanelContent(iframe: HTMLIFrameElement)');
expectIncludes(index, 'function resetPanelPosition(iframe: HTMLIFrameElement)');
expectIncludes(index, 'function showExistingPanel(iframe: HTMLIFrameElement, reason: string)');
expectIncludes(index, "function openPanel(reason = 'open-panel')");
expectIncludes(index, "openPanel(reason);");
expectIncludes(index, 'eventOn(getButtonEvent(BUTTON_NAME), () => togglePanel());');
expectIncludes(index, 'if (isPanelInteractable(iframeElement, parentDoc) && hasMountedPanelContent(iframeElement))');
expectIncludes(index, "showExistingPanel(iframeElement, 'recover-existing-panel');");
expectIncludes(index, "reason: 'hidden-by-toggle',");
expectIncludes(index, 'reason,');

console.info('floatingButtonDiagnostics tests passed');
