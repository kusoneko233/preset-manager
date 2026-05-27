declare const require: any;
declare const process: any;

// eslint-disable-next-line import-x/no-nodejs-modules
const fs = require('fs');
// eslint-disable-next-line import-x/no-nodejs-modules
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
const runtime = readProjectFile('src/preset-manager/index.ts');
const titleBar = readProjectFile('src/preset-manager/components/TitleBar.vue');
const panel = readProjectFile('src/preset-manager/components/DevThemePanel.vue');
const injector = readProjectFile('src/preset-manager/components/DevThemeStyleInjector.vue');
const css = readProjectFile('src/preset-manager/utils/devThemeCss.ts');
const controls = readProjectFile('src/preset-manager/utils/devThemeControls.ts');
const crop = readProjectFile('src/preset-manager/utils/devThemeCrop.ts');
const store = readProjectFile('src/preset-manager/stores/devTheme.ts');

expectIncludes(app, 'data-dev-sidebar');
expectIncludes(app, 'data-dev-workspace');
expectIncludes(app, 'data-dev-panel');
expectIncludes(app, 'DevThemeStyleInjector');
expectIncludes(app, 'DevThemePanel');
expectIncludes(app, 'useDevThemeStore');
expectIncludes(app, '@toggle-dev-theme-panel="devTheme.togglePanel()"');
expectIncludes(app, 'codeInspectorEnabled');
expectIncludes(app, '@toggle-code-inspector="toggleCodeInspector"');
expectIncludes(app, 'WINDOW_MIN_VISIBLE_RATIO = 0.1');
expectIncludes(app, "provide('presetManagerWindowMinVisibleRatio', WINDOW_MIN_VISIBLE_RATIO);");
expectIncludes(app, 'presetManagerParentFloatingRoot');
expectIncludes(app, "parentDoc.createElement('div')");
expectIncludes(app, "parentDoc.createElement('style')");
expectIncludes(app, "data-preset-manager-floating-root");
expectIncludes(app, "data-preset-manager-floating-root-style");
expectIncludes(app, '[data-preset-manager-floating-root="${instanceKey}"] .dev-theme-resize');
expectIncludes(app, "parentFloatingRoot?.remove()");

expectIncludes(titleBar, 'toggleDevThemePanel');
expectIncludes(titleBar, 'toggleCodeInspector');
expectIncludes(titleBar, 'clampWindowStateWithVisibleArea');
expectIncludes(titleBar, "inject<number>('presetManagerWindowMinVisibleRatio', 0.1)");
expectIncludes(titleBar, '开发者背景面板');
expectIncludes(titleBar, '开发者检查器');
expectIncludes(titleBar, 'IconButton name="palette"');
expectIncludes(titleBar, 'IconButton name="crosshair"');
expectIncludes(titleBar, '@mousedown.stop="onDragStart"');
expectNotIncludes(titleBar, '@mousedown.stop.prevent="onDragStart"');

