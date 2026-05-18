<template>
  <div
    class="prompt-item"
    :class="{ expanded, dragging: isDragging, 'is-placeholder': isPlaceholder }"
    :draggable="!isPlaceholder"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
  >
    <div class="prompt-header" @click="toggle">
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <button
          v-if="!isPlaceholder"
          class="star-btn"
          :class="{ favorited: isFavorited }"
          title="收藏"
          @click.stop="$emit('toggleFavorite')"
        >
          <i :class="['text-xs', isFavorited ? 'fas fa-star' : 'far fa-star']" />
        </button>
        <i v-else class="fas fa-grip-lines text-slate-600 text-xs flex-shrink-0" />

        <span class="prompt-name">{{ prompt.name }}</span>
      </div>

      <div class="flex items-center gap-2 flex-shrink-0">
        <span class="role-badge" :class="prompt.role">{{ prompt.role }}</span>
        <span v-if="'enabled' in prompt" class="status-dot" :class="{ enabled: prompt.enabled }" />
        <i :class="['fas text-xs text-slate-500 transition-transform', expanded ? 'fa-chevron-up' : 'fa-chevron-down']" />
      </div>
    </div>

    <div v-if="expanded" class="prompt-body">
      <div v-if="prompt.content" class="content-preview">{{ prompt.content }}</div>
      <div v-else class="text-slate-500 text-xs italic">[占位符 - 无内容]</div>

      <div class="prompt-actions">
        <button class="action-btn" title="放大查看" @click="$emit('zoom')">
          <i class="fas fa-search-plus text-xs" />
          <span>放大</span>
        </button>
        <button v-if="!isPlaceholder" class="action-btn" title="编辑" @click="$emit('edit')">
          <i class="fas fa-edit text-xs" />
          <span>编辑</span>
        </button>
        <button v-if="!isPlaceholder" class="action-btn" title="收藏" @click="$emit('toggleFavorite')">
          <i :class="['text-xs', isFavorited ? 'fas fa-star text-amber-400' : 'far fa-star']" />
          <span>{{ isFavorited ? '取消收藏' : '收藏' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  prompt: PresetPrompt;
  isFavorited?: boolean;
  dragType?: string;
  dragSource?: string;
  dragIndex?: number;
}>();

defineEmits<{
  zoom: [];
  edit: [];
  toggleFavorite: [];
}>();

const expanded = ref(false);
const isDragging = ref(false);

const isPlaceholder = computed(() => isPresetPlaceholderPrompt(props.prompt));

function toggle() {
  expanded.value = !expanded.value;
}

function onDragStart(e: DragEvent) {
  if (isPlaceholder.value) {
    e.preventDefault();
    return;
  }
  isDragging.value = true;
  e.dataTransfer!.effectAllowed = 'copy';
  e.dataTransfer!.setData(
    'application/json',
    JSON.stringify({
      type: props.dragType ?? 'prompt',
      source: props.dragSource ?? '',
      index: props.dragIndex ?? 0,
      prompt: props.prompt,
    }),
  );
}

function onDragEnd() {
  isDragging.value = false;
}

defineExpose({ expanded });
</script>

<style scoped>
.prompt-item {
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  transition: all 0.15s;
  cursor: grab;
}
.prompt-item:hover {
  border-color: var(--pm-border);
  background: var(--pm-bg-hover);
}
.prompt-item.expanded {
  border-color: var(--pm-border);
  background: var(--pm-bg-soft);
}
.prompt-item.dragging {
  opacity: 0.5;
  cursor: grabbing;
}
.prompt-item.is-placeholder {
  cursor: default;
  border-style: dashed;
  opacity: 0.7;
}
.prompt-header {
  display: flex;
  align-items: center;
  min-height: 38px;
  padding: 7px 10px;
  cursor: pointer;
  gap: 8px;
}
.prompt-name {
  font-size: 13px;
  color: var(--pm-text);
  word-break: break-all;
}
.star-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--pm-text-subtle);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}
.star-btn:hover {
  color: var(--pm-warning);
  background: color-mix(in srgb, var(--pm-warning) 12%, transparent);
}
.star-btn.favorited {
  color: var(--pm-warning);
}
.role-badge {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 999px;
  font-weight: 500;
  text-transform: uppercase;
  border: 1px solid var(--pm-border);
}
.role-badge.system {
  background: var(--pm-bg-elevated);
  color: var(--pm-text);
}
.role-badge.user {
  background: color-mix(in srgb, var(--pm-success) 12%, transparent);
  color: var(--pm-success);
}
.role-badge.assistant {
  background: color-mix(in srgb, var(--pm-warning) 12%, transparent);
  color: var(--pm-warning);
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--pm-text-subtle);
}
.status-dot.enabled {
  background: var(--pm-success);
}
.prompt-body {
  padding: 0 10px 10px;
  border-top: 1px solid var(--pm-border);
  margin-top: 0;
  padding-top: 8px;
}
.content-preview {
  font-size: 12px;
  color: var(--pm-text-muted);
  line-height: 1.5;
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  background: var(--pm-input-bg);
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  padding: 8px;
}
.prompt-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}
.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid var(--pm-border);
  background: transparent;
  color: var(--pm-text-muted);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.12s;
}
.action-btn:hover {
  background: var(--pm-bg-hover);
  color: var(--pm-text);
  border-color: var(--pm-border-strong);
}
</style>
