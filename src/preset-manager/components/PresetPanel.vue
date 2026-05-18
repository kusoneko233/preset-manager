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
        @edit="editingPrompt = prompt"
        @toggle-favorite="$emit('favorite', prompt)"
      />
    </div>

    <PromptDetailOverlay
      :visible="!!zoomPrompt"
      :prompt="zoomPrompt ?? emptyPrompt"
      :is-favorited="zoomPrompt ? isFavorited(zoomPrompt) : false"
      :show-actions="!!zoomPrompt && !isPresetPlaceholderPrompt(zoomPrompt)"
      @close="zoomPrompt = null"
      @edit="editingPrompt = zoomPrompt; zoomPrompt = null"
      @toggle-favorite="zoomPrompt && $emit('favorite', zoomPrompt)"
    />
  </div>
</template>

<script setup lang="ts">
import PromptItem from './PromptItem.vue';
import PromptDetailOverlay from './PromptDetailOverlay.vue';
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
const promptListKey = computed(() => `${props.panelId}:${selectedPreset.value}:${prompts.value.length}`);

function syncPromptsFromStore() {
  prompts.value = props.panelId === 'main' ? [...store.mainPrompts] : [...store.secondPrompts];
}

function isFavorited(prompt: PresetPrompt): boolean {
  return props.favoritedIds?.has(prompt.id) ?? false;
}

function onPresetChange() {
  if (!selectedPreset.value) return;
  const loaded = props.panelId === 'main'
    ? store.loadMainPreset(selectedPreset.value)
    : store.loadSecondPreset(selectedPreset.value);

  if (loaded) {
    syncPromptsFromStore();
    console.log('[PresetManager] PresetPanel prompts after load:', props.panelId, prompts.value.length);
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

async function onDrop(e: DragEvent) {
  isDropTarget.value = false;
  const raw = e.dataTransfer?.getData('application/json');
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    const prompt = data.prompt as PresetPrompt;
    if (!prompt || !prompt.name) return;

    if (isPresetPlaceholderPrompt(prompt)) return;

    const presetName = props.panelId === 'main' ? store.presetName : store.secondPresetName;
    if (!presetName) return;

    const before = klona(getPreset(presetName));

    const normalPrompt: PresetNormalPrompt = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: prompt.name,
      enabled: prompt.enabled ?? true,
      position: (prompt as any).position ?? { type: 'relative' as const },
      role: prompt.role,
      content: (prompt as any).content ?? '',
    };

    await store.insertPromptToPreset(normalPrompt, props.panelId);

    const after = klona(getPreset(presetName));
    history.recordOperation(presetName, before, after, `插入条目: ${prompt.name}`);

    toastr.success(`已插入 "${prompt.name}"`, '操作成功', { timeOut: 2000 });
  } catch (err) {
    console.error('[PresetPanel] Drop error:', err);
  }
}

onMounted(() => {
  if (props.panelId === 'main') {
    try {
      const current = store.currentPresetName;
      console.log('[PresetManager] PresetPanel mount, currentPresetName:', current);
      if (current) {
        selectedPreset.value = current;
        const loaded = store.loadMainPreset(current);
        if (loaded) {
          syncPromptsFromStore();
          console.log('[PresetManager] PresetPanel prompts after mount:', prompts.value.length);
          history.createSnapshot(current, undefined, true);
        }
      }
    } catch (e) {
      console.error('[PresetManager] PresetPanel mount error:', e);
    }
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
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
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
