<template>
  <div
    class="preset-panel flex flex-col h-full"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div class="panel-header">
      <div class="preset-path">
        <span class="panel-kicker">{{ panelId === 'main' ? '当前预设' : '第二预设' }}</span>
        <div class="preset-select-wrap">
          <select v-model="selectedPreset" class="preset-select" @change="onPresetChange">
            <option value="" disabled>选择预设...</option>
            <option v-for="name in presetNames" :key="name" :value="name">{{ name }}</option>
          </select>
          <i class="fas fa-chevron-down text-xs" />
        </div>
      </div>
      <span class="prompt-count">{{ prompts.length }} 条</span>
    </div>

    <div
      :key="promptListKey"
      class="prompt-list flex-1 overflow-y-auto"
      :class="{ 'drop-target': isDropTarget, sorting: isSortingDrop }"
      @dragover.prevent="onListDragOver"
    >
      <div v-if="!prompts.length" class="empty-state">
        <i class="fas fa-inbox text-2xl text-slate-600 mb-2" />
        <div class="text-slate-500 text-xs">{{ selectedPreset ? '预设为空' : '请选择预设' }}</div>
      </div>

      <div
        v-for="(prompt, i) in prompts"
        :key="prompt.id"
        class="prompt-drop-slot"
        :class="{ 'drop-before': dropIndex === i }"
        @dragover.prevent.stop="onPromptDragOver($event, i)"
        @drop.prevent.stop="onPromptDrop($event, i)"
      >
        <PromptItem
          :prompt="prompt"
          :is-favorited="isFavorited(prompt)"
          :drag-type="'preset-prompt'"
          :drag-source="panelId"
          :drag-index="i"
          :relation-label="relationLabel(prompt)"
          :can-transfer="canTransferToOther"
          :transfer-target-label="otherPanelLabel"
          @zoom="zoomPrompt = prompt"
          @edit="openEditor(prompt)"
          @toggle-enabled="togglePromptEnabled(prompt)"
          @toggle-favorite="$emit('favorite', prompt)"
          @copy-to-other="copyPromptToOther(prompt)"
          @move-to-other="movePromptToOther(prompt)"
          @delete="deletePrompt(prompt)"
        />
      </div>

      <div
        v-if="prompts.length"
        class="prompt-drop-tail"
        :class="{ 'drop-before': dropIndex === prompts.length }"
        @dragover.prevent.stop="onPromptDragOver($event, prompts.length)"
        @drop.prevent.stop="onPromptDrop($event, prompts.length)"
      />
    </div>

    <PromptDetailOverlay
      :visible="!!zoomPrompt"
      :prompt="zoomPrompt ?? emptyPrompt"
      :is-favorited="zoomPrompt ? isFavorited(zoomPrompt) : false"
      :show-actions="!!zoomPrompt && !isPresetPlaceholderPrompt(zoomPrompt)"
      @close="zoomPrompt = null"
      @edit="zoomPrompt && openEditor(zoomPrompt); zoomPrompt = null"
      @toggle-favorite="zoomPrompt && $emit('favorite', zoomPrompt)"
    />

    <PromptEditDialog
      :visible="!!editingPrompt"
      :prompt="editingPrompt ?? emptyPrompt"
      @close="editingPrompt = null"
      @save="savePromptEdits"
    />
  </div>
</template>

<script setup lang="ts">
import PromptItem from './PromptItem.vue';
import PromptDetailOverlay from './PromptDetailOverlay.vue';
import PromptEditDialog from './PromptEditDialog.vue';
import { useManagerStore } from '../stores/manager';
import { useHistoryStore } from '../stores/history';
import { getPromptRelation, getPromptRelationLabel, type PromptRelation } from '../utils/promptRelations';

const props = defineProps<{
  panelId: 'main' | 'second';
  favoritedIds?: Set<string>;
}>();

const emit = defineEmits<{
  favorite: [prompt: PresetPrompt];
}>();

const store = useManagerStore();
const history = useHistoryStore();

const selectedPreset = ref('');
const zoomPrompt = ref<PresetPrompt | null>(null);
const editingPrompt = ref<PresetPrompt | null>(null);
const isDropTarget = ref(false);
const dropIndex = ref<number | null>(null);
const isSortingDrop = ref(false);

const emptyPrompt: PresetPrompt = { id: '', name: '', enabled: false, role: 'system' };

