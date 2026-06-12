import { buildSelectedExtraStyleDeclarations } from './devThemeControls';
import { CODEX_DARK_GLASS_WALLPAPER_DATA_URL } from './codexDarkGlassWallpaper';

export type DevThemeTarget = 'sidebar' | 'workspace' | 'panel' | 'selected';

export type DevThemeBackground = {
  imageDataUrl: string | null;
  originalImageDataUrl: string | null;
  imageFit: 'cover' | 'contain' | 'repeat' | 'center';
  imageScale: number;
  imagePositionX: number;
  imagePositionY: number;
  opacity: number;
  blur: number;
  saturate: number;
  brightness: number;
  contrast: number;
  maskColor: string;
  maskOpacity: number;
  bottomFadeOpacity: number;
  bottomFadeStart: number;
  bottomFadeSolidStart: number;
  gradientEnabled: boolean;
  gradientCss: string;
  noiseEnabled: boolean;
  noiseOpacity: number;
  innerShadowEnabled: boolean;
  innerShadowCss: string;
  edgeHighlightEnabled: boolean;
  textColorEnabled: boolean;
  textColor: string;
  fontSizeEnabled: boolean;
  fontSizePx: number;
  fontWeightEnabled: boolean;
  fontWeight: number;
  lineHeightEnabled: boolean;
  lineHeight: number;
  paddingEnabled: boolean;
  paddingPx: number;
  marginEnabled: boolean;
  marginPx: number;
  widthEnabled: boolean;
  widthPx: number;
  heightEnabled: boolean;
  heightPx: number;
  borderRadiusEnabled: boolean;
  borderRadiusPx: number;
};

export type DevThemeCssState = {
  enabled: boolean;
  targets: Record<DevThemeTarget, boolean>;
  background: DevThemeBackground;
  selectedPaths?: string[];
  pinnedStyles?: DevThemePinnedStyle[];
};

export type DevThemePinnedStyle = {
  id: string;
  path: string;
  selectors: string[];
  label: string;
  stability: 'source' | 'stable' | 'fallback';
  matchedCount: number;
  background: DevThemeBackground;
};

export { CODEX_DARK_GLASS_WALLPAPER_DATA_URL } from './codexDarkGlassWallpaper';

export function createDefaultDevThemeBackground(): DevThemeBackground {
  return {
    imageDataUrl: null,
    originalImageDataUrl: null,
    imageFit: 'cover',
    imageScale: 1,
    imagePositionX: 50,
    imagePositionY: 50,
    opacity: 0.96,
    blur: 24,
    saturate: 1.4,
    brightness: 1,
    contrast: 1,
    maskColor: '#161A22',
    maskOpacity: 0.45,
    bottomFadeOpacity: 0,
    bottomFadeStart: 48,
    bottomFadeSolidStart: 61,
    gradientEnabled: false,
    gradientCss: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0))',
    noiseEnabled: false,
    noiseOpacity: 0.06,
    innerShadowEnabled: false,
    innerShadowCss: 'inset 0 1px 0 rgba(255,255,255,0.12)',
    edgeHighlightEnabled: false,
    textColorEnabled: false,
    textColor: '#ffffff',
    fontSizeEnabled: false,
    fontSizePx: 14,
    fontWeightEnabled: false,
    fontWeight: 500,
    lineHeightEnabled: false,
    lineHeight: 1.5,
    paddingEnabled: false,
    paddingPx: 8,
    marginEnabled: false,
    marginPx: 8,
    widthEnabled: false,
    widthPx: 200,
    heightEnabled: false,
    heightPx: 80,
    borderRadiusEnabled: false,
    borderRadiusPx: 8,
  };
}

export function createCodexDarkGlassDevThemeBackground(): DevThemeBackground {
  return {
    ...createDefaultDevThemeBackground(),
    imageDataUrl: CODEX_DARK_GLASS_WALLPAPER_DATA_URL,
    originalImageDataUrl: CODEX_DARK_GLASS_WALLPAPER_DATA_URL,
    imageFit: 'cover',
    imageScale: 1,
    imagePositionX: 50,
    imagePositionY: 50,
    opacity: 1,
    blur: 0,
    saturate: 0.9,
    brightness: 0.55,
    contrast: 1.05,
    maskColor: '#303344',
    maskOpacity: 0.7,
    bottomFadeOpacity: 0.59,
    bottomFadeStart: 54,
    bottomFadeSolidStart: 65,
    gradientEnabled: false,
    noiseEnabled: false,
    innerShadowEnabled: false,
    innerShadowCss: 'inset 1px 0 0 rgba(255,255,255,0.08), inset -1px 0 0 rgba(255,255,255,0.04)',
    edgeHighlightEnabled: false,
  };
}

