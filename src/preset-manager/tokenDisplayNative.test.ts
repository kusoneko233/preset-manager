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

function expectOrdered(content: string, before: string, after: string) {
  const beforeIndex = content.indexOf(before);
  const afterIndex = content.indexOf(after);
  if (beforeIndex < 0 || afterIndex < 0 || beforeIndex >= afterIndex) {
    throw new Error(`Expected ${before} to appear before ${after}`);
  }
}

const app = readProjectFile('src/preset-manager/App.vue');
const titleBar = readProjectFile('src/preset-manager/components/TitleBar.vue');

expectIncludes(app, 'nativePromptTokenTotal');
expectIncludes(app, 'mainPresetTokenTotal');
expectIncludes(app, "readNativePromptTokenTotal()");
expectIncludes(app, "querySelector('.completion_prompt_manager_header')");
expectIncludes(app, 'readPromptManagerHeaderTokenTotal');
expectIncludes(app, 'readPromptManagerRowTokenTotal');
expectIncludes(app, "querySelector('#result_info_total_tokens')");
expectOrdered(app, "querySelector('.completion_prompt_manager_header')", "querySelector('#result_info_total_tokens')");
expectIncludes(app, 'readMainPresetTokenTotal');
expectIncludes(app, "MutationObserver");
expectIncludes(app, ":preset-token-total=\"mainPresetTokenTotal\"");
expectIncludes(app, ":native-token-total=\"nativePromptTokenTotal\"");
expectNotIncludes(app, ":token-estimate=\"nativePromptTokenTotal\"");
expectNotIncludes(app, ":context-token-limit=\"mainPresetContextLimit\"");
expectNotIncludes(app, "mainPresetContextLimit");
expectNotIncludes(app, "/ 3.8");
expectNotIncludes(app, "totalChars");

expectIncludes(titleBar, "presetTokenTotal: number | null;");
expectIncludes(titleBar, "nativeTokenTotal: number | null;");
expectIncludes(titleBar, "new Intl.NumberFormat");
expectIncludes(titleBar, "formatTokenAmount(props.presetTokenTotal)");
expectIncludes(titleBar, "formatTokenAmount(props.nativeTokenTotal)");
expectOrdered(titleBar, "formatTokenAmount(props.presetTokenTotal)", "formatTokenAmount(props.nativeTokenTotal)");
expectIncludes(titleBar, "return '--';");
expectIncludes(titleBar, "return `${preset} / ${total} tokens`;");
expectNotIncludes(titleBar, "tokenEstimate: number | null;");
expectNotIncludes(titleBar, "contextTokenLimit: number;");
expectNotIncludes(titleBar, ".toFixed(");
expectNotIncludes(titleBar, "`k`");

console.info('tokenDisplayNative tests passed');