const presetNames = computed(() => store.presetNames);
const prompts = ref<PresetPrompt[]>([]);
const promptListKey = computed(() => `${props.panelId}:${selectedPreset.value}:${prompts.value.length}:${prompts.value.map(p => `${p.id}:${p.enabled}`).join('|')}`);

function syncPromptsFromStore() {
  prompts.value = props.panelId === 'main' ? [...store.mainPrompts] : [...store.secondPrompts];
}

function currentPresetName() {
  return props.panelId === 'main' ? store.presetName : store.secondPresetName;
}

function otherPanelId(): 'main' | 'second' {
  return props.panelId === 'main' ? 'second' : 'main';
}

function otherPresetName() {
  return props.panelId === 'main' ? store.secondPresetName : store.presetName;
}

const otherPrompts = computed(() => props.panelId === 'main' ? store.secondPrompts : store.mainPrompts);
const canTransferToOther = computed(() => !!currentPresetName() && !!otherPresetName());
const otherPanelLabel = computed(() => props.panelId === 'main' ? '第二预设' : '主预设');

function relationOf(prompt: PresetPrompt): PromptRelation {
  return getPromptRelation(prompt, otherPrompts.value);
}

function relationLabel(prompt: PresetPrompt) {
  return getPromptRelationLabel(relationOf(prompt));
}

function isFavorited(prompt: PresetPrompt): boolean {
  return props.favoritedIds?.has(prompt.id) ?? false;
}

function openEditor(prompt: PresetPrompt) {
  if (isPresetPlaceholderPrompt(prompt)) return;
  editingPrompt.value = prompt;
}

function onPresetChange() {
  if (!selectedPreset.value) return;
  const loaded = props.panelId === 'main'
    ? store.loadMainPreset(selectedPreset.value)
    : store.loadSecondPreset(selectedPreset.value);

  if (loaded) {
    syncPromptsFromStore();
    history.createSnapshot(selectedPreset.value, undefined, true);
  }
}

function onDragOver(e: DragEvent) {
  const data = getDragData(e);
  const sorting = isSamePanelPresetDrag(data);
  e.dataTransfer!.dropEffect = sorting ? 'move' : 'copy';
  isDropTarget.value = true;
  isSortingDrop.value = sorting;
}

function onDragLeave(e: DragEvent) {
  const current = e.currentTarget;
  const next = e.relatedTarget;
  if (current instanceof Node && next instanceof Node && current.contains(next)) return;
  resetDropState();
}

function onListDragOver(e: DragEvent) {
  onDragOver(e);
  if (e.target === e.currentTarget) {
    dropIndex.value = prompts.value.length;
  }
}

function snapshotPreset(presetName: string) {
  return klona(getPreset(presetName));
}

async function recordPresetChange(description: string, operation: () => Promise<boolean | void>) {
  const presetName = currentPresetName();
  if (!presetName) return false;

  const before = snapshotPreset(presetName);
  const result = await operation();
  if (result === false) return false;

  const after = snapshotPreset(presetName);
  history.recordOperation(presetName, before, after, description);
  syncPromptsFromStore();
  return true;
}

async function recordTargetPresetChange(targetPanel: 'main' | 'second', description: string, operation: () => Promise<boolean | void>) {
  const presetName = targetPanel === 'main' ? store.presetName : store.secondPresetName;
  if (!presetName) return false;

  const before = snapshotPreset(presetName);
  const result = await operation();
  if (result === false) return false;

  const after = snapshotPreset(presetName);
  history.recordOperation(presetName, before, after, description);
  syncPromptsFromStore();
  return true;
}

function normalizePrompt(prompt: PresetPrompt): PresetNormalPrompt {
  return {
    id: prompt.id,
    name: prompt.name,
    enabled: prompt.enabled ?? true,
    position: (prompt as any).position ?? { type: 'relative' as const },
    role: prompt.role,
    content: (prompt as any).content ?? '',
  };
}

function getDragData(e: DragEvent) {
  const raw = e.dataTransfer?.getData('application/json');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as {
      type?: string;
      source?: string;
      index?: number;
      prompt?: PresetPrompt;
    };
  } catch {
    return null;
  }
}

function isSamePanelPresetDrag(data: { type?: string; source?: string; index?: number } | null) {
  return data?.type === 'preset-prompt'
    && data.source === props.panelId
    && typeof data.index === 'number';
}

