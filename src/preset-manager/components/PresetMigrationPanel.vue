<template>
  <section class="migration-panel">
    <div v-if="!canCompare" class="migration-empty">
      打开主预设和第二预设后，可以定位并迁移差异。
    </div>

    <template v-else>
      <div class="migration-toolbar">
        <div class="migration-controls">
          <button type="button" :disabled="filteredItems.length === 0" @click="jumpBy(-1)">上一个</button>
          <button type="button" :disabled="filteredItems.length === 0" @click="jumpBy(1)">下一个</button>
          <button
            class="migration-multi-toggle"
            :class="{ on: multiSelectEnabled }"
            type="button"
            :aria-pressed="multiSelectEnabled"
            title="开启后点击下方差异条可多选"
            @click="toggleMultiSelect"
          >
            <span>多选</span>
            <span class="migration-status-dot" aria-hidden="true" />
          </button>
          <button
            ref="applyButtonRef"
            class="migration-apply-trigger"
            type="button"
            :disabled="selectedCount === 0 || applying"
            title="迁移已选中的差异项"
            @click="applySelected"
          >
            {{ selectedCount > 0 ? `迁移 ${selectedCount} 项` : '迁移选中' }}
          </button>
        </div>
      </div>

      <div class="migration-type-filter" role="group" aria-label="迁移差异类型">
        <button
          v-for="filter in typeFilters"
          :key="filter.value"
          type="button"
          :class="[{ active: activeFilter === filter.value }, filterToneClass(filter.value)]"
          :title="filter.description"
          :aria-label="`${filter.label}：${filter.description}`"
          @click="setActiveFilter(filter.value)"
        >
          <span class="filter-tone" />
          <span>{{ filter.label }}</span>
          <small>{{ filterCount(filter.value) }}</small>
        </button>
      </div>

      <div v-if="diff.items.length === 0" class="migration-empty">
        两个预设没有可迁移差异。
      </div>

      <div v-else class="migration-marker-rail">
        <button
          class="migration-marker-select"
          :class="{ active: allFilteredSelected }"
          type="button"
          :disabled="filteredSelectableItems.length === 0"
          title="全选当前筛选的可迁移项"
          @click="toggleSelectFiltered"
        >
          全选
        </button>
        <div
          ref="migrationListRef"
          class="migration-scroll-map"
          :style="{ '--migration-marker-count': String(Math.max(1, filteredItems.length)) }"
          aria-label="差异跳转标记"
        >
          <button
            v-for="(item, index) in filteredItems"
            :key="item.key"
            class="migration-scroll-marker"
            :data-migration-key="item.key"
            :class="[`tone-${getMigrationVisualTone(item.kind)}`, { active: activeItem?.key === item.key, locked: isDiffItemLocked(item), selected: selectedSet.has(item.key) }]"
            :style="{ '--migration-marker-index': String(index) }"
            type="button"
            :title="getMigrationMarkerTitle(item)"
            :aria-pressed="selectedSet.has(item.key)"
            @click="multiSelectEnabled ? toggleSelectItem(item) : jumpToMigrationItem(item)"
          >
            <span class="marker-dot" />
            <span class="marker-label">{{ item.label }}</span>
          </button>
        </div>
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
  getMigrationVisualTone,
  type PresetMigrationDiffItem,
  type PresetMigrationVisualTone,
} from '../utils/presetCompare';

const emit = defineEmits<{
  focusMainPrompt: [payload: { key: string; mainIndex: number; secondIndex: number; mainAnchorIndex: number }];
  focusSecondPrompt: [payload: { key: string; mainIndex: number; secondIndex: number; mainAnchorIndex: number }];
}>();

type MigrationFilter = Exclude<PresetMigrationVisualTone, 'order'> | 'all';

const store = useManagerStore();
const history = useHistoryStore();
const confirmDialog = useConfirmStore();
const applying = ref(false);
const multiSelectEnabled = ref(false);
const selectedKeys = ref<string[]>([]);
const activeFilter = ref<MigrationFilter>('all');
const activeItemKey = ref('');
const migrationListRef = ref<HTMLElement | null>(null);
const applyButtonRef = ref<HTMLElement | null>(null);

