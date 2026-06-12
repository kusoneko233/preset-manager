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

const app = readProjectFile('src/preset-manager/App.vue');

expectIncludes(app, '--pm-scrollbar-thumb:');
expectIncludes(app, '--pm-scrollbar-thumb-hover:');
expectIncludes(app, '--pm-scrollbar-thumb-active:');
expectIncludes(app, '--pm-scrollbar-thumb: rgba(255, 255, 255, 0.06);');
expectIncludes(app, '--pm-scrollbar-thumb-hover: rgba(255, 255, 255, 0.1);');
expectIncludes(app, '--pm-scrollbar-thumb-active: rgba(255, 255, 255, 0.2);');
expectIncludes(app, '--pm-scrollbar-thumb: rgba(255, 255, 255, 0.05);');
expectIncludes(app, '--pm-scrollbar-thumb-hover: rgba(255, 255, 255, 0.08);');
expectIncludes(app, '--pm-scrollbar-thumb-active: rgba(255, 255, 255, 0.16);');
expectIncludes(app, '--pm-scrollbar-thumb: rgba(15, 17, 21, 0.08);');
expectIncludes(app, '--pm-scrollbar-thumb-hover: rgba(15, 17, 21, 0.12);');
expectIncludes(app, '--pm-scrollbar-thumb-active: rgba(15, 17, 21, 0.22);');
expectIncludes(app, 'scrollbar-color: var(--pm-scrollbar-thumb) transparent;');
expectIncludes(app, '::-webkit-scrollbar-thumb:hover');
expectIncludes(app, 'background: var(--pm-scrollbar-thumb-hover);');
expectIncludes(app, '::-webkit-scrollbar-thumb:active');
expectIncludes(app, 'background: var(--pm-scrollbar-thumb-active);');
expectIncludes(app, 'background-clip: content-box;');

console.info('scrollbarHover tests passed');