function isDefaultDevThemeBackground(background: DevThemeBackground) {
  return !background.imageDataUrl
    && !background.originalImageDataUrl
    && background.imageFit === 'cover'
    && background.imageScale === 1
    && background.imagePositionX === 50
    && background.imagePositionY === 50
    && background.opacity === 0.96
    && background.blur === 24
    && background.saturate === 1.4
    && background.brightness === 1
    && background.contrast === 1
    && background.maskColor.toLowerCase() === '#161a22'
    && background.maskOpacity === 0.45
    && background.bottomFadeOpacity === 0
    && background.gradientEnabled === false
    && background.noiseEnabled === false
    && background.innerShadowEnabled === false
    && background.edgeHighlightEnabled === false;
}

function resolveSidebarBackground(background: DevThemeBackground) {
  return isDefaultDevThemeBackground(background)
    ? createCodexDarkGlassDevThemeBackground()
    : background;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(value, max));
}

function hexToRgb(hex: string) {
  const normalized = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return { r: 22, g: 26, b: 34 };
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function backgroundSize(background: DevThemeBackground) {
  if (background.imageFit === 'repeat' || background.imageFit === 'center') {
    return `${Math.round(clamp(background.imageScale, 0.5, 2) * 100)}% auto`;
  }
  return background.imageFit;
}

function backgroundPosition() {
  return 'center center';
}

function backgroundRepeat(background: DevThemeBackground) {
  return background.imageFit === 'repeat' ? 'repeat' : 'no-repeat';
}

function buildLayerList(background: DevThemeBackground) {
  const rgb = hexToRgb(background.maskColor);
  const opacity = clamp(background.opacity, 0, 1);
  const maskAlpha = clamp(background.maskOpacity, 0, 1) * opacity;
  const layers: string[] = [];

  const bottomFadeAlpha = Math.round(clamp(background.bottomFadeOpacity, 0, 1) * 1000) / 1000;
  if (bottomFadeAlpha > 0) {
    const bottomFadeStart = Math.round(clamp(background.bottomFadeStart, 0, 100));
    const bottomFadeSolidStart = Math.round(clamp(background.bottomFadeSolidStart, bottomFadeStart, 100));
    layers.push(`linear-gradient(180deg, rgba(0,0,0,0) ${bottomFadeStart}%, rgba(0,0,0,${bottomFadeAlpha}) ${bottomFadeSolidStart}%, rgba(0,0,0,${bottomFadeAlpha}) 100%)`);
  }
  layers.push(`linear-gradient(rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${maskAlpha}), rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${maskAlpha}))`);

  if (background.edgeHighlightEnabled) {
    layers.push(`linear-gradient(135deg, rgba(255,255,255,${0.18 * opacity}), rgba(255,255,255,0) 32%, rgba(255,255,255,${0.08 * opacity}) 100%)`);
  }
  if (background.noiseEnabled) {
    const noiseAlpha = clamp(background.noiseOpacity, 0, 0.4) * opacity;
    layers.push(`radial-gradient(circle at 20% 30%, rgba(255,255,255,${noiseAlpha}) 0 1px, transparent 1px 4px)`);
  }
  if (background.gradientEnabled && background.gradientCss.trim()) {
    layers.push(background.gradientCss.trim());
  }
  const imageSource = background.imageDataUrl || background.originalImageDataUrl;
  if (imageSource) {
    layers.push(`url('${imageSource}')`);
  }

  return layers.join(',\n    ');
}

function buildMaskBackgroundColor(background: DevThemeBackground) {
  const rgb = hexToRgb(background.maskColor);
  const alpha = Math.round(clamp(background.maskOpacity, 0, 1) * clamp(background.opacity, 0, 1) * 1000) / 1000;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function buildBoxShadow(background: DevThemeBackground) {
  const shadows: string[] = [];
  if (background.innerShadowEnabled && background.innerShadowCss.trim()) {
    shadows.push(background.innerShadowCss.trim());
  }
  if (background.edgeHighlightEnabled) {
    shadows.push('inset 0 0 0 1px rgba(255,255,255,0.10)');
  }
  return shadows.length ? `\n  box-shadow: ${shadows.join(', ')};` : '';
}

function buildBackdropFilter(background: DevThemeBackground) {
  const blur = clamp(background.blur, 0, 64);
  const saturate = Math.round(clamp(background.saturate, 0, 2) * 100);
  const brightness = Math.round(clamp(background.brightness, 0.5, 1.5) * 100);
  const contrast = Math.round(clamp(background.contrast, 0.5, 1.5) * 100);
  return `blur(${blur}px) saturate(${saturate}%) brightness(${brightness}%) contrast(${contrast}%)`;
}

function buildPseudoBaseDeclarations(selector: string) {
  if (!selector.includes('::')) return '';
  return `\n  content: '' !important;\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: var(--pm-left-rail-width);\n  height: 100%;\n  z-index: 0;\n  pointer-events: none;`;
}

function buildElementFilter(selector: string, background: DevThemeBackground) {
  if (!selector.includes('::')) return '';
  return `\n  filter: ${buildBackdropFilter(background)} !important;`;
}

function buildBlock(selector: string, background: DevThemeBackground) {
  const backdropFilter = buildBackdropFilter(background);

  return `${selector} {
  ${buildPseudoBaseDeclarations(selector)}
  background-color: ${buildMaskBackgroundColor(background)} !important;
  background-image:
    ${buildLayerList(background)} !important;
  background-size: ${backgroundSize(background)} !important;
  background-position: ${backgroundPosition()} !important;
  background-repeat: ${backgroundRepeat(background)} !important;
  backdrop-filter: ${backdropFilter} !important;
  -webkit-backdrop-filter: ${backdropFilter} !important;${buildElementFilter(selector, background)}${buildBoxShadow(background)}
}`;
}

function escapeAttributeValue(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function normalizeSelectorList(selectors: string[] | undefined) {
  const seen = new Set<string>();
  return (selectors ?? [])
    .map(selector => selector.trim())
    .filter(selector => {
      if (!selector) return false;
      if (selector.includes('[data-preset-manager-dev-selected="true"]')) return false;
      if (seen.has(selector)) return false;
      seen.add(selector);
      return true;
    });
}

export function buildDevThemeSourceSelectors(path: string) {
  if (!path) return [];
  const escaped = escapeAttributeValue(path);
  const escapedWithColon = escapeAttributeValue(`${path}:`);
  return [
    `[data-insp-path="${escaped}"]`,
    `[data-insp-path^="${escapedWithColon}"]`,
    `[data-v-inspector="${escaped}"]`,
    `[data-v-inspector^="${escapedWithColon}"]`,
    `[data-preset-manager-selected-source="${escaped}"]`,
  ];
}

function buildLiveSelectedSelectors(paths: string[]) {
  const seen = new Set<string>();
  const cleaned = paths.filter(path => {
    if (!path) return false;
    if (seen.has(path)) return false;
    seen.add(path);
    return true;
  });
  if (!cleaned.length) return '';
  return cleaned
    .flatMap(path => {
      return [
        `[data-preset-manager-dev-selected="true"]`,
        ...buildDevThemeSourceSelectors(path),
      ];
    })
    .join(',\n');
}

function buildExtraStyleDeclarations(background: DevThemeBackground) {
  return buildSelectedExtraStyleDeclarations(background);
}

function buildSelectedBlock(paths: string[], background: DevThemeBackground) {
  const selector = buildLiveSelectedSelectors(paths);
  if (!selector) return '';

  return buildStyleBlock(selector, background);
}

function buildStyleBlock(selector: string, background: DevThemeBackground) {
  const blocks: string[] = [];
  blocks.push(buildBlock(selector, background));

  const extras = buildExtraStyleDeclarations(background);
  if (extras.length) {
    blocks.push(`${selector} {\n  ${extras.join('\n  ')}\n}`);
  }
  return blocks.join('\n\n');
}

function buildPinnedBlock(pinned: DevThemePinnedStyle) {
  const selectors = normalizeSelectorList(pinned.selectors);
  const selector = selectors.length ? selectors.join(',\n') : buildDevThemeSourceSelectors(pinned.path).join(',\n');
  if (!selector) return '';
  return buildStyleBlock(selector, pinned.background);
}

export function buildDevThemeCss(state: DevThemeCssState) {
  if (!state.enabled) return '';

  const blocks: string[] = ['/* pm-dev-theme: auto-generated */'];
  if (state.targets.sidebar) blocks.push(buildBlock('.app-root[data-dev-sidebar="on"]::after', resolveSidebarBackground(state.background)));
  if (state.targets.workspace) blocks.push(buildBlock('.app-root[data-dev-workspace="on"] .preset-workspace', state.background));
  if (state.targets.panel) blocks.push(buildBlock('.app-root[data-dev-panel="on"] .ui-settings-panel', state.background));
  if (state.targets.selected) {
    for (const pinned of state.pinnedStyles ?? []) {
      const pinnedBlock = buildPinnedBlock(pinned);
      if (pinnedBlock) blocks.push(pinnedBlock);
    }
    if (state.selectedPaths && state.selectedPaths.length) {
      const selectedBlock = buildSelectedBlock(state.selectedPaths, state.background);
      if (selectedBlock) blocks.push(selectedBlock);
    }
  }

  return blocks.join('\n\n');
}