const typeFilters: Array<{ value: MigrationFilter; label: string; description: string }> = [
  { value: 'all', label: '全部', description: '主预设和右侧预设的所有差异' },
  { value: 'added', label: '新增', description: '右侧有、主预设没有；迁移后会加入主预设' },
  { value: 'removed', label: '右侧无', description: '主预设有、右侧没有；迁移后会从主预设移除' },
  { value: 'content', label: '内容', description: '同一条提示词内容不同；迁移后按右侧覆盖' },
  { value: 'enabled', label: '状态', description: '启用或禁用状态不同；迁移后按右侧覆盖' },
  { value: 'mixed', label: '混合', description: '同一条同时有内容、状态等多种差异' },
];

const canCompare = computed(() => Boolean(store.presetName && store.secondPresetName));
const diff = computed(() => buildPresetMigrationDiff({
  mainPrompts: store.mainPrompts,
  secondPrompts: store.secondPrompts,
  isLocked: key => store.isPromptLocked(key, 'main'),
}));

const selectableItems = computed(() => diff.value.items.filter(item => item.selectable));
const selectedSet = computed(() => new Set(selectedKeys.value));
const selectedCount = computed(() => selectedKeys.value.length);
const filteredItems = computed(() => diff.value.items.filter(item =>
  activeFilter.value === 'all' || getMigrationVisualTone(item.kind) === activeFilter.value,
));
const filteredSelectableItems = computed(() => filteredItems.value.filter(item => item.selectable));
const allFilteredSelected = computed(() => (
  filteredSelectableItems.value.length > 0 &&
  filteredSelectableItems.value.every(item => selectedSet.value.has(item.key))
));
const activeItem = computed(() => {
  const fromKey = filteredItems.value.find(item => item.key === activeItemKey.value);
  return fromKey ?? filteredItems.value[0] ?? null;
});
const activeItemIndex = computed(() => activeItem.value ? filteredItems.value.findIndex(item => item.key === activeItem.value?.key) : -1);

function filterCount(filter: MigrationFilter) {
  if (filter === 'all') return diff.value.items.length;
  return diff.value.items.filter(item => getMigrationVisualTone(item.kind) === filter).length;
}

function setActiveFilter(filter: MigrationFilter) {
  activeFilter.value = filter;
  activeItemKey.value = filteredItems.value[0]?.key ?? '';
  if (activeItem.value) jumpToMigrationItem(activeItem.value);
}

function filterToneClass(filter: MigrationFilter) {
  return filter === 'all' ? 'filter-all' : `filter-${filter}`;
}

function toggleMultiSelect() {
  multiSelectEnabled.value = !multiSelectEnabled.value;
  if (!multiSelectEnabled.value) selectedKeys.value = [];
}

function toggleSelectItem(item: PresetMigrationDiffItem) {
  if (!item.selectable) return;
  multiSelectEnabled.value = true;
  selectedKeys.value = selectedSet.value.has(item.key)
    ? selectedKeys.value.filter(key => key !== item.key)
    : [...selectedKeys.value, item.key];
}

function toggleSelectFiltered() {
  const keys = filteredSelectableItems.value.map(item => item.key);
  if (!keys.length) return;
  multiSelectEnabled.value = true;

  const filteredKeySet = new Set(keys);
  selectedKeys.value = allFilteredSelected.value
    ? selectedKeys.value.filter(key => !filteredKeySet.has(key))
    : Array.from(new Set([...selectedKeys.value, ...keys]));
}

function scrollMigrationItemIntoView(key: string) {
  const list = migrationListRef.value;
  if (!list) return;

  const marker = Array.from(list.querySelectorAll<HTMLElement>('.migration-scroll-marker'))
    .find(element => element.dataset.migrationKey === key);
  marker?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
}

function getMigrationMarkerTitle(item: PresetMigrationDiffItem) {
  const titlePrefix = item.label ? `${item.label} · ` : '';
  if (item.kind !== 'content-changed' && item.kind !== 'conflict') {
    return `${titlePrefix}${item.name}`;
  }
  const lines = buildPromptContentDiffLines(item.oldPrompt, item.newPrompt);
  const removed = lines.oldLines.filter(line => line.kind === 'removed').length;
  const added = lines.newLines.filter(line => line.kind === 'added').length;
  return `${titlePrefix}${item.name} · -${removed} +${added}`;
}

