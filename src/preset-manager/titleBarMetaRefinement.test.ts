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

function cssBlock(content: string, selector: string) {
  const start = content.indexOf(`${selector} {`);
  if (start === -1) {
    throw new Error(`Expected CSS selector to exist: ${selector}`);
  }
  const end = content.indexOf('\n}', start);
  if (end === -1) {
    throw new Error(`Expected CSS selector to close: ${selector}`);
  }
  return content.slice(start, end + 2);
}

const sidebarButtonBlock = cssBlock(titleBar, '.sidebar-toggle-button');
const sidebarButtonHoverBlock = cssBlock(titleBar, '.sidebar-toggle-button:hover');
const sidebarDotBlock = cssBlock(titleBar, '.sidebar-status-dot');
const sidebarDotActiveBlock = cssBlock(titleBar, '.sidebar-status-dot.active');

expectIncludes(app, ':preset-token-total="mainPresetTokenTotal"');
expectIncludes(app, ':native-token-total="nativePromptTokenTotal"');
expectIncludes(app, "querySelector('.completion_prompt_manager_header')");
expectIncludes(app, "querySelector('#result_info_total_tokens')");
expectNotIncludes(app, ':token-estimate="nativePromptTokenTotal"');
expectNotIncludes(app, ':context-token-limit="mainPresetContextLimit"');
expectNotIncludes(app, "mainPresetContextLimit");
expectIncludes(app, 'const nativePromptTokenTotal = ref<number | null>(null);');
expectIncludes(app, 'const mainPresetTokenTotal = ref<number | null>(null);');
expectNotIncludes(app, ':prompt-count="manager.mainPrompts.length"');
expectNotIncludes(app, '/ 3.8');

expectIncludes(titleBar, 'presetTokenTotal: number | null;');
expectIncludes(titleBar, 'nativeTokenTotal: number | null;');
expectNotIncludes(titleBar, 'tokenEstimate: number | null;');
expectNotIncludes(titleBar, 'contextTokenLimit: number;');
expectNotIncludes(titleBar, 'promptCount: number;');
expectNotIncludes(titleBar, '{{ promptCount }} 条');
expectNotIncludes(titleBar, 'class="preset-meta-chip"');
expectNotIncludes(titleBar, '.preset-meta-chip');
expectNotIncludes(titleBar, '约 {{ tokenLabel }} tokens');
expectIncludes(titleBar, 'class="preset-token-ratio"');
expectIncludes(titleBar, '{{ tokenRatioLabel }}');
expectOrdered(titleBar, '</button>', 'class="preset-token-ratio"');
expectOrdered(titleBar, 'class="preset-token-ratio"', '<Transition name="preset-menu-pop">');
expectNotIncludes(titleBar, '<Icon name="chevron-down" :size="13" class="preset-title-arrow" />\n            <span v-if="currentPresetName && tokenRatioLabel" class="preset-token-ratio">{{ tokenRatioLabel }}</span>');
expectIncludes(titleBar, 'function formatTokenAmount(value: number | null | undefined)');
expectIncludes(titleBar, 'const tokenRatioLabel = computed(() =>');
expectIncludes(titleBar, 'formatTokenAmount(props.presetTokenTotal)');
expectIncludes(titleBar, 'formatTokenAmount(props.nativeTokenTotal)');
expectIncludes(titleBar, "new Intl.NumberFormat('en-US')");
expectIncludes(titleBar, "return '--';");
expectNotIncludes(titleBar, '.toFixed(');
expectIncludes(titleBar, 'parentDoc.addEventListener(\'pointerdown\', closePresetMenuFromOutside, true);');
expectIncludes(titleBar, 'parentDoc.removeEventListener(\'pointerdown\', closePresetMenuFromOutside, true);');

expectNotIncludes(titleBar, "import PillButton from './PillButton.vue';");
expectNotIncludes(titleBar, '<PillButton');
expectIncludes(titleBar, 'class="sidebar-toggle-button"');
expectIncludes(titleBar, ':class="{ active: rightSidebarOpen }"');
expectIncludes(titleBar, '.sidebar-toggle-button {');
expectNotIncludes(titleBar, 'variant="primary"');
expectNotIncludes(titleBar, 'pill-btn-primary');
expectIncludes(sidebarButtonBlock, 'height: 28px;');
expectIncludes(sidebarButtonBlock, 'padding: 0 9px;');
expectIncludes(sidebarButtonBlock, 'border: 0;');
expectNotIncludes(sidebarButtonBlock, 'border: 1px');
expectIncludes(sidebarButtonBlock, 'border-radius: 999px;');
expectIncludes(sidebarButtonBlock, 'background: color-mix(in srgb, var(--pm-bg-elevated) 72%, transparent);');
expectIncludes(sidebarButtonBlock, 'color: var(--pm-text);');
expectIncludes(sidebarButtonBlock, 'font-weight: 580;');
expectIncludes(titleBar, '.sidebar-toggle-button:hover {');
expectNotIncludes(sidebarButtonBlock, 'border-color');
expectNotIncludes(sidebarButtonHoverBlock, 'border-color');
expectIncludes(sidebarButtonHoverBlock, 'background: color-mix(in srgb, var(--pm-bg-elevated) 92%, transparent);');
expectNotIncludes(titleBar, '.sidebar-toggle-button:hover,\n.sidebar-toggle-button.active');
expectNotIncludes(titleBar, '.sidebar-toggle-button.active {');
expectIncludes(sidebarDotBlock, 'width: 7px;');
expectIncludes(sidebarDotBlock, 'height: 7px;');
expectIncludes(sidebarDotBlock, 'background: color-mix(in srgb, var(--pm-text-muted) 58%, transparent);');
expectNotIncludes(sidebarDotBlock, 'box-shadow: inset 0 0 0 1px');
expectNotIncludes(sidebarDotBlock, 'box-shadow');
expectIncludes(sidebarDotActiveBlock, 'background: var(--pm-success);');
expectNotIncludes(sidebarDotActiveBlock, 'box-shadow');
expectNotIncludes(sidebarDotActiveBlock, '0 0 10px');

console.info('titleBarMetaRefinement tests passed');
