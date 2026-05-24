export type DevThemeTarget = 'sidebar' | 'workspace' | 'panel';

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
};

export type DevThemeCssState = {
  enabled: boolean;
  targets: Record<DevThemeTarget, boolean>;
  background: DevThemeBackground;
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

export function buildDevThemeCss(state: DevThemeCssState) {
  if (!state.enabled) return '';

  const blocks: string[] = ['/* pm-dev-theme: auto-generated */'];
  if (state.targets.sidebar) blocks.push(buildBlock('.app-root[data-dev-sidebar="on"]::before', state.background));
  if (state.targets.workspace) blocks.push(buildBlock('.app-root[data-dev-workspace="on"] .preset-workspace', state.background));
  if (state.targets.panel) blocks.push(buildBlock('.app-root[data-dev-panel="on"] .ui-settings-panel', state.background));

  return blocks.join('\n\n');
}
