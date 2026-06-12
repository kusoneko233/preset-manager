<template>
  <section class="migration-panel">
    <header class="migration-head">
      <div class="migration-title-wrap">
        <span class="migration-kicker">对比迁移</span>
        <h3 class="migration-title">从第二预设同步到主预设</h3>
      </div>
      <button class="migration-apply" :disabled="selectedCount === 0 || applying" @click="applySelected">
        应用所选
      </button>
    </header>

    <div v-if="!canCompare" class="migration-empty">
      打开主预设和第二预设后，可以在这里选择要迁移的差异条目。
    </div>

    <template v-else>
      <div class="migration-summary">
        <span>新增 {{ diff.summary.added }}</span>
        <span>删除 {{ diff.summary.removed }}</span>
        <span>内容 {{ diff.summary.contentChanged }}</span>
        <span>状态 {{ diff.summary.enabledChanged }}</span>
        <span>顺序 {{ diff.summary.orderChanged }}</span>
        <span>重复 {{ diff.summary.duplicate }}</span>
        <span>冲突 {{ diff.summary.conflict }}</span>
        <span>锁定 {{ diff.summary.locked }}</span>
      </div>

      <div class="migration-actions">
        <button @click="selectAll">全选可迁移</button>
        <button @click="selectedKeys = []">清空</button>
        <button :disabled="selectedCopyItems.length === 0 || applying" @click="copySelectionToMain">
          批量复制到主预设
        </button>
        <span>{{ selectedCount }} / {{ diff.summary.selectable }}</span>
      </div>

      <div v-if="diff.items.length === 0" class="migration-empty">
        两个预设的条目列表没有可迁移差异。
      </div>

      <div v-else ref="migrationListRef" class="migration-list">
        <label
          v-for="item in diff.items"
          :key="item.key"
          class="migration-row"
          :data-migration-key="item.key"
          :class="{ locked: item.locked, selected: selectedSet.has(item.key), conflict: item.kind === 'conflict' || item.kind === 'duplicate' }"
        >
          <button
            class="migration-bookmark"
            type="button"
            title="定位差异"
            @click.prevent="focusMigrationItem(item)"
          >
            <span />
          </button>
          <input
            type="checkbox"
            :value="item.key"
            v-model="selectedKeys"
            :disabled="!item.selectable"
          />
          <span class="migration-kind">{{ kindLabel(item.kind) }}</span>
          <button class="migration-name" type="button" @click.prevent="toggleExpanded(item.key)">
            <Icon :name="expandedSet.has(item.key) ? 'chevron-down' : 'chevron-right'" :size="12" />
            <span>{{ item.name }}</span>
          </button>
          <span v-if="item.kind === 'conflict' || item.kind === 'duplicate'" class="conflict-badge">
            {{ item.kind === 'duplicate' ? '需要整理重复' : '需要确认冲突' }}
          </span>
          <span v-if="isDiffItemLocked(item)" class="migration-lock">
            <Icon name="lock" :size="12" />
            锁定
          </span>
          <small class="migration-note">
            <span>{{ item.note }}</span>
            <span v-if="item.textDelta" class="text-delta">{{ item.textDelta.preview }}</span>
          </small>
          <div v-if="expandedSet.has(item.key)" class="migration-details">
            <div class="migration-detail-head">
              <span>内容预览</span>
              <code>{{ item.mainIndex >= 0 ? `主 #${item.mainIndex + 1}` : '主 -' }} -> {{ item.secondIndex >= 0 ? `第二 #${item.secondIndex + 1}` : '第二 -' }}</code>
            </div>
            <div class="migration-preview-grid">
              <section>
                <b>旧内容</b>
                <pre class="migration-diff-code old"><span
                  v-for="(line, lineIndex) in getPromptDiffLines(item).oldLines"
                  :key="`old-${item.key}-${lineIndex}`"
                  :class="{ removed: line.kind === 'removed', same: line.kind === 'same' }"
                >{{ formatDiffLine(line) }}</span></pre>
              </section>
              <section>
                <b>新内容</b>
                <pre class="migration-diff-code new"><span
                  v-for="(line, lineIndex) in getPromptDiffLines(item).newLines"
                  :key="`new-${item.key}-${lineIndex}`"
                  :class="{ added: line.kind === 'added', same: line.kind === 'same' }"
                >{{ formatDiffLine(line) }}</span></pre>
              </section>
            </div>
          </div>
        </label>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import Icon from './Icon.vue';