function resetDropState() {
  isDropTarget.value = false;
  dropIndex.value = null;
  isSortingDrop.value = false;
}

function confirmRelation(prompt: PresetPrompt, actionLabel: string) {
  const relation = relationOf(prompt);
  if (relation === 'none') return true;

  const label = getPromptRelationLabel(relation);
  return confirm(`${otherPanelLabel.value}中已有${label}条目 "${prompt.name}"，仍要${actionLabel}吗？`);
}

function resolveDropIndex(e: DragEvent, index: number) {
  const target = e.currentTarget;
  if (!(target instanceof HTMLElement) || index >= prompts.value.length) return index;

  const rect = target.getBoundingClientRect();
  const isAfter = e.clientY > rect.top + rect.height / 2;
  return isAfter ? index + 1 : index;
}

function onPromptDragOver(e: DragEvent, index: number) {
  onDragOver(e);
  dropIndex.value = resolveDropIndex(e, index);
}

async function onPromptDrop(e: DragEvent, index: number) {
  await handleDrop(e, resolveDropIndex(e, index));
}

async function onDrop(e: DragEvent) {
  await handleDrop(e, prompts.value.length);
}

async function handleDrop(e: DragEvent, index: number) {
  resetDropState();
  const raw = e.dataTransfer?.getData('application/json');
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    const prompt = data.prompt as PresetPrompt;
    if (!prompt || !prompt.name) return;

    if (isPresetPlaceholderPrompt(prompt)) return;

    if (isSamePanelPresetDrag(data)) {
      const moved = await recordPresetChange(`调整顺序: ${prompt.name}`, async () => {
        return store.reorderPromptInPreset(props.panelId, data.index, index);
      });

      if (moved) toastr.success(`已调整 "${prompt.name}" 的顺序`, '', { timeOut: 1400 });
      return;
    }

    await recordPresetChange(`插入条目: ${prompt.name}`, async () => {
      await store.insertPromptToPreset(normalizePrompt(prompt), props.panelId, index);
    });

    toastr.success(`已插入 "${prompt.name}"`, '操作成功', { timeOut: 2000 });
  } catch (err) {
    console.error('[PresetPanel] Drop error:', err);
  }
}

async function togglePromptEnabled(prompt: PresetPrompt) {
  if (isPresetPlaceholderPrompt(prompt)) return;
  const nextEnabled = !(prompt.enabled ?? true);
  const ok = await recordPresetChange(`${nextEnabled ? '启用' : '禁用'}条目: ${prompt.name}`, async () => {
    await store.updatePromptInPreset(prompt.id, { enabled: nextEnabled }, props.panelId);
  });
  if (ok) toastr.info(nextEnabled ? '条目已启用' : '条目已禁用', '', { timeOut: 1200 });
}

async function copyPromptToOther(prompt: PresetPrompt) {
  if (isPresetPlaceholderPrompt(prompt) || !canTransferToOther.value) return;
  if (!confirmRelation(prompt, `复制到${otherPanelLabel.value}`)) return;

  const targetPanel = otherPanelId();
  const ok = await recordTargetPresetChange(targetPanel, `从${props.panelId === 'main' ? '主预设' : '第二预设'}复制条目: ${prompt.name}`, async () => {
    await store.insertPromptToPreset(normalizePrompt(prompt), targetPanel);
  });

  if (ok) toastr.success(`已复制 "${prompt.name}" 到${otherPanelLabel.value}`, '', { timeOut: 1600 });
}

async function movePromptToOther(prompt: PresetPrompt) {
  if (isPresetPlaceholderPrompt(prompt) || !canTransferToOther.value) return;
  if (!confirmRelation(prompt, `迁移到${otherPanelLabel.value}`)) return;
  if (!confirm(`确定将 "${prompt.name}" 迁移到${otherPanelLabel.value}吗？原预设中的该条目会被移除。`)) return;

  const sourceName = currentPresetName();
  const targetPanel = otherPanelId();
  const targetName = otherPresetName();
  if (!sourceName || !targetName) return;

  const sourceBefore = snapshotPreset(sourceName);
  const targetBefore = snapshotPreset(targetName);

  await store.insertPromptToPreset(normalizePrompt(prompt), targetPanel);
  await store.removePromptFromPreset(prompt.id, props.panelId);

  const sourceAfter = snapshotPreset(sourceName);
  const targetAfter = snapshotPreset(targetName);
  history.recordMultiOperation(`迁移条目到${otherPanelLabel.value}: ${prompt.name}`, [
    { presetName: targetName, before: targetBefore, after: targetAfter },
    { presetName: sourceName, before: sourceBefore, after: sourceAfter },
  ]);
  syncPromptsFromStore();
  toastr.success(`已迁移 "${prompt.name}" 到${otherPanelLabel.value}`, '', { timeOut: 1600 });
}

