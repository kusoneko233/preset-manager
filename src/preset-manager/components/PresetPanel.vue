<template>
  <div
    class="preset-panel flex h-full flex-col"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <header v-if="panelId === 'main'" class="preset-panel-head">
      <div class="preset-panel-head-text">
        <span class="preset-panel-kicker">主预设</span>
        <h3 class="preset-panel-title">{{ store.presetName || '未选择预设' }}</h3>
      </div>
      <span v-if="prompts.length" class="preset-panel-count">{{ prompts.length }} 条</span>
    </header>

    <header v-else class="preset-panel-head">
      <div class="preset-panel-head-text">
        <span class="preset-panel-kicker">第二预设</span>
        <div class="preset-panel-select-wrap">
          <select v-model="selectedPreset" class="preset-panel-select" @change="onPresetChange">
            <option value="" disabled>选择预设…</option>
            <option v-for="name in presetNames" :key="name" :value="name">{{ name }}</option>
          </select>
          <Icon name="chevron-down" :size="12" class="preset-panel-select-chevron" />
        </div>
      </div>
      <span v-if="prompts.length" class="preset-panel-count">{{ prompts.length }} 条</span>
    </header>

    <div
      :key="promptListKey"
      class="prompt-list flex-1 overflow-y-auto"
      :class="{ 'drop-target': isDropTarget, sorting: isSortingDrop }"
      @dragover.prevent="onListDragOver"
    >
      <div v-if="!prompts.length" class="empty-state">
        <Icon name="file-text" :size="22" class="empty-state-icon" />
        <div class="empty-state-text">{{ selectedPreset || panelId === 'main' ? '预设为空' : '请选择预设' }}</div>
      </div>

      <div
        v-for="(prompt, i) in prompts"
        :key="getPromptKey(prompt)"
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
          :can-transfer="canTransferPromptToOther(prompt)"
          :can-detach="canDeletePrompt(prompt)"
          :can-delete="canDeletePrompt(prompt)"
          :can-restore-default="canRestoreDefaultPrompt(prompt)"
          :transfer-target-label="otherPanelLabel"
          @zoom="zoomPrompt = prompt"
          @edit="openEditor(prompt)"
          @toggle-enabled="togglePromptEnabled(prompt)"
          @toggle-favorite="$emit('favorite', prompt)"
          @copy-to-other="copyPromptToOther(prompt)"
          @move-to-other="movePromptToOther(prompt)"
          @restore-default="restoreSystemPromptDefault(prompt)"
          @detach="detachPrompt(prompt)"
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
import Icon from './Icon.vue';
import PromptItem from './PromptItem.vue';
import PromptDetailOverlay from './PromptDetailOverlay.vue';
import PromptEditDialog from './PromptEditDialog.vue';
import { getPromptKey, useManagerStore } from '../stores/manager';
import { useHistoryStore } from '../stores/history';
import { getPromptRelation, getPromptRelationLabel, type PromptRelation } from '../utils/promptRelations';
import { isOfficialPromptDeletable, isOfficialRestorableSystemPrompt } from '../utils/officialPromptManager';

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
const promptListKey = computed(() => `${props.panelId}:${selectedPreset.value}:${prompts.value.length}:${prompts.value.map(p => `${getPromptKey(p)}:${p.enabled}`).join('|')}`);

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
  return props.favoritedIds?.has(getPromptKey(prompt)) ?? false;
}

function canDeletePrompt(prompt: PresetPrompt) {
  return isOfficialPromptDeletable(prompt as any);
}

function canRestoreDefaultPrompt(prompt: PresetPrompt) {
  return isOfficialRestorableSystemPrompt(prompt as any);
}

