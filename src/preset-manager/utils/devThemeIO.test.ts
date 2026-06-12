declare const require: any;
declare const process: any;

const fs = require('fs');
const path = require('path');

function readProjectFile(file: string) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8') as string;
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

const devThemeIO = readProjectFile('src/preset-manager/utils/devThemeIO.ts');

expectIncludes(devThemeIO, "import { createDefaultDevThemeBackground, type DevThemeBackground, type DevThemePinnedStyle, type DevThemeTarget } from './devThemeCss';");
expectIncludes(devThemeIO, 'export const DEV_THEME_IMAGE_MAX_BYTES = 20 * 1024 * 1024;');
expectIncludes(devThemeIO, 'export function sanitizePresetFileName(name: string)');
expectIncludes(devThemeIO, '.replace(/[\\\\/:*?"<>|]+/g, \'-\')');
expectIncludes(devThemeIO, 'export function validateImageFileLike(file: Pick<File, \'type\' | \'size\'>)');
expectIncludes(devThemeIO, "if (!file.type.startsWith('image/')) return '请选择图片文件';");
expectIncludes(devThemeIO, "if (file.size > DEV_THEME_IMAGE_MAX_BYTES) return '图片不能超过 20MB';");
expectIncludes(devThemeIO, 'export function serializeDevThemeConfig(input: DevThemeExportInput)');
expectIncludes(devThemeIO, 'imageDataUrl: input.background.imageDataUrl,');
expectIncludes(devThemeIO, 'originalImageDataUrl: input.background.originalImageDataUrl,');
expectIncludes(devThemeIO, 'pinnedStyles: input.pinnedStyles ?? [],');
expectIncludes(devThemeIO, 'function asImageFit');
expectIncludes(devThemeIO, "if (value === 'framed') return 'contain';");
expectIncludes(devThemeIO, 'function asPinnedStyles(value: unknown): DevThemePinnedStyle[]');
expectIncludes(devThemeIO, 'pinnedStyles: asPinnedStyles(parsed.pinnedStyles),');
expectIncludes(devThemeIO, 'imagePositionX: asNumber(source.imagePositionX, defaults.imagePositionX),');
expectIncludes(devThemeIO, 'imagePositionY: asNumber(source.imagePositionY, defaults.imagePositionY),');
expectIncludes(devThemeIO, 'export function parseDevThemeConfig(raw: string): DevThemeExportConfig');
expectIncludes(devThemeIO, 'imageDataUrl: asNullableImageDataUrl(source.imageDataUrl),');
expectIncludes(devThemeIO, 'originalImageDataUrl: asNullableImageDataUrl(source.originalImageDataUrl),');
expectIncludes(devThemeIO, 'function asNullableImageDataUrl(value: unknown)');
expectIncludes(devThemeIO, 'function isAllowedBackgroundImageSource(value: string)');
expectIncludes(devThemeIO, "value.startsWith('http://127.0.0.1:')");
expectIncludes(devThemeIO, "value.startsWith('http://localhost:')");
expectIncludes(devThemeIO, "value.startsWith('https://')");
expectNotIncludes(devThemeIO, 'vitest');
expectNotIncludes(devThemeIO, 'declare const require');

console.info('devThemeIO tests passed');
