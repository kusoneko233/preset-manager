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

const panel = readProjectFile('src/preset-manager/components/PresetMigrationPanel.vue');
const roadmap = readProjectFile('docs/roadmap.md');

expectIncludes(panel, 'toggleExpanded(item.key)');
expectIncludes(panel, 'expandedKeys');
expectIncludes(panel, '批量复制到主预设');
expectIncludes(panel, 'selectedDiffItems');
expectIncludes(panel, 'migration-details');
expectIncludes(panel, '内容预览');
expectIncludes(panel, '旧内容');
expectIncludes(panel, '新内容');
expectIncludes(panel, 'conflict-badge');
expectIncludes(panel, 'copySelectionToMain');

expectIncludes(roadmap, '文本差异对比');
expectIncludes(roadmap, '批量复制');
expectIncludes(roadmap, '批量迁移');
expectIncludes(roadmap, '冲突处理界面进一步可视化');

console.info('migrationEnhancement tests passed');
