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

const app = readProjectFile('src/preset-manager/App.vue');
const titleBar = readProjectFile('src/preset-manager/components/TitleBar.vue');

const titleBarStart = app.indexOf('.title-bar {');
const titleBarEnd = app.indexOf('.main-body {', titleBarStart);
const titleBarBlock = app.slice(titleBarStart, titleBarEnd);

const presetMenuStart = titleBar.indexOf('.preset-menu {');
const presetMenuEnd = titleBar.indexOf('.preset-menu-item {', presetMenuStart);
const presetMenuBlock = titleBar.slice(presetMenuStart, presetMenuEnd);

expectIncludes(titleBarBlock, 'z-index: 300;');
expectNotIncludes(titleBarBlock, 'z-index: 30;');
expectIncludes(titleBarBlock, 'overflow: visible;');
expectIncludes(presetMenuBlock, 'z-index: 900;');

console.info('titleBarLayering tests passed');
