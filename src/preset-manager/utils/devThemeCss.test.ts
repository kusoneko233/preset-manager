declare const require: any;

const { buildDevThemeCss, createCodexDarkGlassDevThemeBackground, createDefaultDevThemeBackground } = require('./devThemeCss');
const { CODEX_DARK_GLASS_WALLPAPER_DATA_URL } = require('./codexDarkGlassWallpaper');
const { getDevThemeControlTraces } = require('./devThemeControls');

type DevThemeCssState = {
  enabled: boolean;
  targets: { sidebar: boolean; workspace: boolean; panel: boolean; selected: boolean };
  background: ReturnType<typeof createDefaultDevThemeBackground>;
  selectedPaths?: string[];
  pinnedStyles?: {
    id: string;
    path: string;
    selectors?: string[];
    label: string;
    stability?: 'source' | 'stable' | 'fallback';
    matchedCount?: number;
    background: ReturnType<typeof createDefaultDevThemeBackground>;
  }[];
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

function expectBefore(content: string, first: string, second: string) {
  const firstIndex = content.indexOf(first);
  const secondIndex = content.indexOf(second);
  if (firstIndex === -1 || secondIndex === -1 || firstIndex >= secondIndex) {
    throw new Error(`Expected ${first} to appear before ${second}`);
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
expectIncludes(sidebarCss, '.app-root[data-dev-sidebar="on"]::after');
expectNotIncludes(sidebarCss, '.app-root[data-dev-sidebar="on"] .left-sidebar');
expectNotIncludes(sidebarCss, '.app-root[data-dev-sidebar="on"] .title-left');
expectEqual(createDefaultDevThemeBackground().originalImageDataUrl, null);
expectEqual(createDefaultDevThemeBackground().imagePositionX, 50);
expectEqual(createDefaultDevThemeBackground().imagePositionY, 50);
expectEqual(createDefaultDevThemeBackground().bottomFadeOpacity, 0);
expectEqual(createDefaultDevThemeBackground().bottomFadeStart, 48);
expectEqual(createDefaultDevThemeBackground().bottomFadeSolidStart, 61);
expectNotIncludes(sidebarCss, '.app-root[data-dev-workspace="on"] .preset-workspace');
expectNotIncludes(sidebarCss, '.app-root[data-dev-panel="on"]');
expectIncludes(sidebarCss, "url('data:image/webp;base64,");
expectIncludes(sidebarCss, 'background-color: rgba(48, 51, 68, 0.7) !important;');
expectIncludes(sidebarCss, 'background-image:');
expectNotIncludes(sidebarCss, 'background-color: rgba(22, 26, 34, 0.432) !important;');
expectIncludes(sidebarCss, 'linear-gradient(180deg, rgba(0,0,0,0) 54%, rgba(0,0,0,0.59) 65%, rgba(0,0,0,0.59) 100%)');
expectIncludes(sidebarCss, 'backdrop-filter: blur(0px) saturate(90%) brightness(55%) contrast(105%) !important;');
expectIncludes(sidebarCss, '-webkit-backdrop-filter: blur(0px) saturate(90%) brightness(55%) contrast(105%) !important;');
expectIncludes(sidebarCss, '\n  filter: blur(0px) saturate(90%) brightness(55%) contrast(105%) !important;');
expectNotIncludes(sidebarCss, '\n  opacity: 0.96;');
expectNotIncludes(sidebarCss, 'opacity: var(--pm-dev-bg-opacity);');

const codexDarkGlass = createCodexDarkGlassDevThemeBackground();
expectIncludes(codexDarkGlass.imageDataUrl, 'data:image/webp;base64,');
expectEqual(codexDarkGlass.imageDataUrl, codexDarkGlass.originalImageDataUrl);
expectEqual(codexDarkGlass.imageDataUrl, CODEX_DARK_GLASS_WALLPAPER_DATA_URL);
expectEqual(codexDarkGlass.blur, 0);
expectEqual(codexDarkGlass.saturate, 0.9);
expectEqual(codexDarkGlass.brightness, 0.55);
expectEqual(codexDarkGlass.maskColor, '#303344');
expectEqual(codexDarkGlass.maskOpacity, 0.7);
expectEqual(codexDarkGlass.bottomFadeOpacity, 0.59);
expectEqual(codexDarkGlass.bottomFadeStart, 54);
expectEqual(codexDarkGlass.bottomFadeSolidStart, 65);
expectEqual(codexDarkGlass.innerShadowEnabled, false);
expectEqual(codexDarkGlass.edgeHighlightEnabled, false);
const codexDarkGlassCss = buildDevThemeCss(state({ background: codexDarkGlass }));
expectIncludes(codexDarkGlassCss, "url('data:image/webp;base64,");
expectNotIncludes(codexDarkGlassCss, '127.0.0.1');
expectIncludes(codexDarkGlassCss, 'background-color: rgba(48, 51, 68, 0.7) !important;');
expectIncludes(codexDarkGlassCss, 'backdrop-filter: blur(0px) saturate(90%) brightness(55%) contrast(105%) !important;');
expectIncludes(codexDarkGlassCss, 'linear-gradient(180deg, rgba(0,0,0,0) 54%, rgba(0,0,0,0.59) 65%, rgba(0,0,0,0.59) 100%)');
expectNotIncludes(codexDarkGlassCss, 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0) 32%, rgba(255,255,255,0.08) 100%)');
expectNotIncludes(codexDarkGlassCss, 'inset 0 0 0 1px rgba(255,255,255,0.10)');

const workspacePanelCss = buildDevThemeCss(state({ targets: { sidebar: false, workspace: true, panel: true, selected: false } }));
expectNotIncludes(workspacePanelCss, '.app-root[data-dev-sidebar="on"] .left-sidebar {');
expectNotIncludes(workspacePanelCss, '.app-root[data-dev-sidebar="on"]::after');
expectIncludes(workspacePanelCss, '.app-root[data-dev-workspace="on"] .preset-workspace');
expectIncludes(workspacePanelCss, '.app-root[data-dev-panel="on"] .ui-settings-panel');
expectNotIncludes(workspacePanelCss, '\n  filter: blur(24px)');

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

const confirmedImageCss = buildDevThemeCss(state({
  background: {
    ...createDefaultDevThemeBackground(),
    imageDataUrl: 'data:image/png;base64,confirmed',
    originalImageDataUrl: 'data:image/png;base64,original',
  },
}));
expectIncludes(confirmedImageCss, "url('data:image/png;base64,confirmed')");
expectNotIncludes(confirmedImageCss, "url('data:image/png;base64,original')");

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

const selectedCss = buildDevThemeCss(state({
  targets: { sidebar: false, workspace: false, panel: false, selected: true },
  selectedPaths: ['src/preset-manager/components/PromptItem.vue:9:5'],
  background: {
    ...createDefaultDevThemeBackground(),
    opacity: 0.42,
    blur: 18,
  },
}));
expectIncludes(selectedCss, '[data-preset-manager-selected-source="src/preset-manager/components/PromptItem.vue:9:5"]');
expectIncludes(selectedCss, '[data-preset-manager-dev-selected="true"]');
expectIncludes(selectedCss, 'background-color: rgba(22, 26, 34, 0.189) !important;');
expectIncludes(selectedCss, 'backdrop-filter: blur(18px) saturate(140%) brightness(100%) contrast(100%) !important;');
expectNotIncludes(selectedCss, '\n  opacity: 0.42;');
expectNotIncludes(selectedCss, '::before');

const pinnedCss = buildDevThemeCss(state({
  targets: { sidebar: false, workspace: false, panel: false, selected: true },
  selectedPaths: ['src/preset-manager/components/PromptItem.vue:20:3'],
  background: {
    ...createDefaultDevThemeBackground(),
    textColorEnabled: true,
    textColor: '#00ff00',
  },
  pinnedStyles: [
    {
      id: 'pin-1',
      path: 'src/preset-manager/components/PromptItem.vue:9:5',
      selectors: ['[data-preset-manager-selected-source="src/preset-manager/components/PromptItem.vue:9:5"]'],
      label: 'Prompt title',
      stability: 'source',
      matchedCount: 1,
      background: {
        ...createDefaultDevThemeBackground(),
        textColorEnabled: true,
        textColor: '#ff0033',
      },
    },
  ],
}));
expectIncludes(pinnedCss, '[data-preset-manager-selected-source="src/preset-manager/components/PromptItem.vue:9:5"]');
expectIncludes(pinnedCss, '[data-preset-manager-selected-source="src/preset-manager/components/PromptItem.vue:20:3"]');
expectIncludes(pinnedCss, 'color: #ff0033 !important;');
expectIncludes(pinnedCss, 'color: #00ff00 !important;');

const pinnedStableCss = buildDevThemeCss(state({
  targets: { sidebar: false, workspace: false, panel: false, selected: true },
  selectedPaths: ['src/preset-manager/components/PromptItem.vue:20:3'],
  background: {
    ...createDefaultDevThemeBackground(),
    textColorEnabled: true,
    textColor: '#00ff00',
  },
  pinnedStyles: [
    {
      id: 'pin-stable-favorite',
      path: '__selected_element__:button',
      selectors: ['[data-preset-manager-dev-stable-id="pin-favorite"]'],
      label: 'button 收藏',
      stability: 'fallback',
      matchedCount: 1,
      background: {
        ...createDefaultDevThemeBackground(),
        textColorEnabled: true,
        textColor: '#fff7df',
      },
    },
  ],
}));
expectIncludes(pinnedStableCss, '[data-preset-manager-dev-stable-id="pin-favorite"]');
expectIncludes(pinnedStableCss, '[data-preset-manager-selected-source="src/preset-manager/components/PromptItem.vue:20:3"]');
expectIncludes(pinnedStableCss, 'color: #fff7df !important;');
const pinnedStableStart = pinnedStableCss.indexOf('[data-preset-manager-dev-stable-id="pin-favorite"]');
const liveMarkerAfterPinned = pinnedStableCss.indexOf('[data-preset-manager-dev-selected="true"]', pinnedStableStart);
const pinnedStableBlock = pinnedStableCss.slice(pinnedStableStart, liveMarkerAfterPinned);
expectNotIncludes(pinnedStableBlock, '[data-preset-manager-dev-selected="true"]');

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
const opacityTrace = traces.find((trace: any) => trace.id === 'opacity');
expectEqual(textColorTrace.enabled, true);
expectIncludes(textColorTrace.declarations.join('\n'), 'color: #ff00aa !important;');
expectEqual(fontSizeTrace.enabled, true);
expectIncludes(fontSizeTrace.declarations.join('\n'), 'font-size: 18px !important;');
expectEqual(marginTrace.enabled, false);
expectIncludes(opacityTrace.declarations.join('\n'), 'background-color: rgba(22, 26, 34, 0.432) !important;');
expectNotIncludes(opacityTrace.declarations.join('\n'), 'opacity:');
const bottomFadeTrace = traces.find((trace: any) => trace.id === 'bottomFade');
expectEqual(bottomFadeTrace.enabled, false);
expectIncludes(bottomFadeTrace.declarations.join('\n'), 'linear-gradient(180deg, rgba(0,0,0,0) 48%, rgba(0,0,0,0) 61%, rgba(0,0,0,0) 100%)');
expectIncludes(textColorTrace.sourceLocation, 'src/preset-manager/utils/devThemeCss.ts');
expectIncludes(textColorTrace.cssProperties.join(','), 'color');

console.info('devThemeCss tests passed');