expectIncludes(app, 'onSelect?:');
expectIncludes(app, 'codeInspectorControls?.onSelect');
expectIncludes(app, 'removeCodeInspectorSelectListener?.()');
expectIncludes(runtime, 'selectListeners');
expectIncludes(runtime, 'onSelect: listener');
expectIncludes(runtime, 'rect: { width: Math.round(rect.width), height: Math.round(rect.height) }');
expectIncludes(runtime, 'clearDevThemeSelectionMarks');
expectIncludes(runtime, 'markSelectedMatches');
expectIncludes(runtime, 'data-preset-manager-selected-source');
expectIncludes(runtime, 'data-preset-manager-dev-selected');
expectIncludes(css, 'data-preset-manager-selected-source');
expectIncludes(css, 'data-preset-manager-dev-selected');
expectNotIncludes(css, '::before');
expectIncludes(css, 'background-color: ${buildMaskBackgroundColor(background)} !important;');
expectIncludes(controls, 'background-color: rgba(');
expectIncludes(css, 'backdrop-filter:');
expectIncludes(injector, "inject<Document | null>('parentDocument', null)");
expectIncludes(injector, "inject<HTMLIFrameElement | null>('iframeElement', null)");
expectIncludes(injector, 'function getIframeDocument()');
expectIncludes(injector, "styleDocument.createElement('style')");
expectIncludes(store, 'this.panelOpen = true;');
expectIncludes(panel, 'dev-theme-shell');
expectIncludes(panel, 'dev-theme-toolbar');
expectIncludes(panel, 'dev-theme-target-grid');
expectIncludes(panel, 'dev-theme-live-grid');
expectIncludes(panel, 'dev-theme-css-preview');
expectIncludes(panel, 'data-dev-theme-panel-v2');
expectIncludes(panel, '${root} .dev-theme-panel');
expectIncludes(panel, '${root} .dev-theme-toolbar');
expectIncludes(panel, '${root} .dev-theme-shell');
expectIncludes(panel, '${root} .dev-theme-card');
expectNotIncludes(panel, 'dev-theme-effective-guide');
expectIncludes(panel, ':effect-info="controlInfo(\'brightness\')"');
expectIncludes(panel, ':effect-info="controlInfo(\'contrast\')"');
expectIncludes(panel, ':effect-info="controlInfo(\'opacity\')"');
expectIncludes(panel, ':effect-info="controlInfo(\'imageScale\')"');
expectIncludes(panel, 'controlInfo(id: string)');
expectIncludes(panel, 'getDevThemeControlTraces');
expectIncludes(panel, 'getDevThemeCropAspect');
expectIncludes(panel, 'getDevThemeCropCanvasSize');
expectIncludes(panel, 'cropAspect');
expectIncludes(panel, 'cropCanvasSize');
expectIncludes(panel, ':style="cropStageStyle"');
expectIncludes(panel, '裁剪比例');
expectIncludes(panel, 'activeForSelection');
expectIncludes(panel, 'targetText');
expectIncludes(panel, 'ToggleControl');
expectIncludes(panel, 'ToggleRange');
expectIncludes(panel, 'RangeControl');
expectIncludes(panel, '实时生效');
expectIncludes(panel, '已暂停');
expectIncludes(panel, '当前元素');
expectIncludes(panel, '作用范围');
expectIncludes(panel, '另存');
expectIncludes(panel, '保存');
expectIncludes(panel, '重置');
expectIncludes(panel, '改名');
expectIncludes(panel, '删除');
expectIncludes(panel, '导出');
expectIncludes(panel, '导入');
expectIncludes(panel, '生成 CSS');
expectIncludes(panel, '背景图');
expectIncludes(panel, '裁剪');
expectIncludes(panel, '应用裁剪');
expectIncludes(panel, '左半边');
expectIncludes(panel, '右半边');
expectIncludes(panel, '居中');
expectIncludes(panel, '铺满');
expectIncludes(panel, 'cropState');
expectIncludes(panel, 'applyCropPreset');
expectIncludes(panel, 'applyImageCrop');
expectIncludes(panel, 'openImageCropper');
expectIncludes(panel, 'function clearBackgroundImage()');
expectIncludes(panel, 'store.currentDraft.originalImageDataUrl = null;');
expectIncludes(panel, 'cropState.open = false;');
expectIncludes(panel, '@click="clearBackgroundImage"');
expectIncludes(panel, '装饰');
expectIncludes(panel, '开发者背景');
expectIncludes(panel, 'CSS 已复制');
expectIncludes(panel, 'readFileAsDataUrl');
expectIncludes(panel, 'serializeDevThemeConfig');
expectIncludes(panel, 'parseDevThemeConfig');
expectIncludes(panel, 'clampFloatingPanelRect');
expectIncludes(panel, '@pointerdown.stop.prevent="onDragStart"');
expectIncludes(panel, '@pointerdown.stop.prevent="onResizeStart($event, handle)"');
expectIncludes(panel, 'function startPanelPointerDrag');
expectIncludes(panel, 'PointerEvent');
expectIncludes(panel, 'pointermove');
expectIncludes(panel, 'pointerup');
expectIncludes(panel, 'pointercancel');
expectIncludes(panel, 'function getPanelViewportSize');
expectIncludes(panel, "position: 'fixed'");
expectIncludes(panel, 'window.innerWidth');
expectIncludes(panel, 'window.innerHeight');
expectIncludes(panel, 'store.panelRect = start;');
expectIncludes(panel, '<Teleport');
expectIncludes(panel, ':disabled="!parentFloatingRoot"');
expectIncludes(panel, 'parentFloatingRoot');
expectIncludes(panel, "parentFloatingRoot.style.pointerEvents = 'auto'");
expectIncludes(panel, 'activeDocument.addEventListener');
expectIncludes(panel, "parentFloatingRoot.style.pointerEvents = previousRootPointerEvents");
expectIncludes(panel, 'data-preset-manager-floating-panel');
expectIncludes(panel, 'event.clientX');
expectIncludes(panel, 'event.clientY');
expectIncludes(panel, "position: 'fixed'");
expectNotIncludes(panel, 'store.panelDetached');
expectNotIncludes(panel, 'toggleDetached');
expectNotIncludes(panel, 'getIframeOffsetInParent');
expectNotIncludes(panel, 'getActiveDocument');
expectNotIncludes(panel, '@mousedown.stop.prevent="onDragStart"');
expectNotIncludes(panel, '@mousedown.stop.prevent="onResizeStart($event, handle)"');
expectNotIncludes(panel, 'startParentDrag');
expectNotIncludes(panel, "document.querySelector('.app-root')");
expectNotIncludes(panel, 'function startLocalPanelDrag');
expectNotIncludes(panel, 'snapInside');
expectNotIncludes(panel, '回屏内');
expectNotIncludes(panel, "inject<Document>('parentDocument')");
expectNotIncludes(panel, "inject<HTMLIFrameElement>('iframeElement')");
expectNotIncludes(panel, 'setPointerCapture');
expectNotIncludes(panel, 'releasePointerCapture');
expectNotIncludes(panel, 'function getDragPoint(event: MouseEvent)');
expectNotIncludes(panel, 'iframeElement.getBoundingClientRect()');
expectNotIncludes(panel, 'event.screenX');
expectNotIncludes(panel, 'event.screenY');
expectNotIncludes(panel, 'ev.screenX');
expectNotIncludes(panel, 'ev.screenY');