function jumpToMigrationItem(item: PresetMigrationDiffItem) {
  activeItemKey.value = item.key;
  scrollMigrationItemIntoView(item.key);
  emit('focusMainPrompt', {
    key: item.key,
    mainIndex: item.mainIndex,
    secondIndex: item.secondIndex,
    mainAnchorIndex: item.mainAnchorIndex,
  });
  emit('focusSecondPrompt', {
    key: item.key,
    mainIndex: item.mainIndex,
    secondIndex: item.secondIndex,
    mainAnchorIndex: item.mainAnchorIndex,
  });
}

function jumpBy(offset: number) {
  if (!filteredItems.value.length) return;
  const current = Math.max(0, activeItemIndex.value);
  const next = (current + offset + filteredItems.value.length) % filteredItems.value.length;
  jumpToMigrationItem(filteredItems.value[next]);
}

function isDiffItemLocked(item: { key: string }) {
  return store.isPromptLocked(item.key, 'main');
}

function snapshotMainPreset(): Preset | null {
  if (!store.presetName) return null;
  return klona(getPreset(store.presetName));
}

function getConfirmAnchor() {
  const rect = applyButtonRef.value?.getBoundingClientRect();
  if (!rect) return undefined;
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
}

async function applySelected() {
  const items = selectableItems.value.filter(item => selectedSet.value.has(item.key));
  const keysToApply = items.map(item => item.key);
  if (!canCompare.value || keysToApply.length === 0 || applying.value) return;
  if (!await confirmDialog.confirm({
    title: '迁移选中项',
    message: `确认迁移 ${keysToApply.length} 个选中项到主预设吗？`,
    details: '锁定条目和标识冲突项会自动跳过；右侧无会移除，内容/状态/混合会按右侧覆盖。',
    confirmLabel: '迁移',
    anchor: getConfirmAnchor(),
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
      selectedKeys: keysToApply,
      lockedKeys,
    }) as PresetPrompt[];

    const ok = await store.applyPromptMigration(nextPrompts, 'main');
    if (!ok) return;

    const after = snapshotMainPreset();
    if (after) {
      history.recordOperation(store.presetName, before, after, `对比迁移: ${keysToApply.length} 个条目`);
    }
    selectedKeys.value = [];
    multiSelectEnabled.value = false;
    toastr.success('已应用所选迁移项', '', { timeOut: 1400 });
  } finally {
    applying.value = false;
  }
}

watch(
  () => diff.value.items.map(item => item.key).join('|'),
  () => {
    if (!diff.value.items.some(item => item.key === activeItemKey.value)) {
      activeItemKey.value = filteredItems.value[0]?.key ?? '';
    }
    const selectableKeySet = new Set(selectableItems.value.map(item => item.key));
    selectedKeys.value = selectedKeys.value.filter(key => selectableKeySet.has(key));
  },
);
</script>