async function savePromptEdits(updates: Partial<PresetPrompt>) {
  const prompt = editingPrompt.value;
  if (!prompt || isPresetPlaceholderPrompt(prompt)) return;

  const ok = await recordPresetChange(`编辑条目: ${prompt.name}`, async () => {
    await store.updatePromptInPreset(prompt.id, updates, props.panelId);
  });
  if (ok) {
    editingPrompt.value = null;
    zoomPrompt.value = null;
    toastr.success('条目已保存', '', { timeOut: 1400 });
  }
}

async function deletePrompt(prompt: PresetPrompt) {
  if (isPresetPlaceholderPrompt(prompt)) return;
  if (!confirm(`确定删除条目 "${prompt.name}" 吗？可以通过撤销恢复。`)) return;

  const ok = await recordPresetChange(`删除条目: ${prompt.name}`, async () => {
    await store.removePromptFromPreset(prompt.id, props.panelId);
  });
  if (ok) {
    if (editingPrompt.value?.id === prompt.id) editingPrompt.value = null;
    if (zoomPrompt.value?.id === prompt.id) zoomPrompt.value = null;
    toastr.info('条目已删除', '', { timeOut: 1400 });
  }
}

watch(
  () => props.panelId === 'main' ? store.preset : store.secondPreset,
  () => syncPromptsFromStore(),
  { deep: true },
);

onMounted(() => {
  if (props.panelId !== 'main') return;
  try {
    const current = store.currentPresetName;
    if (current) {
      selectedPreset.value = current;
      const loaded = store.loadMainPreset(current);
      if (loaded) {
        syncPromptsFromStore();
        history.createSnapshot(current, undefined, true);
      }
    }
  } catch (e) {
    console.error('[PresetManager] PresetPanel mount error:', e);
  }
});
</script>

<style scoped>
.panel-header {
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 14px 6px;
  border-bottom: 1px solid var(--pm-divider);
  background: color-mix(in srgb, var(--pm-bg-soft) 32%, transparent);
}
.preset-path {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
}
.panel-kicker {
  flex-shrink: 0;
  color: var(--pm-text-subtle);
  font-size: 11px;
}
.preset-select-wrap {
  position: relative;
  min-width: 0;
  display: flex;
  align-items: center;
}
.preset-select-wrap i {
  position: absolute;
  right: 2px;
  color: var(--pm-text-subtle);
  pointer-events: none;
}
.preset-select {
  width: min(420px, 52vw);
  min-width: 160px;
  height: 28px;
  padding: 0 20px 0 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--pm-text);
  font-size: 13px;
  font-weight: 620;
  outline: none;
  cursor: pointer;
  appearance: none;
}
.preset-select:focus {
  color: var(--pm-accent);
}
.preset-select option {
  background: var(--pm-bg-elevated);
  color: var(--pm-text);
}
.prompt-count {
  flex-shrink: 0;
  color: var(--pm-text-subtle);
  font-size: 11px;
}
.prompt-list {
  padding: 4px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 0;
  transition: background 0.15s;
  background: transparent;
}
.prompt-list.drop-target {
  background: color-mix(in srgb, var(--pm-accent) 6%, var(--pm-bg));
  outline: 1px dashed var(--pm-border-strong);
  outline-offset: -2px;
  border-radius: 10px;
}
.prompt-list.sorting {
  outline-style: solid;
}
.prompt-drop-slot,
.prompt-drop-tail {
  position: relative;
}
.prompt-drop-slot.drop-before::before,
.prompt-drop-tail.drop-before::before {
  content: '';
  position: absolute;
  left: 8px;
  right: 8px;
  top: -1px;
  height: 2px;
  border-radius: 999px;
  background: var(--pm-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--pm-accent) 14%, transparent);
  pointer-events: none;
  z-index: 2;
}
.prompt-drop-tail {
  min-height: 2px;
}
.prompt-drop-tail.drop-before::before {
  top: 0;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
}
</style>
