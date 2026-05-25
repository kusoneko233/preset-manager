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

const index = readProjectFile('src/preset-manager/index.ts');

expectIncludes(index, 'const FLOATING_BUTTON_Z_INDEX = 2147483001;');
expectIncludes(index, 'const PANEL_Z_INDEX = 2147483000;');
expectIncludes(index, 'zIndex: FLOATING_BUTTON_Z_INDEX,');
expectIncludes(index, 'zIndex: PANEL_Z_INDEX,');

console.info('floatingButtonLayer tests passed');
