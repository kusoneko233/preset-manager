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

const historyPanel = readProjectFile('src/preset-manager/components/HistoryPanel.vue');
const historyStore = readProjectFile('src/preset-manager/stores/history.ts');
const roadmap = readProjectFile('docs/roadmap.md');

expectIncludes(historyPanel, "import {");
expectIncludes(historyPanel, 'filterSnapshots');
expectIncludes(historyPanel, 'buildSnapshotExport');
expectIncludes(historyPanel, 'buildSnapshotRestoreSummary');
expectIncludes(historyPanel, 'getAutoSnapshotCleanupIds');
expectIncludes(historyPanel, 'snapshotSearch');
expectIncludes(historyPanel, 'filteredSnapshots');
expectIncludes(historyPanel, 'exportSnapshot(snap)');
expectIncludes(historyPanel, 'clearAutoSnapshots');
expectIncludes(historyPanel, '搜索快照、预设名或条目内容');
expectIncludes(historyPanel, '当前更改会先写入撤销历史');

expectIncludes(historyStore, 'deleteSnapshots(snapshotIds: string[])');
expectIncludes(historyStore, 'saveSnapshots(this.snapshots)');

expectIncludes(roadmap, '快照搜索');
expectIncludes(roadmap, '快照导出');
expectIncludes(roadmap, '批量清理');
expectIncludes(roadmap, '恢复前增加差异预览');

console.info('historyPanelEnhancement tests passed');
