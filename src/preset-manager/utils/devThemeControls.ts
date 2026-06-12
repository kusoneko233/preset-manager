import type { DevThemeBackground } from './devThemeCss';

export type DevThemeControlScope = 'background' | 'selected-text' | 'selected-box' | 'decoration';

export type DevThemeControlTrace = {
  id: string;
  label: string;
  beginnerHint: string;
  cssProperties: string[];
  sourceLocation: string;
  scope: DevThemeControlScope;
  enabled: boolean;
  declarations: string[];
};

export type DevThemeControlSpec = {
  id: string;
  label: string;
  beginnerHint: string;
  cssProperties: string[];
  sourceLocation: string;
  scope: DevThemeControlScope;
  isEnabled: (background: DevThemeBackground) => boolean;
  buildDeclarations: (background: DevThemeBackground) => string[];
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(value, max));
}

function round(value: number) {
  return Math.round(value);
}

function buildFilterDeclaration(background: DevThemeBackground) {
  const saturate = clamp(background.saturate, 0, 2);
  const brightness = clamp(background.brightness, 0.5, 1.5);
  const contrast = clamp(background.contrast, 0.5, 1.5);
  return `backdrop-filter: blur(${clamp(background.blur, 0, 64)}px) saturate(${Math.round(saturate * 100)}%) brightness(${Math.round(brightness * 100)}%) contrast(${Math.round(contrast * 100)}%) !important;`;
}

function buildBackdropFilterDeclarations(background: DevThemeBackground) {
  const blur = clamp(background.blur, 0, 64);
  const saturate = clamp(background.saturate, 0, 2);
  const brightness = clamp(background.brightness, 0.5, 1.5);
  const contrast = clamp(background.contrast, 0.5, 1.5);
  const value = `blur(${blur}px) saturate(${Math.round(saturate * 100)}%) brightness(${Math.round(brightness * 100)}%) contrast(${Math.round(contrast * 100)}%)`;
  return [`backdrop-filter: ${value} !important;`, `-webkit-backdrop-filter: ${value} !important;`];
}

