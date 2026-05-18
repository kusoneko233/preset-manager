<template>
  <div
    class="preset-panel flex flex-col h-full"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div class="panel-header">
      <select v-model="selectedPreset" class="preset-select" @change="onPresetChange">
        <option value="" disabled>选择预设...</option>
        <option v-for="name in presetNames" :key="name" :value="name">{{ name }}</option>
      </select>
    </div>

    <div :key="promptListKey" class="prompt-list flex-1 overflow-y-auto" :class="{ 'drop-target': isDropTarget }">
      <div v-if="!prompts.length" class="empty-state">
        <i class="fas fa-inbox text-2xl text-slate-600 mb-2" />
        <div class="text-slate-500 text-xs">{{ selectedPreset ? '预设为空' : '请选择预设' }}</div>
      </div>
      <PromptItem
        v-for="(prompt, i) in prompts"
        :key="prompt.id"
        :prompt="prompt"
        :is-favorited="isFavorited(prompt)"
        :drag-type="'preset-prompt'"
        :drag-source="panelId"
        :drag-index="i"
        @zoom="zoomPrompt = prompt"
        @edit="openEditor(prompt)"
        @toggle-enabled="togglePromptEnabled(prompt)"
        @toggle-favorite="$emit('favorite', prompt)"
        @delete="deletePrompt(prompt)"
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
  e.dataTransfer!.dropEffect = 'copy';
  isDropTarget.value = true;
}

function onDragLeave() {
  isDropTarget.value = false;
}

function snapshotPreset(presetName: string) {
  return klona(getPreset(presetName));
}

async function recordPresetChange(description: string, operation: () => Promise<void>) {
  const presetName = currentPresetName();
  if (!presetName) return false;

  const before = snapshotPreset(presetName);
  await operation();
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

async function onDrop(e: DragEvent) {
  isDropTarget.value = false;
  const raw = e.dataTransfer?.getData('application/json');
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    const prompt = data.prompt as PresetPrompt;
    if (!prompt || !prompt.name) return;

    if (isPresetPlaceholderPrompt(prompt)) return;

    await recordPresetChange(`插入条目: ${prompt.name}`, async () => {
      await store.insertPromptToPreset(normalizePrompt(prompt), props.panelId);
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
  padding: 10px 12px;
  border-bottom: 1px solid var(--pm-border);
  background: var(--pm-bg);
}
.preset-select {
  width: 100%;
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--pm-border);
  background: var(--pm-input-bg);
  color: var(--pm-text);
  font-size: 13px;
  outline: none;
  cursor: pointer;
}
.preset-select:focus {
  border-color: var(--pm-border-strong);
}
.preset-select option {
  background: var(--pm-bg-elevated);
  color: var(--pm-text);
}
.prompt-list {
  padding: var(--pm-prompt-list-pad, 8px);
  display: flex;
  flex-direction: column;
  gap: var(--pm-prompt-list-gap, 6px);
  transition: background 0.15s;
  background: var(--pm-bg);
}
.prompt-list.drop-target {
  background: color-mix(in srgb, var(--pm-accent) 6%, var(--pm-bg));
  outline: 2px dashed var(--pm-border-strong);
  outline-offset: -2px;
  border-radius: 8px;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
}
</style>