import { getPromptKey, useManagerStore } from '../stores/manager';
import { useHistoryStore } from '../stores/history';
import { useConfirmStore } from '../stores/confirm';
import {
  applyPresetMigrationSelection,
  buildPromptContentDiffLines,
  buildPresetMigrationDiff,
  type PresetMigrationDiffItem,
  type PresetMigrationKind,
  type PromptContentDiffLine,
} from '../utils/presetCompare';

const emit = defineEmits<{
  focusMainPrompt: [payload: { key: string; mainIndex: number; secondIndex: number; mainAnchorIndex: number }];
}>();

const store = useManagerStore();
const history = useHistoryStore();
const confirmDialog = useConfirmStore();
const selectedKeys = ref<string[]>([]);
const applying = ref(false);
const expandedKeys = ref<string[]>([]);
const migrationListRef = ref<HTMLElement | null>(null);

const canCompare = computed(() => Boolean(store.presetName && store.secondPresetName));

const diff = computed(() => buildPresetMigrationDiff({
  mainPrompts: store.mainPrompts,
  secondPrompts: store.secondPrompts,
  isLocked: key => store.isPromptLocked(key, 'main'),
}));

const selectedSet = computed(() => new Set(selectedKeys.value));
const expandedSet = computed(() => new Set(expandedKeys.value));
const selectedCount = computed(() => selectedKeys.value.length);
const selectedDiffItems = computed(() => diff.value.items.filter(item => selectedSet.value.has(item.key) && item.selectable));
const selectedCopyItems = computed(() => selectedDiffItems.value.filter(item => item.newPrompt));

function kindLabel(kind: PresetMigrationKind) {
  if (kind === 'added') return '新增';
  if (kind === 'removed') return '删除';
  if (kind === 'content-changed') return '内容';
  if (kind === 'enabled-changed') return '状态';
  if (kind === 'duplicate') return '重复';
  if (kind === 'conflict') return '冲突';
  return '顺序';
}

function selectAll() {
  selectedKeys.value = diff.value.items.filter(item => item.selectable).map(item => item.key);
}

function toggleExpanded(key: string) {
  expandedKeys.value = expandedSet.value.has(key)
    ? expandedKeys.value.filter(item => item !== key)
    : [...expandedKeys.value, key];
}

function getPromptDiffLines(item: PresetMigrationDiffItem) {
  return buildPromptContentDiffLines(item.oldPrompt, item.newPrompt);
}

function formatDiffLine(line: PromptContentDiffLine) {
  const prefix = line.kind === 'removed' ? '- ' : line.kind === 'added' ? '+ ' : '  ';
  return `${prefix}${line.text}`;
}

function scrollMigrationItemIntoView(key: string) {
  const list = migrationListRef.value;
  if (!list) return;

  const row = Array.from(list.querySelectorAll<HTMLElement>('[data-migration-key]'))
    .find(element => element.dataset.migrationKey === key);
  if (!row) return;

  const top = Math.max(0, row.offsetTop - list.offsetTop - 12);
  list.scrollTo({ top, behavior: 'smooth' });
}

function focusMigrationItem(item: PresetMigrationDiffItem) {
  if (!expandedSet.value.has(item.key)) {
    expandedKeys.value = [...expandedKeys.value, item.key];
  }
  nextTick(() => scrollMigrationItemIntoView(item.key));
  emit('focusMainPrompt', {
    key: item.key,
    mainIndex: item.mainIndex,
    secondIndex: item.secondIndex,
    mainAnchorIndex: item.mainAnchorIndex,
  });
}

function isDiffItemLocked(item: { key: string }) {
  return store.isPromptLocked(item.key, 'main');
}

function snapshotMainPreset(): Preset | null {
  if (!store.presetName) return null;
  return klona(getPreset(store.presetName));
}