function canTransferPromptToOther(prompt: PresetPrompt) {
  return canTransferToOther.value && canDeletePrompt(prompt);
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
  const promptKey = getPromptKey(prompt) || prompt.id;
  const normalized = {
    ...klona(prompt as any),
    id: prompt.id || promptKey,
    identifier: promptKey,
    name: prompt.name,
    enabled: prompt.enabled ?? true,
    role: prompt.role,
    content: (prompt as any).content ?? '',
  };
  normalized.position = normalized.position ?? (
    normalized.injection_position === 1
      ? {
          type: 'in_chat' as const,
          depth: normalized.injection_depth ?? 4,
          order: normalized.injection_order ?? 100,
        }
      : { type: 'relative' as const }
  );
  normalized.injection_position = normalized.injection_position
    ?? (normalized.position?.type === 'in_chat' ? 1 : 0);
  normalized.injection_depth = normalized.injection_depth ?? normalized.position?.depth ?? 4;
  normalized.injection_order = normalized.injection_order ?? normalized.position?.order ?? 100;
  normalized.injection_trigger = Array.isArray(normalized.injection_trigger) ? normalized.injection_trigger : [];
  normalized.forbid_overrides = Boolean(normalized.forbid_overrides);

  return normalized as PresetNormalPrompt;
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
    await store.updatePromptInPreset(getPromptKey(prompt), { enabled: nextEnabled }, props.panelId);
  });
  if (ok) toastr.info(nextEnabled ? '条目已启用' : '条目已禁用', '', { timeOut: 1200 });
}

async function copyPromptToOther(prompt: PresetPrompt) {
  if (!canTransferPromptToOther(prompt)) return;
  if (!confirmRelation(prompt, `复制到${otherPanelLabel.value}`)) return;

  const targetPanel = otherPanelId();
  const ok = await recordTargetPresetChange(targetPanel, `从${props.panelId === 'main' ? '主预设' : '第二预设'}复制条目: ${prompt.name}`, async () => {
    await store.insertPromptToPreset(normalizePrompt(prompt), targetPanel);
  });

  if (ok) toastr.success(`已复制 "${prompt.name}" 到${otherPanelLabel.value}`, '', { timeOut: 1600 });
}

async function movePromptToOther(prompt: PresetPrompt) {
  if (!canTransferPromptToOther(prompt)) {
    toastr.warning('系统条目或占位条目不能迁移', '', { timeOut: 1600 });
    return;
  }
  if (!confirmRelation(prompt, `迁移到${otherPanelLabel.value}`)) return;
  if (!confirm(`确定将 "${prompt.name}" 迁移到${otherPanelLabel.value}吗？原预设中的该条目会被移除。`)) return;

  const sourceName = currentPresetName();
  const targetPanel = otherPanelId();
  const targetName = otherPresetName();
  if (!sourceName || !targetName) return;

  const sourceBefore = snapshotPreset(sourceName);
  const targetBefore = snapshotPreset(targetName);

  await store.insertPromptToPreset(normalizePrompt(prompt), targetPanel);
  await store.deletePromptEverywhere(getPromptKey(prompt), props.panelId);

  const sourceAfter = snapshotPreset(sourceName);
  const targetAfter = snapshotPreset(targetName);
  history.recordMultiOperation(`迁移条目到${otherPanelLabel.value}: ${prompt.name}`, [
    { presetName: targetName, before: targetBefore, after: targetAfter },
    { presetName: sourceName, before: sourceBefore, after: sourceAfter },
  ]);
  syncPromptsFromStore();
  toastr.success(`已迁移 "${prompt.name}" 到${otherPanelLabel.value}`, '', { timeOut: 1600 });
}

async function detachPrompt(prompt: PresetPrompt) {
  if (!canDeletePrompt(prompt)) return;
  if (!confirm(`确定将 "${prompt.name}" 移出当前列表吗？它会保留在未使用条目中。`)) return;

  const ok = await recordPresetChange(`移出列表: ${prompt.name}`, async () => {
    return store.detachPromptFromPreset(getPromptKey(prompt), props.panelId);
  });
  if (ok) {
    if (getPromptKey(editingPrompt.value) === getPromptKey(prompt)) editingPrompt.value = null;
    if (getPromptKey(zoomPrompt.value) === getPromptKey(prompt)) zoomPrompt.value = null;
    toastr.info('已移出列表，可从未使用条目中重新添加', '', { timeOut: 1600 });
  }
}

