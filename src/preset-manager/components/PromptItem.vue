<template>
  <div
    class="prompt-item"
    :class="{ expanded, dragging: isDragging, disabled: !prompt.enabled, 'is-placeholder': isPlaceholder }"
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
        <span v-if="relationLabel" class="relation-badge">{{ relationLabel }}</span>
      </div>

      <div class="flex items-center gap-2 flex-shrink-0">
        <span class="role-badge" :class="prompt.role">{{ prompt.role }}</span>
        <button
          v-if="'enabled' in prompt"
          class="status-toggle"
          :class="{ enabled: prompt.enabled }"
          :disabled="isPlaceholder"
          :title="prompt.enabled ? '禁用条目' : '启用条目'"
          @click.stop="!isPlaceholder && $emit('toggleEnabled')"
        >
          <span class="status-dot" />
        </button>
        <i :class="['fas text-xs text-slate-500 transition-transform', expanded ? 'fa-chevron-up' : 'fa-chevron-down']" />
      </div>
    </div>

    <div v-if="!expanded && prompt.content" class="prompt-preview">
      {{ prompt.content }}
    </div>

    <div v-if="expanded" class="prompt-body">
      <div v-if="prompt.content" class="content-preview">{{ prompt.content }}</div>
      <div v-else class="text-slate-500 text-xs italic">[无内容]</div>

      <div class="prompt-actions">
        <button class="action-btn" title="放大查看" @click.stop="$emit('zoom')">
          <i class="fas fa-search-plus text-xs" />
          <span>放大</span>
        </button>
        <button v-if="!isPlaceholder" class="action-btn" title="编辑" @click.stop="$emit('edit')">
          <i class="fas fa-edit text-xs" />
          <span>编辑</span>
        </button>
        <button
          v-if="!isPlaceholder"
          class="action-btn"
          :title="prompt.enabled ? '禁用条目' : '启用条目'"
          @click.stop="$emit('toggleEnabled')"
        >
          <i :class="['fas text-xs', prompt.enabled ? 'fa-toggle-on' : 'fa-toggle-off']" />
          <span>{{ prompt.enabled ? '禁用' : '启用' }}</span>
        </button>
        <button v-if="!isPlaceholder" class="action-btn" title="收藏" @click.stop="$emit('toggleFavorite')">
          <i :class="['text-xs', isFavorited ? 'fas fa-star text-amber-400' : 'far fa-star']" />
          <span>{{ isFavorited ? '取消收藏' : '收藏' }}</span>
        </button>
        <button v-if="canTransfer" class="action-btn transfer" :title="`复制到${transferTargetLabel}`" @click.stop="$emit('copyToOther')">
          <i class="fas fa-copy text-xs" />
          <span>复制到{{ transferTargetLabel }}</span>
        </button>
        <button v-if="canTransfer" class="action-btn transfer" :title="`迁移到${transferTargetLabel}`" @click.stop="$emit('moveToOther')">
          <i class="fas fa-arrow-right-arrow-left text-xs" />
          <span>迁移到{{ transferTargetLabel }}</span>
        </button>
        <button v-if="!isPlaceholder" class="action-btn danger" title="删除条目" @click.stop="$emit('delete')">
          <i class="fas fa-trash text-xs" />
          <span>删除</span>
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
  relationLabel?: string;
  canTransfer?: boolean;
  transferTargetLabel?: string;
}>();

