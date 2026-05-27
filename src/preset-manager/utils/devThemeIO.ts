import { createDefaultDevThemeBackground, type DevThemeBackground, type DevThemeTarget } from './devThemeCss';

export type DevThemeExportConfig = {
  name: string;
  version: 1;
  imageFileName: string | null;
  targets: Record<DevThemeTarget, boolean>;
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
    background: {
      ...input.background,
      imageDataUrl: null,
      originalImageDataUrl: null,
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

  const defaults = createDefaultDevThemeBackground();
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
    background: {
      imageDataUrl: null,
      originalImageDataUrl: null,
      imageFit: ['cover', 'contain', 'repeat', 'center'].includes(source.imageFit) ? source.imageFit : defaults.imageFit,
      imageScale: asNumber(source.imageScale, defaults.imageScale),
      opacity: asNumber(source.opacity, defaults.opacity),
      blur: asNumber(source.blur, defaults.blur),
      saturate: asNumber(source.saturate, defaults.saturate),
      brightness: asNumber(source.brightness, defaults.brightness),
      contrast: asNumber(source.contrast, defaults.contrast),
      maskColor: asString(source.maskColor, defaults.maskColor),
      maskOpacity: asNumber(source.maskOpacity, defaults.maskOpacity),
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
    },
  };
}
