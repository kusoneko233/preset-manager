const fs = require('fs');
const path = require('path');

const distIndex = fs.readFileSync(path.join(process.cwd(), 'dist/preset-manager/index.js'), 'utf8');

function expectNotIncludes(content, unexpected) {
  if (content.includes(unexpected)) {
    throw new Error(`Expected dist runtime not to include: ${unexpected}`);
  }
}

expectNotIncludes(distIndex, 'from "https://testingcf.jsdelivr.net/');
expectNotIncludes(distIndex, 'from "https://jspm.dev/');
expectNotIncludes(distIndex, '__WEBPACK_EXTERNAL_MODULE_https_');

console.info('distRuntimeIsolation tests passed');
