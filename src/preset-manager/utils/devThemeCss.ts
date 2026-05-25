import { buildSelectedExtraStyleDeclarations } from './devThemeControls';

export type DevThemeTarget = 'sidebar' | 'workspace' | 'panel' | 'selected';

export type DevThemeBackground = {
  imageDataUrl: string | null;
  imageFit: 'cover' | 'contain' | 'repeat' | 'center';
  imageScale: number;
  opacity: number;
  blur: number;
  saturate: number;
  brightness: number;
  contrast: number;
  maskColor: string;
  maskOpacity: number;
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
};

export function createDefaultDevThemeBackground(): DevThemeBackground {
  return {
    imageDataUrl: null,
    imageFit: 'cover',
    imageScale: 1,
    opacity: 0.96,
    blur: 24,
    saturate: 1.4,
    brightness: 1,
    contrast: 1,
    maskColor: '#161A22',
    maskOpacity: 0.45,
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

function backgroundRepeat(background: DevThemeBackground) {
  return background.imageFit === 'repeat' ? 'repeat' : 'no-repeat';
}

function buildLayerList(background: DevThemeBackground) {
  const rgb = hexToRgb(background.maskColor);
  const maskAlpha = clamp(background.maskOpacity, 0, 1);
  const layers = [
    `linear-gradient(rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${maskAlpha}), rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${maskAlpha}))`,
  ];

  if (background.edgeHighlightEnabled) {
    layers.push('linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0) 32%, rgba(255,255,255,0.08) 100%)');
  }
  if (background.noiseEnabled) {
    const noiseAlpha = clamp(background.noiseOpacity, 0, 0.4);
    layers.push(`radial-gradient(circle at 20% 30%, rgba(255,255,255,${noiseAlpha}) 0 1px, transparent 1px 4px)`);
  }
  if (background.gradientEnabled && background.gradientCss.trim()) {
    layers.push(background.gradientCss.trim());
  }
  if (background.imageDataUrl) {
    layers.push(`url('${background.imageDataUrl}')`);
  }

  return layers.join(',\n    ');
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

function buildBlock(selector: string, background: DevThemeBackground) {
  const opacity = clamp(background.opacity, 0, 1);
  const blur = clamp(background.blur, 0, 64);
  const saturate = clamp(background.saturate, 0, 2);
  const brightness = clamp(background.brightness, 0.5, 1.5);
  const contrast = clamp(background.contrast, 0.5, 1.5);

  return `${selector} {
  background-image:
    ${buildLayerList(background)};
  background-size: ${backgroundSize(background)};
  background-position: center center;
  background-repeat: ${backgroundRepeat(background)};
  opacity: ${opacity};
  filter: saturate(${saturate}) brightness(${brightness}) contrast(${contrast});
  backdrop-filter: blur(${blur}px) saturate(${Math.round(saturate * 100)}%);${buildBoxShadow(background)}
  -webkit-backdrop-filter: blur(${blur}px) saturate(${Math.round(saturate * 100)}%);
}`;
}

function escapeAttributeValue(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function buildSelectedSelectors(paths: string[]) {
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
      const escaped = escapeAttributeValue(path);
      const escapedWithColon = escapeAttributeValue(`${path}:`);
      return [
        `[data-insp-path="${escaped}"]`,
        `[data-insp-path^="${escapedWithColon}"]`,
        `[data-v-inspector="${escaped}"]`,
        `[data-v-inspector^="${escapedWithColon}"]`,
        `[data-preset-manager-selected-source="${escaped}"]`,
      ];
    })
    .join(',\n');
}

function buildExtraStyleDeclarations(background: DevThemeBackground) {
  return buildSelectedExtraStyleDeclarations(background);
}

function buildSelectedBlock(paths: string[], background: DevThemeBackground) {
  const selector = buildSelectedSelectors(paths);
  if (!selector) return '';

  const blocks: string[] = [];
  blocks.push(buildBlock(selector, background));

  const extras = buildExtraStyleDeclarations(background);
  if (extras.length) {
    blocks.push(`${selector} {\n  ${extras.join('\n  ')}\n}`);
  }
  return blocks.join('\n\n');
}

export function buildDevThemeCss(state: DevThemeCssState) {
  if (!state.enabled) return '';

  const blocks: string[] = ['/* pm-dev-theme: auto-generated */'];
  if (state.targets.sidebar) blocks.push(buildBlock('.app-root[data-dev-sidebar="on"]::before', state.background));
  if (state.targets.workspace) blocks.push(buildBlock('.app-root[data-dev-workspace="on"] .preset-workspace', state.background));
  if (state.targets.panel) blocks.push(buildBlock('.app-root[data-dev-panel="on"] .ui-settings-panel', state.background));
  if (state.targets.selected && state.selectedPaths && state.selectedPaths.length) {
    const selectedBlock = buildSelectedBlock(state.selectedPaths, state.background);
    if (selectedBlock) blocks.push(selectedBlock);
  }

  return blocks.join('\n\n');
}
