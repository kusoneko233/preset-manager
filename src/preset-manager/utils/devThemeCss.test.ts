declare const require: any;

const {
  buildDevThemeCss,
  createDefaultDevThemeBackground,
} = require('./devThemeCss');

type DevThemeCssState = {
  enabled: boolean;
  targets: { sidebar: boolean; workspace: boolean; panel: boolean };
  background: ReturnType<typeof createDefaultDevThemeBackground>;
};

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

function expectEqual<T>(actual: T, expected: T) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function state(overrides: Partial<DevThemeCssState> = {}): DevThemeCssState {
  return {
    enabled: true,
    targets: { sidebar: true, workspace: false, panel: false },
    background: createDefaultDevThemeBackground(),
    ...overrides,
  };
}

expectEqual(buildDevThemeCss(state({ enabled: false })), '');

const sidebarCss = buildDevThemeCss(state());
expectIncludes(sidebarCss, '.app-root[data-dev-sidebar="on"]::before');
expectNotIncludes(sidebarCss, '.app-root[data-dev-workspace="on"] .preset-workspace');
expectNotIncludes(sidebarCss, '.app-root[data-dev-panel="on"]');

const workspacePanelCss = buildDevThemeCss(state({ targets: { sidebar: false, workspace: true, panel: true } }));
expectNotIncludes(workspacePanelCss, '.app-root[data-dev-sidebar="on"]::before');
expectIncludes(workspacePanelCss, '.app-root[data-dev-workspace="on"] .preset-workspace');
expectIncludes(workspacePanelCss, '.app-root[data-dev-panel="on"] .ui-settings-panel');

const noImageCss = buildDevThemeCss(state());
expectNotIncludes(noImageCss, 'url()');
expectNotIncludes(noImageCss, "url('')");

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

const disabledAdvancedCss = buildDevThemeCss(state());
expectNotIncludes(disabledAdvancedCss, 'radial-gradient(circle at 20% 30%');
expectNotIncludes(disabledAdvancedCss, 'inset 0 0 0 1px rgba(255,255,255,0.10)');

const advancedCss = buildDevThemeCss(state({
  background: {
    ...createDefaultDevThemeBackground(),
    noiseEnabled: true,
    noiseOpacity: 0.12,
    innerShadowEnabled: true,
    innerShadowCss: 'inset 0 2px 8px rgba(0,0,0,0.3)',
    edgeHighlightEnabled: true,
  },
}));
expectIncludes(advancedCss, 'radial-gradient(circle at 20% 30%');
expectIncludes(advancedCss, 'inset 0 2px 8px rgba(0,0,0,0.3)');
expectIncludes(advancedCss, 'inset 0 0 0 1px rgba(255,255,255,0.10)');

console.info('devThemeCss tests passed');