async function applySelected() {
  if (!canCompare.value || selectedKeys.value.length === 0 || applying.value) return;
  if (!await confirmDialog.confirm({
    title: '应用对比迁移',
    message: `确认把 ${selectedKeys.value.length} 个迁移项应用到主预设吗？`,
    details: '锁定条目和重复项会自动跳过；冲突项会按你勾选的新版条目覆盖。',
    confirmLabel: '应用',
  })) return;

  const before = snapshotMainPreset();
  if (!before) return;

  applying.value = true;
  try {
    const lockedKeys = store.mainPrompts
      .map(prompt => getPromptKey(prompt))
      .filter(key => store.isPromptLocked(key, 'main'));
    const nextPrompts = applyPresetMigrationSelection({
      mainPrompts: store.mainPrompts,
      secondPrompts: store.secondPrompts,
      selectedKeys: selectedKeys.value,
      lockedKeys,
    }) as PresetPrompt[];

    const ok = await store.applyPromptMigration(nextPrompts, 'main');
    if (!ok) return;

    const after = snapshotMainPreset();
    if (after) {
      history.recordOperation(store.presetName, before, after, `对比迁移: ${selectedKeys.value.length} 个条目`);
    }
    selectedKeys.value = [];
    toastr.success('已应用所选迁移项', '', { timeOut: 1400 });
  } finally {
    applying.value = false;
  }
}

async function copySelectionToMain() {
  if (!canCompare.value || selectedCopyItems.value.length === 0 || applying.value) return;
  if (!await confirmDialog.confirm({
    title: '批量复制到主预设',
    message: `确认把 ${selectedCopyItems.value.length} 个第二预设条目复制到主预设末尾吗？`,
    details: '这不会删除主预设原有条目，适合先保留旧条目再手动整理。',
    confirmLabel: '复制',
  })) return;

  const before = snapshotMainPreset();
  if (!before) return;

  applying.value = true;
  try {
    for (const item of selectedCopyItems.value) {
      if (!item.newPrompt) continue;
      await store.insertPromptToPreset(item.newPrompt as unknown as PresetNormalPrompt, 'main');
    }

    const after = snapshotMainPreset();
    if (after) {
      history.recordOperation(store.presetName, before, after, `批量复制第二预设条目: ${selectedCopyItems.value.length} 个`);
    }
    selectedKeys.value = [];
    toastr.success('已批量复制到主预设', '', { timeOut: 1400 });
  } finally {
    applying.value = false;
  }
}

watch(
  () => diff.value.items.map(item => item.key).join('|'),
  () => {
    const valid = new Set(diff.value.items.filter(item => item.selectable).map(item => item.key));
    selectedKeys.value = selectedKeys.value.filter(key => valid.has(key));
    const existing = new Set(diff.value.items.map(item => item.key));
    expandedKeys.value = expandedKeys.value.filter(key => existing.has(key));
  },
);
</script>