defineEmits<{
  zoom: [];
  edit: [];
  toggleFavorite: [];
  toggleEnabled: [];
  delete: [];
  copyToOther: [];
  moveToOther: [];
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
  e.dataTransfer!.effectAllowed = props.dragType === 'preset-prompt' ? 'copyMove' : 'copy';
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
  position: relative;
  border: 1px solid transparent;
  border-bottom-color: var(--pm-row-border);
  border-radius: 0;
  background: var(--pm-row-bg);
  transition: background 0.12s, border-color 0.12s, opacity 0.12s;
  cursor: grab;
}
.prompt-item::before {
  content: '';
  position: absolute;
  inset: 3px auto 3px 0;
  width: 2px;
  border-radius: 999px;
  background: transparent;
  transition: background 0.12s;
}
.prompt-item:hover {
  border-color: transparent;
  border-bottom-color: var(--pm-row-border);
  background: var(--pm-row-hover);
}
.prompt-item.expanded {
  border-color: var(--pm-border);
  border-radius: 8px;
  background: var(--pm-row-active);
  margin: 4px 0;
}
.prompt-item.expanded::before {
  background: var(--pm-accent);
}
.prompt-item.dragging {
  opacity: 0.5;
  cursor: grabbing;
}
.prompt-item.disabled {
  opacity: 0.68;
}
.prompt-item.is-placeholder {
  cursor: default;
  border: 1px dashed var(--pm-row-border);
  border-radius: 8px;
  opacity: 0.7;
}
.prompt-header {
  display: flex;
  align-items: center;
  min-height: var(--pm-prompt-row-min, 44px);
  padding: var(--pm-prompt-pad-y, 8px) calc(var(--pm-prompt-pad-x, 10px) + 1px);
  cursor: pointer;
  gap: 8px;
}
.prompt-name {
  color: var(--pm-text);
  word-break: break-all;
  font-weight: 540;
  line-height: 1.35;
}
.relation-badge {
  flex-shrink: 0;
  padding: 1px 6px;
  border: 1px solid var(--pm-border);
  border-radius: 6px;
  color: var(--pm-text-subtle);
  font-size: 10px;
  line-height: 1.5;
  background: color-mix(in srgb, var(--pm-bg-elevated) 48%, transparent);
}
.star-btn {
  width: var(--pm-prompt-icon-size, 22px);
  height: var(--pm-prompt-icon-size, 22px);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
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
.prompt-preview {
  display: -webkit-box;
  margin: calc(-1 * var(--pm-prompt-pad-y, 8px) + 1px) calc(var(--pm-prompt-pad-x, 10px) + 48px) var(--pm-prompt-pad-y, 8px) calc(var(--pm-prompt-pad-x, 10px) + var(--pm-prompt-icon-size, 22px) + 8px);
  color: var(--pm-text-muted);
  line-height: 1.45;
  word-break: break-all;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--pm-prompt-preview-lines, 1);
}
.role-badge {
  font-size: calc(var(--pm-prompt-preview-font-size, 13px) * 0.8);
  min-width: 58px;
  padding: 2px 7px;
  border-radius: 6px;
  font-weight: 500;
  text-align: center;
  text-transform: uppercase;
  border: 1px solid var(--pm-border);
}
.role-badge.system {
  background: color-mix(in srgb, var(--pm-bg-elevated) 68%, transparent);
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
.status-toggle {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--pm-text-subtle);
  cursor: pointer;
  transition: all 0.12s;
}
.status-toggle:hover:not(:disabled) {
  background: var(--pm-bg-hover);
  border-color: var(--pm-border);
}
.status-toggle:disabled {
  cursor: default;
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--pm-text-subtle);
}
.status-toggle.enabled .status-dot {
  background: var(--pm-success);
}
.prompt-body {
  padding: 0 var(--pm-prompt-pad-x, 10px) var(--pm-prompt-pad-y, 8px);
  border-top: 1px solid var(--pm-divider);
  margin-top: 0;
  padding-top: var(--pm-prompt-pad-y, 8px);
}
.content-preview {
  font-size: var(--pm-prompt-preview-font-size, 13px);
  color: var(--pm-text-muted);
  line-height: 1.5;
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  background: var(--pm-input-bg);
  border: 1px solid var(--pm-divider);
  border-radius: 8px;
  padding: var(--pm-prompt-pad-y, 8px);
}
.prompt-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: var(--pm-prompt-pad-y, 8px);
}
.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 7px;
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
.action-btn.danger:hover {
  color: var(--pm-danger);
  border-color: color-mix(in srgb, var(--pm-danger) 42%, var(--pm-border));
  background: color-mix(in srgb, var(--pm-danger) 10%, transparent);
}
.action-btn.transfer:hover {
  color: var(--pm-text);
  border-color: color-mix(in srgb, var(--pm-accent) 38%, var(--pm-border));
  background: color-mix(in srgb, var(--pm-accent) 10%, transparent);
}
</style>