async function savePromptEdits(updates: Partial<PresetPrompt>) {
  const prompt = editingPrompt.value;
  if (!prompt || isPresetPlaceholderPrompt(prompt)) return;

  const ok = await recordPresetChange(`编辑条目: ${prompt.name}`, async () => {
    await store.updatePromptInPreset(getPromptKey(prompt), updates, props.panelId);
  });
  if (ok) {
    editingPrompt.value = null;
    zoomPrompt.value = null;
    toastr.success('条目已保存', '', { timeOut: 1400 });
  }
}

async function restoreSystemPromptDefault(prompt: PresetPrompt) {
  if (!canRestoreDefaultPrompt(prompt)) return;
  if (!confirm(`确定将 "${prompt.name}" 恢复为官方默认内容吗？当前启用状态会保留。`)) return;

  const ok = await recordPresetChange(`恢复默认系统条目: ${prompt.name}`, async () => {
    return store.restoreSystemPromptDefault(getPromptKey(prompt), props.panelId);
  });
  if (ok) {
    if (getPromptKey(editingPrompt.value) === getPromptKey(prompt)) editingPrompt.value = null;
    if (getPromptKey(zoomPrompt.value) === getPromptKey(prompt)) zoomPrompt.value = null;
    toastr.success('系统条目已恢复默认内容', '', { timeOut: 1400 });
  } else {
    toastr.warning('未找到可恢复的官方默认内容', '', { timeOut: 1600 });
  }
}

async function deletePrompt(prompt: PresetPrompt) {
  if (!canDeletePrompt(prompt)) return;
  if (!confirm(`确定彻底删除条目 "${prompt.name}" 吗？系统条目和占位条目不能彻底删除，可以通过撤销恢复。`)) return;

  const ok = await recordPresetChange(`删除条目: ${prompt.name}`, async () => {
    return store.deletePromptEverywhere(getPromptKey(prompt), props.panelId);
  });
  if (ok) {
    if (getPromptKey(editingPrompt.value) === getPromptKey(prompt)) editingPrompt.value = null;
    if (getPromptKey(zoomPrompt.value) === getPromptKey(prompt)) zoomPrompt.value = null;
    toastr.info('条目已删除', '', { timeOut: 1400 });
  } else {
    toastr.warning('系统条目或占位条目不能彻底删除', '', { timeOut: 1600 });
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
.preset-panel {
  position: relative;
  overflow: hidden;
}
.preset-panel-head {
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px 6px;
  background: transparent;
}
.preset-panel-head-text {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}
.preset-panel-kicker {
  flex-shrink: 0;
  color: var(--pm-text-subtle);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
}
.preset-panel-title {
  margin: 0;
  min-width: 0;
  color: var(--pm-text);
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.preset-panel-select-wrap {
  position: relative;
  min-width: 0;
  display: flex;
  align-items: center;
}
.preset-panel-select {
  width: min(420px, 52vw);
  min-width: 160px;
  height: 24px;
  padding: 0 22px 0 0;
  border: 0;
  background: transparent;
  color: var(--pm-text);
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  outline: none;
  cursor: pointer;
  appearance: none;
}
.preset-panel-select-chevron {
  position: absolute;
  right: 4px;
  color: var(--pm-text-subtle);
  pointer-events: none;
}
.preset-panel-select option {
  background: var(--pm-bg-elevated);
  color: var(--pm-text);
}
.preset-panel-count {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border: 1px solid var(--pm-border);
  border-radius: 999px;
  color: var(--pm-text-subtle);
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1;
}
.prompt-list {
  padding: 4px 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: background 0.15s ease;
  background: transparent;
}
.prompt-list.drop-target {
  background: color-mix(in srgb, var(--pm-accent) 5%, var(--pm-bg));
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
  left: 6px;
  right: 6px;
  top: -1px;
  height: 2px;
  border-radius: 999px;
  background: var(--pm-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--pm-accent) 16%, transparent);
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
  gap: 10px;
  padding: 48px 16px;
}
.empty-state-icon {
  color: var(--pm-text-faint);
}
.empty-state-text {
  color: var(--pm-text-subtle);
  font-size: 13px;
}
</style>
