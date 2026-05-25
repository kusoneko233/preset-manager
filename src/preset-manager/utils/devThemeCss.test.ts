declare const require: any;

const { buildDevThemeCss, createDefaultDevThemeBackground } = require('./devThemeCss');
const { getDevThemeControlTraces } = require('./devThemeControls');

type DevThemeCssState = {
  enabled: boolean;
  targets: { sidebar: boolean; workspace: boolean; panel: boolean; selected: boolean };
  background: ReturnType<typeof createDefaultDevThemeBackground>;
  selectedPaths?: string[];
};

function expectEqual<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function expectIncludes(content: string, expected: string) {
  if (!content.includes(expected)) {
    throw new Error(`Expected content to include: ${expected}`);
  }
}

function expectNotIncludes(content: string, unexpected: string) {
  if (content.includes(unexpected)) {
    throw new Error(`Expected content not to include: ${unexpected}`);
  }
}

function state(overrides: Partial<DevThemeCssState> = {}): DevThemeCssState {
  return {
    enabled: true,
    targets: { sidebar: true, workspace: false, panel: false, selected: false },
    background: createDefaultDevThemeBackground(),
    ...overrides,
  };
}

expectEqual(buildDevThemeCss(state({ enabled: false })), '');

const sidebarCss = buildDevThemeCss(state());
expectIncludes(sidebarCss, '.app-root[data-dev-sidebar="on"]::before');
expectNotIncludes(sidebarCss, '.app-root[data-dev-workspace="on"] .preset-workspace');
expectNotIncludes(sidebarCss, '.app-root[data-dev-panel="on"]');

const workspacePanelCss = buildDevThemeCss(state({ targets: { sidebar: false, workspace: true, panel: true, selected: false } }));
expectNotIncludes(workspacePanelCss, '.app-root[data-dev-sidebar="on"]::before');
expectIncludes(workspacePanelCss, '.app-root[data-dev-workspace="on"] .preset-workspace');
expectIncludes(workspacePanelCss, '.app-root[data-dev-panel="on"] .ui-settings-panel');

expectNotIncludes(sidebarCss, 'url()');
expectNotIncludes(sidebarCss, "url('')");

const imageCss = buildDevThemeCss(state({
  background: {
    ...createDefaultDevThemeBackground(),
    imageDataUrl: 'data:image/png;base64,abc',
    gradientEnabled: true,
    gradientCss: 'linear-gradient(90deg, red, blue)',
  },
}));
expectIncludes(imageCss, "url('data:image/png;base64,abc')");
expectIncludes(imageCss, 'linear-gradient(90deg, red, blue)');

const effectDisabledCss = buildDevThemeCss(state());
expectNotIncludes(effectDisabledCss, 'radial-gradient(circle at 20% 30%');
expectNotIncludes(effectDisabledCss, 'inset 0 0 0 1px rgba(255,255,255,0.10)');

const effectEnabledCss = buildDevThemeCss(state({
  background: {
    ...createDefaultDevThemeBackground(),
    noiseEnabled: true,
    noiseOpacity: 0.12,
    innerShadowEnabled: true,
    innerShadowCss: 'inset 0 2px 8px rgba(0,0,0,0.3)',
    edgeHighlightEnabled: true,
  },
}));
expectIncludes(effectEnabledCss, 'radial-gradient(circle at 20% 30%');
expectIncludes(effectEnabledCss, 'inset 0 2px 8px rgba(0,0,0,0.3)');
expectIncludes(effectEnabledCss, 'inset 0 0 0 1px rgba(255,255,255,0.10)');

const traceBackground = {
  ...createDefaultDevThemeBackground(),
  textColorEnabled: true,
  textColor: '#ff00aa',
  fontSizeEnabled: true,
  fontSizePx: 18,
};
const traces = getDevThemeControlTraces(traceBackground);
const textColorTrace = traces.find((trace: any) => trace.id === 'textColor');
const fontSizeTrace = traces.find((trace: any) => trace.id === 'fontSize');
const marginTrace = traces.find((trace: any) => trace.id === 'margin');
expectEqual(textColorTrace.enabled, true);
expectIncludes(textColorTrace.declarations.join('\n'), 'color: #ff00aa !important;');
expectEqual(fontSizeTrace.enabled, true);
expectIncludes(fontSizeTrace.declarations.join('\n'), 'font-size: 18px !important;');
expectEqual(marginTrace.enabled, false);
expectIncludes(textColorTrace.sourceLocation, 'src/preset-manager/utils/devThemeCss.ts');
expectIncludes(textColorTrace.cssProperties.join(','), 'color');

console.info('devThemeCss tests passed');
