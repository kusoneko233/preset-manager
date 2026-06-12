import { createDefaultDevThemeBackground, type DevThemeBackground, type DevThemePinnedStyle, type DevThemeTarget } from './devThemeCss';

export type DevThemeExportConfig = {
  name: string;
  version: 1;
  imageFileName: string | null;
  targets: Record<DevThemeTarget, boolean>;
  pinnedStyles?: DevThemePinnedStyle[];
  background: DevThemeBackground;
};

export type DevThemeExportInput = Omit<DevThemeExportConfig, 'version'>;

export const DEV_THEME_IMAGE_MAX_BYTES = 20 * 1024 * 1024;

export function sanitizePresetFileName(name: string) {
  return name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'dev-theme-preset';
}

export function validateImageFileLike(file: Pick<File, 'type' | 'size'>) {
  if (!file.type.startsWith('image/')) return '请选择图片文件';
  if (file.size > DEV_THEME_IMAGE_MAX_BYTES) return '图片不能超过 20MB';
  return null;
}

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const validationError = validateImageFileLike(file);
    if (validationError) {
      reject(new Error(validationError));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
}

export function serializeDevThemeConfig(input: DevThemeExportInput) {
  const config: DevThemeExportConfig = {
    version: 1,
    name: input.name,
    imageFileName: input.imageFileName,
    targets: input.targets,
    pinnedStyles: input.pinnedStyles ?? [],
    background: {
      ...input.background,
      imageDataUrl: input.background.imageDataUrl,
      originalImageDataUrl: input.background.originalImageDataUrl,
    },
  };
  return JSON.stringify(config, null, 2);
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim());
}

function asPinnedStability(value: unknown): DevThemePinnedStyle['stability'] {
  if (value === 'source' || value === 'stable' || value === 'fallback') return value;
  return 'fallback';
}

function isAllowedBackgroundImageSource(value: string) {
  return (
    value.startsWith('data:image/') ||
    value.startsWith('http://127.0.0.1:') ||
    value.startsWith('http://localhost:') ||
    value.startsWith('https://')
  );
}

function asNullableImageDataUrl(value: unknown) {
  return typeof value === 'string' && isAllowedBackgroundImageSource(value) ? value : null;
}

function asImageFit(value: unknown, fallback: DevThemeBackground['imageFit']): DevThemeBackground['imageFit'] {
  if (value === 'cover' || value === 'contain' || value === 'repeat' || value === 'center') return value;
  if (value === 'framed') return 'contain';
  return fallback;
}

function sanitizeBackground(source: any): DevThemeBackground {
  const defaults = createDefaultDevThemeBackground();
  return {
    imageDataUrl: asNullableImageDataUrl(source.imageDataUrl),
    originalImageDataUrl: asNullableImageDataUrl(source.originalImageDataUrl),
    imageFit: asImageFit(source.imageFit, defaults.imageFit),
    imageScale: asNumber(source.imageScale, defaults.imageScale),
    imagePositionX: asNumber(source.imagePositionX, defaults.imagePositionX),
    imagePositionY: asNumber(source.imagePositionY, defaults.imagePositionY),
    opacity: asNumber(source.opacity, defaults.opacity),
    blur: asNumber(source.blur, defaults.blur),
    saturate: asNumber(source.saturate, defaults.saturate),
    brightness: asNumber(source.brightness, defaults.brightness),
    contrast: asNumber(source.contrast, defaults.contrast),
    maskColor: asString(source.maskColor, defaults.maskColor),
    maskOpacity: asNumber(source.maskOpacity, defaults.maskOpacity),
    bottomFadeOpacity: asNumber(source.bottomFadeOpacity, defaults.bottomFadeOpacity),
    bottomFadeStart: asNumber(source.bottomFadeStart, defaults.bottomFadeStart),
    bottomFadeSolidStart: asNumber(source.bottomFadeSolidStart, defaults.bottomFadeSolidStart),
    gradientEnabled: asBoolean(source.gradientEnabled, defaults.gradientEnabled),
    gradientCss: asString(source.gradientCss, defaults.gradientCss),
    noiseEnabled: asBoolean(source.noiseEnabled, defaults.noiseEnabled),
    noiseOpacity: asNumber(source.noiseOpacity, defaults.noiseOpacity),
    innerShadowEnabled: asBoolean(source.innerShadowEnabled, defaults.innerShadowEnabled),
    innerShadowCss: asString(source.innerShadowCss, defaults.innerShadowCss),
    edgeHighlightEnabled: asBoolean(source.edgeHighlightEnabled, defaults.edgeHighlightEnabled),
    textColorEnabled: asBoolean(source.textColorEnabled, defaults.textColorEnabled),
    textColor: asString(source.textColor, defaults.textColor),
    fontSizeEnabled: asBoolean(source.fontSizeEnabled, defaults.fontSizeEnabled),
    fontSizePx: asNumber(source.fontSizePx, defaults.fontSizePx),
    fontWeightEnabled: asBoolean(source.fontWeightEnabled, defaults.fontWeightEnabled),
    fontWeight: asNumber(source.fontWeight, defaults.fontWeight),
    lineHeightEnabled: asBoolean(source.lineHeightEnabled, defaults.lineHeightEnabled),
    lineHeight: asNumber(source.lineHeight, defaults.lineHeight),
    paddingEnabled: asBoolean(source.paddingEnabled, defaults.paddingEnabled),
    paddingPx: asNumber(source.paddingPx, defaults.paddingPx),
    marginEnabled: asBoolean(source.marginEnabled, defaults.marginEnabled),
    marginPx: asNumber(source.marginPx, defaults.marginPx),
    widthEnabled: asBoolean(source.widthEnabled, defaults.widthEnabled),
    widthPx: asNumber(source.widthPx, defaults.widthPx),
    heightEnabled: asBoolean(source.heightEnabled, defaults.heightEnabled),
    heightPx: asNumber(source.heightPx, defaults.heightPx),
    borderRadiusEnabled: asBoolean(source.borderRadiusEnabled, defaults.borderRadiusEnabled),
    borderRadiusPx: asNumber(source.borderRadiusPx, defaults.borderRadiusPx),
  };
}

function asPinnedStyles(value: unknown): DevThemePinnedStyle[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(item => typeof item?.path === 'string' && item.path.trim())
    .map((item, index) => ({
      id: typeof item.id === 'string' && item.id ? item.id : `imported-pinned-${index}`,
      path: item.path,
      selectors: asStringArray(item.selectors),
      label: typeof item.label === 'string' && item.label ? item.label : item.path,
      stability: asPinnedStability(item.stability),
      matchedCount: asNumber(item.matchedCount, 1),
      background: sanitizeBackground(item.background ?? {}),
    }));
}

export function parseDevThemeConfig(raw: string): DevThemeExportConfig {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('这个不是背景预设配置文件');
  }

  if (parsed?.version !== 1 || typeof parsed?.name !== 'string') {
    throw new Error('这个不是背景预设配置文件');
  }

  const source = parsed.background ?? {};

  return {
    version: 1,
    name: parsed.name,
    imageFileName: typeof parsed.imageFileName === 'string' ? parsed.imageFileName : null,
    targets: {
      sidebar: asBoolean(parsed.targets?.sidebar, true),
      workspace: asBoolean(parsed.targets?.workspace, true),
      panel: asBoolean(parsed.targets?.panel, true),
      selected: asBoolean(parsed.targets?.selected, false),
    },
    pinnedStyles: asPinnedStyles(parsed.pinnedStyles),
    background: sanitizeBackground(source),
  };
}