<style scoped>
.migration-panel {
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--pm-text);
  background: transparent;
}
.migration-head {
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px 8px;
}
.migration-title-wrap {
  min-width: 0;
}
.migration-kicker {
  display: block;
  color: var(--pm-text-subtle);
  font-size: 11px;
  font-weight: 650;
  line-height: 1;
}
.migration-title {
  margin: 4px 0 0;
  color: var(--pm-text);
  font-size: 13.5px;
  font-weight: 650;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.migration-apply,
.migration-actions button {
  height: 28px;
  border: 1px solid var(--pm-border);
  border-radius: 999px;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
}
.migration-apply {
  padding: 0 12px;
  color: var(--pm-accent-text);
  background: var(--pm-accent);
  border-color: var(--pm-accent);
}
.migration-apply:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}
.migration-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 14px 8px;
}
.migration-summary span,
.migration-lock {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 20px;
  padding: 0 7px;
  border: 1px solid var(--pm-border);
  border-radius: 999px;
  color: var(--pm-text-subtle);
  font-size: 11px;
  line-height: 1;
}
.migration-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px 8px;
  color: var(--pm-text-subtle);
  font-size: 11.5px;
}
.migration-actions button {
  padding: 0 9px;
}
.migration-actions button:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}
.migration-actions button:hover:not(:disabled) {
  border-color: var(--pm-border-strong);
  background: var(--pm-bg-hover);
  color: var(--pm-text);
}
.migration-list {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 14px 14px;
  overflow-y: auto;
}
.migration-row {
  display: grid;
  grid-template-columns: 14px 18px auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  padding: 9px 10px;
  border: 1px solid var(--pm-row-border);
  border-radius: 10px;
  background: var(--pm-bg-card);
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease;
}
.migration-row:hover {
  border-color: var(--pm-border);
  background: color-mix(in srgb, var(--pm-bg-card) 60%, var(--pm-row-hover));
}
.migration-row.selected {
  border-color: var(--pm-border-strong);
  background: var(--pm-bg-active);
}
.migration-row.conflict {
  border-color: color-mix(in srgb, var(--pm-warning) 28%, var(--pm-row-border));
}
.migration-row.locked {
  opacity: 0.62;
  cursor: not-allowed;
}
.migration-bookmark {
  width: 14px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.migration-bookmark span {
  width: 4px;
  height: 16px;
  border-radius: 999px;
  background: var(--pm-text-faint);
  transition: background 0.12s ease, height 0.12s ease;
}
.migration-bookmark:hover span,
.migration-row.selected .migration-bookmark span {
  height: 18px;
  background: var(--pm-text);
}
.migration-row.conflict .migration-bookmark span {
  background: var(--pm-warning);
}
.migration-row input {
  width: 14px;
  height: 14px;
  accent-color: var(--pm-accent);
}
.migration-kind {
  color: var(--pm-text-subtle);
  font-size: 11px;
  font-weight: 650;
}
.migration-name {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--pm-text);
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
}
.migration-name span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.conflict-badge {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 0 7px;
  border: 1px solid color-mix(in srgb, var(--pm-warning) 36%, var(--pm-border));
  border-radius: 999px;
  color: var(--pm-warning);
  font-size: 11px;
  line-height: 1;
}
.migration-note {
  grid-column: 4 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--pm-text-subtle);
  font-size: 11.5px;
  line-height: 1.35;
}
.text-delta {
  color: var(--pm-text-muted);
}
.migration-details {
  grid-column: 1 / -1;
  display: grid;
  gap: 8px;
  padding: 9px;
  border: 1px solid var(--pm-border);
  border-radius: 9px;
  background: color-mix(in srgb, var(--pm-bg-soft) 74%, transparent);
}
.migration-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--pm-text-muted);
  font-size: 11.5px;
}
.migration-detail-head code {
  color: var(--pm-text-subtle);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 10.5px;
}
.migration-preview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.migration-preview-grid section {
  min-width: 0;
  display: grid;
  gap: 5px;
}
.migration-preview-grid b {
  color: var(--pm-text-muted);
  font-size: 11px;
  font-weight: 650;
}
.migration-preview-grid pre {
  max-height: 160px;
  margin: 0;
  padding: 8px;
  overflow: auto;
  border-radius: 7px;
  background: rgba(0, 0, 0, 0.22);
  color: var(--pm-text-subtle);
  font: 11px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace;
  white-space: pre-wrap;
}
.migration-diff-code {
  display: grid;
  gap: 1px;
}
.migration-diff-code span {
  display: block;
  min-height: 16px;
  padding: 0 4px;
  border-radius: 4px;
}
.migration-diff-code.old span.removed {
  background: color-mix(in srgb, var(--pm-danger) 16%, transparent);
  color: color-mix(in srgb, var(--pm-danger) 72%, var(--pm-text));
}
.migration-diff-code.new span.added {
  background: color-mix(in srgb, var(--pm-success) 16%, transparent);
  color: color-mix(in srgb, var(--pm-success) 74%, var(--pm-text));
}
.migration-diff-code span.same {
  color: color-mix(in srgb, var(--pm-text-subtle) 80%, transparent);
}
.migration-empty {
  margin: 18px 14px;
  padding: 18px 14px;
  border: 1px dashed var(--pm-border);
  border-radius: 12px;
  color: var(--pm-text-subtle);
  font-size: 13px;
  line-height: 1.5;
}
@media (max-width: 720px) {
  .migration-preview-grid {
    grid-template-columns: 1fr;
  }
}
</style>
