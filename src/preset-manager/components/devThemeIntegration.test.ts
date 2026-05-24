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

const app = readProjectFile('src/preset-manager/App.vue');
const titleBar = readProjectFile('src/preset-manager/components/TitleBar.vue');
const panel = readProjectFile('src/preset-manager/components/DevThemePanel.vue');
const injector = readProjectFile('src/preset-manager/components/DevThemeStyleInjector.vue');
const store = readProjectFile('src/preset-manager/stores/devTheme.ts');

expectIncludes(app, 'data-dev-sidebar');
expectIncludes(app, 'data-dev-workspace');
expectIncludes(app, 'data-dev-panel');
expectIncludes(app, 'DevThemeStyleInjector');
expectIncludes(app, 'DevThemePanel');
expectIncludes(app, 'useDevThemeStore');
expectIncludes(app, '@toggle-dev-theme-panel="devTheme.togglePanel"');

expectIncludes(titleBar, 'toggleDevThemePanel');
expectIncludes(titleBar, '开发者背景面板');
expectIncludes(titleBar, 'fa-palette');

expectIncludes(panel, '开发者背景面板');
expectIncludes(panel, '实时预览 · 手动保存');
expectIncludes(panel, 'readFileAsDataUrl');
expectIncludes(panel, 'serializeDevThemeConfig');
expectIncludes(panel, 'parseDevThemeConfig');
expectIncludes(panel, 'startParentDrag');

expectIncludes(injector, 'pm-dev-theme');
expectIncludes(injector, 'buildDevThemeCss');

expectIncludes(store, 'PresetManagerDevThemeState');
expectIncludes(store, 'currentDraft');
expectIncludes(store, 'currentTargets');
expectIncludes(store, 'saveAsNewPreset');
expectIncludes(store, 'overwriteCurrentPreset');
expectIncludes(store, 'setPanelRect');

console.info('devThemeIntegration tests passed');
