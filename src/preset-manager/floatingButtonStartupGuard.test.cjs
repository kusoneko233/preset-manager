const fs = require('fs');
const path = require('path');

const index = fs.readFileSync(path.join(process.cwd(), 'src/preset-manager/index.ts'), 'utf8');

function expectIncludes(content, expected) {
  if (!content.includes(expected)) throw new Error(`Expected source to include: ${expected}`);
}

function expectOrder(before, after) {
  const beforeIndex = index.indexOf(before);
  const afterIndex = index.indexOf(after);
  if (beforeIndex < 0) throw new Error(`Missing before marker: ${before}`);
  if (afterIndex < 0) throw new Error(`Missing after marker: ${after}`);
  if (beforeIndex > afterIndex) throw new Error(`Expected ${before} to appear before ${after}`);
}

expectIncludes(index, 'function registerScriptButton()');
expectIncludes(index, "console.warn('[Preset Manager] script button registration failed:', error);");
expectIncludes(index, '$floatingBtn = createFloatingButton();');
expectIncludes(index, 'registerScriptButton();');
expectOrder('$floatingBtn = createFloatingButton();', 'registerScriptButton();');

console.info('floatingButtonStartupGuard tests passed');