<style scoped>
.migration-panel {
  flex: 0 0 auto;
  display: grid;
  gap: 8px;
  padding: 0 var(--pm-right-aux-gutter) 8px;
  color: var(--pm-text);
  background: transparent;
}
.migration-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-width: 0;
}
.migration-controls,
.migration-type-filter {
  display: flex;
  align-items: center;
  gap: 5px;
}
.migration-controls {
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.migration-controls button {
  min-height: 24px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
  font-size: 11.5px;
  font-weight: 560;
}
.migration-controls button {
  padding: 0 8px;
}
.migration-multi-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, #000 44%, var(--pm-bg-elevated));
  color: var(--pm-text-muted);
}
.migration-apply-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, #000 44%, var(--pm-bg-elevated));
  color: var(--pm-text-muted);
}
.migration-multi-toggle.on {
  color: var(--pm-text);
  background: color-mix(in srgb, #000 32%, var(--pm-bg-elevated));
}
.migration-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--pm-text-subtle) 60%, transparent);
}
.migration-multi-toggle.on .migration-status-dot {
  background: #56d17f;
  box-shadow: 0 0 8px color-mix(in srgb, #56d17f 58%, transparent);
}
.migration-multi-toggle:not(.on) .migration-status-dot {
  background: color-mix(in srgb, var(--pm-text-subtle) 58%, transparent);
}
.migration-controls button:hover:not(:disabled),
.migration-type-filter button:hover {
  background: var(--pm-pill-bg-hover);
  color: var(--pm-text);
}
.migration-controls button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
.migration-type-filter {
  min-width: 0;
  overflow-x: auto;
  padding-bottom: 1px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.migration-type-filter::-webkit-scrollbar {
  display: none;
}
.migration-type-filter button {
  position: relative;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 24px;
  padding: 1px 8px 1px 7px;
  border: 0;
  border-radius: 999px;
  outline: 0;
  background: color-mix(in srgb, #000 48%, var(--pm-bg-elevated));
  color: var(--pm-text-muted);
  cursor: pointer;
  font-size: 11.5px;
  font-weight: 560;
  box-shadow: none;
  transition: background 0.12s ease, color 0.12s ease;
}
.migration-type-filter button.active {
  background: color-mix(in srgb, #000 36%, var(--pm-bg-elevated));
  color: var(--pm-text);
  box-shadow: none;
}
.migration-type-filter button::before,
.filter-tone {
  content: "";
  width: 3px;
  height: 14px;
  border-radius: 999px;
  background: var(--filter-tone, var(--pm-text-muted));
}
.filter-tone {
  flex: 0 0 auto;
}
.migration-type-filter button::before {
  display: none;
}
.migration-type-filter button.filter-all {
  --filter-tone: color-mix(in srgb, var(--pm-text-muted) 72%, transparent);
}
.migration-type-filter button.filter-added {
  --filter-tone: #56d17f;
}
.migration-type-filter button.filter-removed {
  --filter-tone: #ff6f6f;
}
.migration-type-filter button.filter-content {
  --filter-tone: #62a8ff;
}
.migration-type-filter button.filter-enabled {
  --filter-tone: #b18cff;
}
.migration-type-filter button.filter-mixed {
  --filter-tone: #ffd447;
}
.migration-type-filter small {
  color: var(--pm-text-subtle);
  font-size: 10.5px;
}
.migration-marker-rail {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: stretch;
  gap: 5px;
  min-width: 0;
}
.migration-marker-select {
  min-height: 24px;
  padding: 0 8px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, #000 46%, var(--pm-bg-elevated));
  color: var(--pm-text-muted);
  cursor: pointer;
  font-size: 11.5px;
  font-weight: 620;
}
.migration-marker-select:hover:not(:disabled),
.migration-marker-select.active {
  background: color-mix(in srgb, #000 32%, var(--pm-bg-elevated));
  color: var(--pm-text);
}
.migration-marker-select:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}
.migration-scroll-map {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--migration-marker-count), minmax(3px, 1fr));
  gap: 3px;
  min-height: 24px;
  overflow: hidden;
  padding: 4px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--pm-bg-elevated) 42%, transparent);
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.migration-scroll-map::-webkit-scrollbar {
  display: none;
}
.migration-scroll-marker {
  position: relative;
  min-width: 0;
  min-height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 5px;
  padding: 0;
  background: color-mix(in srgb, var(--migration-tone, var(--pm-text-muted)) 23%, transparent);
  cursor: pointer;
}
.migration-scroll-marker:hover,
.migration-scroll-marker.active {
  background: color-mix(in srgb, var(--migration-tone, var(--pm-text-muted)) 42%, transparent);
}
.migration-scroll-marker.active {
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--migration-tone, var(--pm-text-muted)) 60%, transparent);
}
.migration-scroll-marker.selected {
  background: color-mix(in srgb, var(--migration-tone, var(--pm-text-muted)) 50%, transparent);
}
.migration-scroll-marker.locked {
  opacity: 0.42;
}
.marker-dot {
  width: 3px;
  height: 14px;
  border-radius: 999px;
  background: var(--migration-tone, var(--pm-text-muted));
}
.marker-label {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.migration-scroll-marker.tone-added {
  --migration-tone: #56d17f;
}
.migration-scroll-marker.tone-removed {
  --migration-tone: #ff6f6f;
}
.migration-scroll-marker.tone-content {
  --migration-tone: #62a8ff;
}
.migration-scroll-marker.tone-enabled {
  --migration-tone: #b18cff;
}
.migration-scroll-marker.tone-mixed {
  --migration-tone: #ffd447;
}
.migration-scroll-marker.tone-duplicate {
  --migration-tone: #8c8f96;
}
.migration-empty {
  padding: 9px 10px;
  border: 1px dashed var(--pm-border);
  border-radius: 8px;
  color: var(--pm-text-subtle);
  font-size: 12px;
  line-height: 1.4;
}
</style>
