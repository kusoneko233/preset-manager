import type { DevThemeBackground, DevThemeTarget } from './devThemeCss';

export type DevThemeExportConfig = {
  name: string;
  version: 1;
  imageFileName: string | null;
  targets: Record<DevThemeTarget, boolean>;
  background: DevThemeBackground;
};

export type DevThemeExportInput = Omit<DevThemeExportConfig, 'version'>;

export const DEV_THEME_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const DEFAULT_DEV_THEME_BACKGROUND: DevThemeBackground = {
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
  if (file.size > DEV_THEME_IMAGE_MAX_BYTES) return '图片不能超过 5MB';
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

  const defaults = DEFAULT_DEV_THEME_BACKGROUND;
  const source = parsed.background ?? {};

  return {
    version: 1,
    name: parsed.name,
    imageFileName: typeof parsed.imageFileName === 'string' ? parsed.imageFileName : null,
    targets: {
      sidebar: asBoolean(parsed.targets?.sidebar, true),
      workspace: asBoolean(parsed.targets?.workspace, true),
      panel: asBoolean(parsed.targets?.panel, true),
    },
    background: {
      imageDataUrl: null,
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
    },
  };
}