expectIncludes(injector, 'pm-dev-theme');
expectIncludes(injector, 'pm-dev-theme-parent');
expectIncludes(injector, 'pm-dev-theme-iframe');
expectIncludes(injector, 'const iframeDoc = getIframeDocument();');
expectIncludes(injector, 'syncStyleElement(iframeDoc, css);');
expectIncludes(injector, 'syncStyleElement(parentDoc,');
expectNotIncludes(injector, 'syncStyleElement(document, css)');
expectIncludes(injector, 'buildDevThemeCss');
expectIncludes(css, '.app-root[data-dev-sidebar="on"] .title-left');
expectIncludes(css, "import { buildSelectedExtraStyleDeclarations } from './devThemeControls';");
expectIncludes(css, 'return buildSelectedExtraStyleDeclarations(background);');
expectIncludes(controls, 'DEV_THEME_CONTROL_SPECS');
expectIncludes(controls, 'getDevThemeControlTraces');
expectIncludes(controls, 'buildSelectedExtraStyleDeclarations');
expectIncludes(controls, "id: 'brightness'");
expectIncludes(controls, "cssProperties: ['backdrop-filter: brightness(...)']");
expectIncludes(controls, "sourceLocation: 'src/preset-manager/utils/devThemeCss.ts > buildBlock'");
expectIncludes(controls, "id: 'textColor'");
expectIncludes(controls, "color: ${background.textColor} !important;");

expectIncludes(crop, 'getDevThemeCropAspect');
expectIncludes(crop, 'getDevThemeCropCanvasSize');
expectIncludes(crop, "label: '侧栏'");
expectIncludes(crop, "label: '工作区'");
expectIncludes(crop, "label: '选中元素'");
expectIncludes(crop, "label: '弹窗'");

expectIncludes(store, 'setLivePreviewActive(value: boolean)');
expectIncludes(store, 'livePreviewActive: false');
expectIncludes(store, 'this.livePreviewActive = value;');
expectIncludes(injector, 'store.livePreviewActive');
expectIncludes(injector, 'targets: store.livePreviewActive ? livePreviewTargets.value : store.currentTargets');
expectIncludes(injector, 'selectedPaths: store.livePreviewActive ? livePreviewSelectedPaths.value : selectedPaths.value');
expectNotIncludes(panel, 'setLivePreviewActive(true)');
expectNotIncludes(panel, 'setLivePreviewActive(false)');

expectIncludes(store, 'PresetManagerDevThemeState');
expectIncludes(store, 'rect?: { width: number; height: number }');
expectIncludes(store, 'enabled: false,');
expectIncludes(store, 'currentDraft');
expectIncludes(store, 'currentTargets');
expectIncludes(store, 'saveAsNewPreset');
expectIncludes(store, 'importPreset(name: string, background: DevThemeBackground, targets: Partial<Record<DevThemeTarget, boolean>>)');
expectIncludes(store, 'if (this.selectedElement) nextTargets.selected = true;');
expectIncludes(store, 'this.setEnabled(true);');
expectIncludes(panel, 'store.importPreset(config.name, config.background, config.targets);');
expectNotIncludes(panel, 'store.currentDraft = config.background;');
expectNotIncludes(panel, 'store.currentTargets = config.targets;');
expectIncludes(store, 'overwriteCurrentPreset');
expectIncludes(store, 'setPanelRect');
expectIncludes(store, 'resetPanelRect()');
expectIncludes(store, 'this.panelRect = defaultPanelRect();');
expectNotIncludes(store, 'panelDetached');
expectNotIncludes(store, 'setPanelDetached');
expectIncludes(panel, 'parentStyleEl?.remove()');
expectIncludes(panel, 'buildParentPanelStyle(rootKey: string)');
expectIncludes(panel, 'mountParentPanelStyle()');
expectIncludes(panel, 'data-preset-manager-dev-theme-panel-style');

expectIncludes(store, 'BUILTIN_CODEX_V1_PRESET_ID');
expectIncludes(store, 'createBuiltinCodexV1Preset');
expectIncludes(store, 'ensureBuiltinPresets');
expectIncludes(store, "name: 'Codex 极简 v1（内置基线）'");
expectIncludes(store, 'builtin: true,');
expectIncludes(store, 'if (!preset || preset.builtin) return;');
expectIncludes(store, 'if (!target || target.builtin) return;');
expectIncludes(panel, 'isBuiltinPreset');
expectIncludes(panel, 'preset.builtin ? `★ ${preset.name}` : preset.name');
expectIncludes(panel, '!store.activePresetId || isBuiltinPreset');
expectIncludes(panel, 'dev-theme-builtin-hint');
expectIncludes(panel, '内置基线不可改名/删除/覆盖');

console.info('devThemeIntegration tests passed');
