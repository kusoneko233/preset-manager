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

const workbench = readProjectFile('src/preset-manager/components/WorkbenchPanel.vue');

expectIncludes(workbench, 'class="draft-title-input"');
expectIncludes(workbench, '@click.stop');
expectNotIncludes(workbench, 'class="draft-input"');

expectIncludes(workbench, 'class="draft-role-pill sidebar-entry-pill has-arrow"');
expectIncludes(workbench, 'aria-label="草稿角色"');
expectNotIncludes(workbench, 'class="draft-role-select"');
expectNotIncludes(workbench, 'class="draft-select"');
expectIncludes(workbench, '<div class="draft-meta-row">');
expectIncludes(workbench, '</textarea>\n          <div class="draft-meta-row">');
expectIncludes(workbench, 'class="draft-position-pill sidebar-entry-pill has-arrow"');
expectIncludes(workbench, 'class="draft-title-text"');
expectIncludes(workbench, 'class="draft-rename-action"');
expectIncludes(workbench, 'class="draft-entry-actions"');
expectIncludes(workbench, 'class="draft-delete-action draft-entry-action-danger"');
expectIncludes(workbench, '@click.stop="deleteDraftInline(draft)"');
expectIncludes(workbench, 'function deleteDraftInline(draft: DraftPrompt)');
expectIncludes(workbench, 'function openDraftContextMenu');
expectIncludes(workbench, 'class="draft-context-menu sidebar-entry-context-menu"');
expectNotIncludes(workbench, 'class="draft-chevron"');
expectNotIncludes(workbench, 'class="draft-lock-pill sidebar-entry-pill"');
expectIncludes(workbench, 'class="draft-trigger-summary sidebar-entry-pill"');
expectIncludes(workbench, 'class="draft-trigger-panel"');
expectIncludes(workbench, 'draftTriggerSummary(draft)');

expectIncludes(workbench, 'rows="10"');
expectNotIncludes(workbench, 'rows="14"');
expectIncludes(workbench, 'min-height: 178px;');
expectNotIncludes(workbench, 'min-height: 286px;');
expectIncludes(workbench, '.sidebar-section-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  min-height: 26px;\n  padding: 0 0 3px 12px;');
expectIncludes(workbench, '.sidebar-section-kicker {\n  display: inline-flex;\n  align-items: center;\n  color: var(--pm-text-subtle);');
expectIncludes(workbench, '.draft-list {\n  flex: 1;\n  overflow-y: auto;\n  padding: 2px 0 6px;');
expectIncludes(workbench, '.draft-row {\n  display: flex;\n  align-items: center;\n  gap: 6px;');
expectIncludes(workbench, '.draft-entry-actions {\n  display: inline-flex;\n  align-items: center;\n  gap: 2px;');
expectIncludes(workbench, '.draft-title-input {\n  flex: 1;\n  min-width: 0;\n  height: 22px;');
expectIncludes(workbench, '  color: var(--pm-text);');
expectIncludes(workbench, '.draft-title-input::placeholder {\n  color: var(--pm-text);\n  opacity: 1;');
expectIncludes(workbench, '.draft-body {\n  padding: 3px 4px 9px;');
expectNotIncludes(workbench, '.draft-body {\n  padding: 4px 8px 10px;');
expectNotIncludes(workbench, '.draft-body {\n  padding: 2px 8px 8px 31px;');
expectIncludes(workbench, '.draft-textarea {\n  width: 100%;');
expectIncludes(workbench, '  box-sizing: border-box;\n  min-height: 178px;');
expectIncludes(workbench, '.draft-item:not(.expanded) {\n  background: var(--pm-control-highlight);');
expectIncludes(workbench, '.draft-item.expanded {\n  background: var(--pm-input-bg);\n  box-shadow: none;');
expectIncludes(workbench, '  border: 0;\n  border-radius: 7px;\n  background: var(--pm-left-entry-editor-bg);');
expectNotIncludes(workbench, 'background: color-mix(in srgb, #000 18%, var(--pm-input-bg));');
expectNotIncludes(workbench, '  border: 1px solid var(--pm-border);');
expectNotIncludes(workbench, '.draft-textarea:focus {\n  border-color: var(--pm-border-strong);\n}');
expectIncludes(workbench, '.draft-meta-row {\n  display: flex;');
expectIncludes(workbench, '.draft-trigger-summary {\n  width: 88px;\n  flex: 0 0 88px;');
expectIncludes(workbench, '  width: fit-content;');
expectIncludes(workbench, '  padding: 0 8px;');
expectIncludes(workbench, '.sidebar-entry-pill {\n  flex: 0 0 auto;');
expectIncludes(workbench, '  white-space: nowrap;');
expectNotIncludes(workbench, '.draft-role-pill {\n  position: relative;');
expectNotIncludes(workbench, 'class="draft-body left-entry-body"');
expectNotIncludes(workbench, 'class="draft-textarea left-entry-textarea"');
expectNotIncludes(workbench, 'class="draft-role-pill left-entry-pill"');
expectNotIncludes(workbench, '.draft-item:hover {\n  background: var(--pm-row-hover);');
expectNotIncludes(workbench, 'draft-bulk-insert');
expectNotIncludes(workbench, 'draft-head-actions');

console.info('draftEditorCompactLayout tests passed');
