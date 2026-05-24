declare const require: any;

const { createDefaultDevThemeBackground } = require('./devThemeCss');
const {
  parseDevThemeConfig,
  sanitizePresetFileName,
  serializeDevThemeConfig,
  validateImageFileLike,
} = require('./devThemeIO');

function expectEqual<T>(actual: T, expected: T) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
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

expectEqual(sanitizePresetFileName('深色/亚克力:*?'), '深色-亚克力');

const background = { ...createDefaultDevThemeBackground(), imageDataUrl: 'data:image/png;base64,abc' };
const json = serializeDevThemeConfig({
  name: '深色亚克力',
  imageFileName: 'bg.png',
  targets: { sidebar: true, workspace: true, panel: false },
  background,
});
expectIncludes(json, 'bg.png');
expectNotIncludes(json, 'base64,abc');

const parsed = parseDevThemeConfig(json);
expectEqual(parsed.name, '深色亚克力');
expectEqual(parsed.background.imageDataUrl, null);

expectEqual(validateImageFileLike({ type: 'image/png', size: 1024 }), null);
expectEqual(validateImageFileLike({ type: 'text/plain', size: 1024 }), '请选择图片文件');
expectEqual(validateImageFileLike({ type: 'image/png', size: 6 * 1024 * 1024 }), '图片不能超过 5MB');

console.info('devThemeIO tests passed');
