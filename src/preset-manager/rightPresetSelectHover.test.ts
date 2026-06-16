/* eslint-disable import-x/no-nodejs-modules */
declare const require: any;
declare const process: any;

const fs = require('fs');
const path = require('path');

function readProjectFile(file: string) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8') as string;
}

function expectIncludes(content: string, expected: string) {
  if (!content.includes(expected)) {
    throw new Error(`Expected file to include: ${expected}`);
  }
}

function expectNotIncludes(content: string, unexpected: string) {
  if (content.includes(unexpected)) {
    throw new Error(`Expected file not to include: ${unexpected}`);
  }
}

function cssBlock(content: string, selector: string) {
  const start = content.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`Expected CSS block to exist: ${selector}`);
  const end = content.indexOf('\n}', start);
  if (end < 0) throw new Error(`Expected CSS block to close: ${selector}`);
  return content.slice(start, end);
}

const app = readProjectFile('src/preset-manager/App.vue');
const titleBar = readProjectFile('src/preset-manager/components/TitleBar.vue');

const mainPresetTitleHoverBlock = cssBlock(titleBar, '.preset-title-button:hover,\n.preset-title-button.open');
expectIncludes(mainPresetTitleHoverBlock, 'background: var(--pm-pill-bg-hover);');

const rightPresetSelectWrapBlock = cssBlock(app, '.right-preset-select-wrap');
expectNotIncludes(rightPresetSelectWrapBlock, 'cursor: pointer;');

expectIncludes(app, ':class="{ open: rightPresetMenuTabId === activeRightAuxTab.id }"');
expectNotIncludes(app, '.right-preset-select-wrap::before');
expectNotIncludes(app, 'border-color: var(--pm-pill-border-hover);');

const rightPresetSelectBlock = cssBlock(app, '.right-preset-select');
expectIncludes(rightPresetSelectBlock, 'height: 32px;');
expectIncludes(rightPresetSelectBlock, 'padding: 0 10px;');
expectIncludes(rightPresetSelectBlock, 'border: 1px solid transparent;');
expectIncludes(rightPresetSelectBlock, 'border-radius: 8px;');
expectIncludes(rightPresetSelectBlock, 'transition: background 0.12s ease, border-color 0.12s ease;');

const rightPresetSelectHoverBlock = cssBlock(app, '.right-preset-select:hover,\n.right-preset-select.open');
expectIncludes(rightPresetSelectHoverBlock, 'background: var(--pm-pill-bg-hover);');
expectNotIncludes(rightPresetSelectHoverBlock, 'border-color');
expectNotIncludes(rightPresetSelectHoverBlock, 'background: var(--pm-row-hover);');

console.info('rightPresetSelectHover tests passed');