function buildBackgroundColorDeclaration(background: DevThemeBackground) {
  const normalized = background.maskColor.trim().replace(/^#/, '');
  const valid = /^[0-9a-fA-F]{6}$/.test(normalized);
  const r = valid ? Number.parseInt(normalized.slice(0, 2), 16) : 22;
  const g = valid ? Number.parseInt(normalized.slice(2, 4), 16) : 26;
  const b = valid ? Number.parseInt(normalized.slice(4, 6), 16) : 34;
  const alpha = Math.round(clamp(background.opacity, 0, 1) * clamp(background.maskOpacity, 0, 1) * 1000) / 1000;
  return `background-color: rgba(${r}, ${g}, ${b}, ${alpha}) !important;`;
}

export const DEV_THEME_CONTROL_SPECS: DevThemeControlSpec[] = [
  {
    id: 'imageScale',
    label: '图片缩放',
    beginnerHint: '放大或缩小背景图片本身。',
    cssProperties: ['background-size'],
    sourceLocation: 'src/preset-manager/utils/devThemeCss.ts > buildBlock',
    scope: 'background',
    isEnabled: () => true,
    buildDeclarations: background => [`background-size: ${background.imageFit === 'repeat' || background.imageFit === 'center' ? `${round(clamp(background.imageScale, 0.5, 2) * 100)}% auto` : background.imageFit};`],
  },
  {
    id: 'opacity',
    label: '整体不透明度',
    beginnerHint: '控制整块背景层透明度。',
    cssProperties: ['background-color alpha', 'background-image alpha'],
    sourceLocation: 'src/preset-manager/utils/devThemeCss.ts > buildBlock',
    scope: 'background',
    isEnabled: () => true,
    buildDeclarations: background => [buildBackgroundColorDeclaration(background)],
  },
  {
    id: 'blur',
    label: '毛玻璃模糊',
    beginnerHint: '让元素背后的内容像磨砂玻璃一样变模糊。',
    cssProperties: ['backdrop-filter', '-webkit-backdrop-filter'],
    sourceLocation: 'src/preset-manager/utils/devThemeCss.ts > buildBlock',
    scope: 'background',
    isEnabled: () => true,
    buildDeclarations: buildBackdropFilterDeclarations,
  },
  {
    id: 'saturate',
    label: '饱和度（彩度）',
    beginnerHint: '控制颜色鲜艳程度。',
    cssProperties: ['backdrop-filter: saturate(...)'],
    sourceLocation: 'src/preset-manager/utils/devThemeCss.ts > buildBlock',
    scope: 'background',
    isEnabled: () => true,
    buildDeclarations: background => [buildFilterDeclaration(background), ...buildBackdropFilterDeclarations(background)],
  },
  {
    id: 'brightness',
    label: '亮度',
    beginnerHint: '控制背景层整体偏亮还是偏暗。',
    cssProperties: ['backdrop-filter: brightness(...)'],
    sourceLocation: 'src/preset-manager/utils/devThemeCss.ts > buildBlock',
    scope: 'background',
    isEnabled: () => true,
    buildDeclarations: background => [buildFilterDeclaration(background)],
  },
  {
    id: 'contrast',
    label: '对比度',
    beginnerHint: '控制明暗差距强不强。',
    cssProperties: ['backdrop-filter: contrast(...)'],
    sourceLocation: 'src/preset-manager/utils/devThemeCss.ts > buildBlock',
    scope: 'background',
    isEnabled: () => true,
    buildDeclarations: background => [buildFilterDeclaration(background)],
  },
  {
    id: 'mask',
    label: '遮罩颜色 / 暗化程度',
    beginnerHint: '在背景上盖一层颜色，常用来压暗图片。',
    cssProperties: ['background-image: linear-gradient(...)'],
    sourceLocation: 'src/preset-manager/utils/devThemeCss.ts > buildLayerList',
    scope: 'background',
    isEnabled: () => true,
    buildDeclarations: () => ['background-image: linear-gradient(...);'],
  },
  {
    id: 'bottomFade',
    label: '底部压黑',
    beginnerHint: '在背景底部叠加黑色渐变，让图片下方自然沉到暗色。',
    cssProperties: ['background-image: linear-gradient(...)'],
    sourceLocation: 'src/preset-manager/utils/devThemeCss.ts > buildLayerList',
    scope: 'background',
    isEnabled: background => background.bottomFadeOpacity > 0,
    buildDeclarations: background => {
      const alpha = Math.round(clamp(background.bottomFadeOpacity, 0, 1) * 1000) / 1000;
      const start = round(clamp(background.bottomFadeStart, 0, 100));
      const solidStart = round(clamp(background.bottomFadeSolidStart, start, 100));
      return [`background-image layer: linear-gradient(180deg, rgba(0,0,0,0) ${start}%, rgba(0,0,0,${alpha}) ${solidStart}%, rgba(0,0,0,${alpha}) 100%);`];
    },
  },
  {
    id: 'textColor',
    label: '文字颜色',
    beginnerHint: '改变选中元素里的文字颜色。',
    cssProperties: ['color'],
    sourceLocation: 'src/preset-manager/utils/devThemeCss.ts > buildExtraStyleDeclarations',
    scope: 'selected-text',
    isEnabled: background => background.textColorEnabled,
    buildDeclarations: background => background.textColorEnabled ? [`color: ${background.textColor} !important;`] : [],
  },
  {
    id: 'fontSize',
    label: '字号',
    beginnerHint: '改变选中元素里的文字大小。',
    cssProperties: ['font-size'],
    sourceLocation: 'src/preset-manager/utils/devThemeCss.ts > buildExtraStyleDeclarations',
    scope: 'selected-text',
    isEnabled: background => background.fontSizeEnabled,
    buildDeclarations: background => background.fontSizeEnabled ? [`font-size: ${round(background.fontSizePx)}px !important;`] : [],
  },
  {
    id: 'fontWeight',
    label: '字体粗细',
    beginnerHint: '让文字更细或更粗。',
    cssProperties: ['font-weight'],
    sourceLocation: 'src/preset-manager/utils/devThemeCss.ts > buildExtraStyleDeclarations',
    scope: 'selected-text',
    isEnabled: background => background.fontWeightEnabled,
    buildDeclarations: background => background.fontWeightEnabled ? [`font-weight: ${round(background.fontWeight)} !important;`] : [],
  },
  {
    id: 'lineHeight',
    label: '行间距',
    beginnerHint: '控制多行文字每一行之间的距离。',
    cssProperties: ['line-height'],
    sourceLocation: 'src/preset-manager/utils/devThemeCss.ts > buildExtraStyleDeclarations',
    scope: 'selected-text',
    isEnabled: background => background.lineHeightEnabled,
    buildDeclarations: background => background.lineHeightEnabled ? [`line-height: ${background.lineHeight} !important;`] : [],
  },
  {
    id: 'padding',
    label: '内边距',
    beginnerHint: '元素内容到自己边框的距离。',
    cssProperties: ['padding'],
    sourceLocation: 'src/preset-manager/utils/devThemeCss.ts > buildExtraStyleDeclarations',
    scope: 'selected-box',
    isEnabled: background => background.paddingEnabled,
    buildDeclarations: background => background.paddingEnabled ? [`padding: ${round(background.paddingPx)}px !important;`] : [],
  },
  {
    id: 'margin',
    label: '外边距',
    beginnerHint: '元素和周围元素之间的距离。',
    cssProperties: ['margin'],
    sourceLocation: 'src/preset-manager/utils/devThemeCss.ts > buildExtraStyleDeclarations',
    scope: 'selected-box',
    isEnabled: background => background.marginEnabled,
    buildDeclarations: background => background.marginEnabled ? [`margin: ${round(background.marginPx)}px !important;`] : [],
  },
  {
    id: 'width',
    label: '宽度',
    beginnerHint: '直接指定选中元素的宽。',
    cssProperties: ['width'],
    sourceLocation: 'src/preset-manager/utils/devThemeCss.ts > buildExtraStyleDeclarations',
    scope: 'selected-box',
    isEnabled: background => background.widthEnabled,
    buildDeclarations: background => background.widthEnabled ? [`width: ${round(background.widthPx)}px !important;`] : [],
  },
  {
    id: 'height',
    label: '高度',
    beginnerHint: '直接指定选中元素的高。',
    cssProperties: ['height'],
    sourceLocation: 'src/preset-manager/utils/devThemeCss.ts > buildExtraStyleDeclarations',
    scope: 'selected-box',
    isEnabled: background => background.heightEnabled,
    buildDeclarations: background => background.heightEnabled ? [`height: ${round(background.heightPx)}px !important;`] : [],
  },
  {
    id: 'borderRadius',
    label: '圆角',
    beginnerHint: '控制边角圆滑程度。',
    cssProperties: ['border-radius'],
    sourceLocation: 'src/preset-manager/utils/devThemeCss.ts > buildExtraStyleDeclarations',
    scope: 'selected-box',
    isEnabled: background => background.borderRadiusEnabled,
    buildDeclarations: background => background.borderRadiusEnabled ? [`border-radius: ${round(background.borderRadiusPx)}px !important;`] : [],
  },
  {
    id: 'noise',
    label: '噪点纹理',
    beginnerHint: '给背景叠加颗粒感。',
    cssProperties: ['background-image: radial-gradient(...)'],
    sourceLocation: 'src/preset-manager/utils/devThemeCss.ts > buildLayerList',
    scope: 'decoration',
    isEnabled: background => background.noiseEnabled,
    buildDeclarations: background => background.noiseEnabled ? [`background-image layer: radial-gradient(... rgba(..., ${clamp(background.noiseOpacity, 0, 0.4)}));`] : [],
  },
  {
    id: 'innerShadow',
    label: '内阴影',
    beginnerHint: '在元素内部边缘加阴影。',
    cssProperties: ['box-shadow'],
    sourceLocation: 'src/preset-manager/utils/devThemeCss.ts > buildBoxShadow',
    scope: 'decoration',
    isEnabled: background => background.innerShadowEnabled && Boolean(background.innerShadowCss.trim()),
    buildDeclarations: background => background.innerShadowEnabled && background.innerShadowCss.trim() ? [`box-shadow: ${background.innerShadowCss.trim()};`] : [],
  },
  {
    id: 'edgeHighlight',
    label: '边缘高光',
    beginnerHint: '给边缘加一圈轻微反光。',
    cssProperties: ['background-image', 'box-shadow'],
    sourceLocation: 'src/preset-manager/utils/devThemeCss.ts > buildLayerList / buildBoxShadow',
    scope: 'decoration',
    isEnabled: background => background.edgeHighlightEnabled,
    buildDeclarations: background => background.edgeHighlightEnabled ? ['background-image layer: linear-gradient(135deg, ...);', 'box-shadow: inset 0 0 0 1px rgba(255,255,255,0.10);'] : [],
  },
];

export function getDevThemeControlSpec(id: string) {
  return DEV_THEME_CONTROL_SPECS.find(item => item.id === id);
}

export function getDevThemeControlTraces(background: DevThemeBackground): DevThemeControlTrace[] {
  return DEV_THEME_CONTROL_SPECS.map(spec => ({
    id: spec.id,
    label: spec.label,
    beginnerHint: spec.beginnerHint,
    cssProperties: spec.cssProperties,
    sourceLocation: spec.sourceLocation,
    scope: spec.scope,
    enabled: spec.isEnabled(background),
    declarations: spec.buildDeclarations(background),
  }));
}

export function buildSelectedExtraStyleDeclarations(background: DevThemeBackground) {
  return getDevThemeControlTraces(background)
    .filter(trace => (trace.scope === 'selected-text' || trace.scope === 'selected-box') && trace.enabled)
    .flatMap(trace => trace.declarations);
}
