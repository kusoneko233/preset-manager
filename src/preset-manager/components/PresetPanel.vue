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

    <div class="prompt-list flex-1 overflow-y-auto" :class="{ 'drop-target': isDropTarget }">
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
const prompts = computed(() => (props.panelId === 'main' ? store.mainPrompts : store.secondPrompts));

function isFavorited(prompt: PresetPrompt): boolean {
  return props.favoritedIds?.has(prompt.id) ?? false;
}

function onPresetChange() {
  if (!selectedPreset.value) return;
  if (props.panelId === 'main') {
    store.loadMainPreset(selectedPreset.value);
    history.createSnapshot(selectedPreset.value, undefined, true);
  } else {
    store.loadSecondPreset(selectedPreset.value);
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
        store.loadMainPreset(current);
        history.createSnapshot(current, undefined, true);
      }
    } catch (e) {
      console.error('[PresetManager] PresetPanel mount error:', e);
    }
  }
});
</script>

<style scoped>
.panel-header {
  padding: 8px;
  border-bottom: 1px solid rgba(51, 65, 85, 0.3);
}
.preset-select {
  width: 100%;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(51, 65, 85, 0.5);
  background: rgba(15, 23, 42, 0.8);
  color: #e2e8f0;
  font-size: 13px;
  outline: none;
  cursor: pointer;
}
.preset-select:focus {
  border-color: rgba(99, 102, 241, 0.5);
}
.preset-select option {
  background: #1e293b;
  color: #e2e8f0;
}
.prompt-list {
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: background 0.15s;
}
.prompt-list.drop-target {
  background: rgba(99, 102, 241, 0.05);
  outline: 2px dashed rgba(99, 102, 241, 0.3);
  outline-offset: -2px;
  border-radius: 6px;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
}
</style>
