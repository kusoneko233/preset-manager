import {
  getInspectorSourceCodeBlock,
  highlightInspectorCodeLabel,
  normalizeInspectorSourcePath,
  parseInspectorSource,
} from './codeInspectorSource';

function expectEqual<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function expectDeepEqual(actual: unknown, expected: unknown) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    throw new Error(`Expected ${expectedText}, got ${actualText}`);
  }
}

function expectIncludes(actual: string, expected: string) {
  if (!actual.includes(expected)) {
    throw new Error(`Expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}

function expectNotIncludes(actual: string, unexpected: string) {
  if (actual.includes(unexpected)) {
    throw new Error(`Expected ${JSON.stringify(actual)} not to include ${JSON.stringify(unexpected)}`);
  }
}

expectDeepEqual(parseInspectorSource('D:/tavern_helper_template-main/src/preset-manager/App.vue:52:9:div'), {
  path: 'D:/tavern_helper_template-main/src/preset-manager/App.vue',
  line: 52,
  column: 9,
  node: 'div',
});

expectDeepEqual(parseInspectorSource('D:/tavern_helper_template-main/src/preset-manager/index.ts:115:15'), {
  path: 'D:/tavern_helper_template-main/src/preset-manager/index.ts',
  line: 115,
  column: 15,
});

expectDeepEqual(parseInspectorSource('src/preset-manager/App.vue?line=12&column=5'), {
  path: 'src/preset-manager/App.vue',
  line: 12,
  column: 5,
});

expectEqual(
  normalizeInspectorSourcePath('D:\\tavern_helper_template-main\\src\\preset-manager\\App.vue'),
  'src/preset-manager/App.vue',
);

expectEqual(
  getInspectorSourceCodeBlock(
    {
      'src/preset-manager/App.vue': [
        '<template>',
        '  <div class="app-root">',
        '    <TitleBar />',
        '  </div>',
      ],
    },
    { path: 'D:/tavern_helper_template-main/src/preset-manager/App.vue', line: 2, column: 3 },
    2,
  ),
  '  <div class="app-root">\n    <TitleBar />\n  </div>',
);

expectEqual(
  getInspectorSourceCodeBlock(
    {
      'src/preset-manager/App.vue': [
        '<template>',
        '  <div class="app-root">',
        '    <TitleBar />',
        '    <main class="preset-workspace">',
        '      <PresetPanel />',
        '    </main>',
        '  </div>',
      ],
    },
    { path: 'D:/tavern_helper_template-main/src/preset-manager/App.vue', line: 4, column: 11 },
    { before: 1, after: 2, includeLineNumbers: true },
  ),
  '  3 |     <TitleBar />\n> 4 |     <main class="preset-workspace">\n  5 |       <PresetPanel />\n  6 |     </main>',
);

const highlightedLabel = highlightInspectorCodeLabel(
  '> 12 | <div class="prompt-row" @click="selectPrompt(prompt)">\n'
  + '  13 |   {{ prompt.name }}\n\n'
  + 'src/preset-manager/App.vue:12:3',
);
expectIncludes(highlightedLabel, 'pm-inspector-line-number');
expectIncludes(highlightedLabel, 'pm-inspector-token-tag');
expectIncludes(highlightedLabel, '&lt;');
expectIncludes(highlightedLabel, '>div</span>');
expectIncludes(highlightedLabel, 'pm-inspector-token-attr');
expectIncludes(highlightedLabel, '@click');
expectIncludes(highlightedLabel, 'pm-inspector-token-string');
expectIncludes(highlightedLabel, '&quot;prompt-row&quot;');
expectIncludes(highlightedLabel, 'pm-inspector-token-expression');
expectIncludes(highlightedLabel, '{{ prompt.name }}');
expectIncludes(highlightedLabel, 'pm-inspector-source-path');
expectNotIncludes(highlightInspectorCodeLabel('<script>alert("x")</script>'), '<script>');

console.info('codeInspectorSource tests passed');
