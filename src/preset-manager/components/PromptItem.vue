<template>
  <div
    ref="promptItemRoot"
    class="prompt-item"
    :class="[
      { expanded, dragging: isDragging, enabled: prompt.enabled, disabled: !prompt.enabled, 'is-placeholder': isPlaceholder, locked, 'empty-content': isEmptyContent, preview: isPreview },
      migrationBadge ? `migration-side-${migrationBadge.side} migration-tone-${migrationBadge.tone}` : '',
    ]"
    :draggable="!isPlaceholder && !isPreview && !manualDrag"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
  >
    <div class="prompt-row" @click="toggle">
      <span
        class="prompt-left-marker"
        :class="{ 'has-role-dot': !(isGroupHeader && collapsedGroupCount) }"
      >
        <span
          v-if="!(isGroupHeader && collapsedGroupCount)"
          class="prompt-role-dot"
          :class="`role-${prompt.role}`"
          :title="prompt.role || ''"
        />
        <button
          v-else-if="isGroupHeader && collapsedGroupCount"
          class="prompt-group-toggle"
          type="button"
          :aria-expanded="!groupCollapsed"
          :title="groupCollapsed ? '展开这个分组' : '折叠这个分组'"
          @click.stop="$emit('toggleGroupCollapsed')"
        >
          <Icon :name="groupCollapsed ? 'chevron-right' : 'chevron-down'" :size="14" />
        </button>
      </span>

      <div class="prompt-title-cluster">
        <label
          v-if="editing && editingTitleName"
          class="prompt-title-input-wrap"
          @click.stop
        >
          <input
            ref="titleInput"
            v-model="draft.name"
            class="prompt-title-input"
            type="text"
            @keydown.enter.prevent.stop="stopTitleNameEdit"
            @keydown.esc.prevent.stop="cancelTitleNameEdit"
            @blur="stopTitleNameEdit"
          />
        </label>
        <button
          v-else-if="editing"
          class="prompt-title-edit"
          type="button"
          title="修改名称"
          @click.stop="startTitleNameEdit"
        >
          <span class="prompt-name">{{ draft.name || prompt.name }}</span>
          <Icon name="pen-line" :size="12" class="prompt-title-edit-icon" />
        </button>
        <span v-else class="prompt-name">{{ prompt.name }}</span>

        <span v-if="isGroupHeader && groupCollapsed && collapsedGroupCount" class="prompt-group-count">
          已收起 {{ collapsedGroupCount }} 条
        </span>
      </div>
      <span v-if="relationLabel" class="prompt-relation">{{ relationLabel }}</span>
      <button
        v-if="migrationBadge"
        class="prompt-migration-badge"
        :class="`tone-${migrationBadge.tone}`"
        type="button"
        :title="migrationBadge.note"
        @click.stop="$emit('migrationBadgeClick')"
      >
        {{ migrationBadge.label }}
      </button>

      <span class="prompt-row-spacer" />

      <button
        v-if="'enabled' in prompt"
        class="status-toggle"
        :class="{ on: prompt.enabled }"
        :disabled="isPlaceholder || isPreview"
        :title="prompt.enabled ? '禁用条目' : '启用条目'"
        @click.stop="!isPlaceholder && !isPreview && $emit('toggleEnabled')"
      >
        <span class="status-dot" />
      </button>
    </div>

    <div
      v-if="!expanded && prompt.content"
      class="prompt-preview"
      role="button"
      tabindex="0"
      @click.stop="startInlineEdit('content')"
      @keydown.enter.stop.prevent="startInlineEdit('content')"
      @keydown.space.stop.prevent="startInlineEdit('content')"
    >
      {{ prompt.content }}
    </div>

    <div v-if="expanded" class="prompt-body">
      <div v-if="!editing" class="prompt-meta">
        <span class="role-pill" :class="`role-${prompt.role}`">{{ prompt.role }}</span>
        <span v-if="triggerLabel" class="meta-pill">{{ triggerLabel }}</span>
        <span v-if="positionLabel" class="meta-pill">{{ positionLabel }}</span>
      </div>

      <template v-if="!editing">
        <div
          v-if="diffLinesForCurrentSide.length"
          class="prompt-content prompt-content-diff"
          role="button"
          tabindex="0"
          title="点击编辑内容"
          @click.stop="startInlineEdit('content')"
          @keydown.enter.stop.prevent="startInlineEdit('content')"
          @keydown.space.stop.prevent="startInlineEdit('content')"
        >
          <span
            v-for="(line, index) in diffLinesForCurrentSide"
            :key="`${line.kind}-${index}-${line.text}`"
            class="diff-line"
            :class="{ removed: line.kind === 'removed', added: line.kind === 'added', same: line.kind === 'same' }"
          >{{ line.text || ' ' }}</span>
        </div>
        <div
          v-else-if="prompt.content"
          class="prompt-content"
          role="button"
          tabindex="0"
          title="点击编辑内容"
          @click.stop="startInlineEdit('content')"
          @keydown.enter.stop.prevent="startInlineEdit('content')"
          @keydown.space.stop.prevent="startInlineEdit('content')"
        >
          {{ prompt.content }}
        </div>
        <div
          v-else
          class="prompt-empty"
          role="button"
          tabindex="0"
          title="点击编辑内容"
          @click.stop="startInlineEdit('content')"
          @keydown.enter.stop.prevent="startInlineEdit('content')"
          @keydown.space.stop.prevent="startInlineEdit('content')"
        >
          [无内容]
        </div>
      </template>

      <div v-else class="prompt-inline-editor" @click.stop>
        <label class="inline-field inline-content-field">
          <span class="inline-field-label">内容</span>
          <span class="inline-content-shell">
            <textarea
              ref="contentInput"
              v-model="draft.content"
              class="inline-content-input"
              :class="{ 'has-diff-overlay': diffLinesForCurrentSide.length }"
            />
            <span
              v-if="diffLinesForCurrentSide.length"
              class="inline-content-diff-overlay"
              aria-label="内容差异对比"
              :data-diff-text="diffTextForCurrentSide"
            >
              <span
                v-for="(line, index) in diffLinesForCurrentSide"
                :key="`inline-${line.kind}-${index}-${line.text}`"
                class="diff-line"
                :class="{ removed: line.kind === 'removed', added: line.kind === 'added', same: line.kind === 'same' }"
              >{{ line.text || ' ' }}</span>
            </span>
          </span>
        </label>

        <div class="inline-meta-controls">
          <label class="inline-field">
            <span class="inline-field-label">角色</span>
            <select v-model="draft.role" class="inline-select inline-control-capsule">
              <option value="system">系统</option>
              <option value="user">用户</option>
              <option value="assistant">AI助手</option>
            </select>
          </label>

          <label class="inline-field">
            <span class="inline-field-label">位置</span>
            <select v-model="draft.positionType" class="inline-select inline-control-capsule">
              <option value="relative">相对列表位置</option>
              <option value="in_chat">插入聊天记录</option>
            </select>
          </label>

          <button
            v-if="!isPlaceholder"
            class="inline-lock-toggle inline-control-capsule"
            :class="{ locked }"
            type="button"
            :aria-pressed="locked"
            :title="locked ? '已锁定：对比迁移不会修改该条目' : '锁定条目，防止对比迁移覆盖'"
            @click.stop="$emit('toggleLock')"
          >
            <Icon v-if="locked" name="lock" :size="13" />
            <Icon v-else name="lock-open" :size="13" />
            <span>{{ locked ? '已锁定' : '锁定' }}</span>
          </button>

          <template v-if="draft.positionType === 'in_chat'">
            <label class="inline-field">
              <span class="inline-field-label">深度</span>
              <input v-model.number="draft.depth" class="inline-input" type="number" min="0" step="1" />
            </label>

            <label class="inline-field">
              <span class="inline-field-label">顺序</span>
              <input v-model.number="draft.order" class="inline-input" type="number" step="1" />
            </label>
          </template>

          <fieldset class="inline-trigger-field">
            <legend>触发类型</legend>
            <button
              class="inline-trigger-summary inline-control-capsule"
              type="button"
              :aria-expanded="triggerPanelOpen"
              @click="triggerPanelOpen = !triggerPanelOpen"
            >
              <span>{{ triggerSummaryLabel }}</span>
              <Icon :name="triggerPanelOpen ? 'chevron-up' : 'chevron-down'" :size="12" />
            </button>
            <div v-if="triggerPanelOpen" class="inline-trigger-panel" role="group" aria-label="触发类型">
              <label
                v-for="option in TRIGGER_OPTIONS"
                :key="option.value"
                class="inline-trigger-pill"
                :class="{ active: draft.triggers.includes(option.value) }"
              >
                <input v-model="draft.triggers" class="inline-trigger-checkbox" type="checkbox" :value="option.value" />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </fieldset>
        </div>

      </div>

      <div class="prompt-actions">
        <IconButton v-if="canTransfer" name="copy" size="sm" :title="`复制到${transferTargetLabel}`" @click.stop="$emit('copyToOther')" />
        <IconButton v-if="canTransfer" name="arrow-right" size="sm" :title="`迁移到${transferTargetLabel}`" @click.stop="$emit('moveToOther')" />
        <IconButton v-if="canRestoreDefault" name="refresh-cw" size="sm" title="恢复默认" @click.stop="$emit('restoreDefault')" />
        <IconButton v-if="canDelete" name="trash-2" size="sm" danger title="删除条目" @click.stop="$emit('delete')" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from './Icon.vue';
import IconButton from './IconButton.vue';
import { isPresetPlaceholderPrompt } from '../utils/officialPromptManager';
import type { PromptContentDiffLines } from '../utils/presetCompare';

const props = defineProps<{
  prompt: PresetPrompt;
  isFavorited?: boolean;
  dragType?: string;
  dragSource?: string;
  dragIndex?: number;
  relationLabel?: string;
  canTransfer?: boolean;
  canDetach?: boolean;
  canDelete?: boolean;
  canRestoreDefault?: boolean;
  transferTargetLabel?: string;
  locked?: boolean;
  preview?: boolean;
  manualDrag?: boolean;
  isGroupHeader?: boolean;
  groupCollapsed?: boolean;
  collapsedGroupCount?: number;
  migrationBadge?: {
    tone: 'added' | 'removed' | 'content' | 'enabled' | 'order' | 'mixed' | 'duplicate';
    label: string;
    side: 'old' | 'new' | 'neutral';
    note?: string;
  } | null;
  migrationDiffLines?: PromptContentDiffLines | null;
}>();

type PromptRole = 'system' | 'user' | 'assistant';
type PromptPositionType = 'relative' | 'in_chat';
type InlineEditFocus = 'content';
type PromptEditDraft = {
  name: string;
  role: PromptRole;
  content: string;
  positionType: PromptPositionType;
  depth: number;
  order: number;
  triggers: string[];
};

const INJECTION_POSITION_RELATIVE = 0;
const INJECTION_POSITION_IN_CHAT = 1;
const DEFAULT_DEPTH = 4;
const DEFAULT_ORDER = 100;
const AUTO_SAVE_DELAY_MS = 450;

const TRIGGER_OPTIONS = [
  { value: 'normal', label: '普通' },
  { value: 'continue', label: '继续' },
  { value: 'impersonate', label: '扮演' },
  { value: 'swipe', label: '换回复' },
  { value: 'regenerate', label: '重新生成' },
  { value: 'quiet', label: '静默' },
] as const;

const emit = defineEmits<{
  zoom: [];
  saveEdits: [updates: Partial<PresetPrompt>];
  toggleFavorite: [];
  toggleEnabled: [];
  toggleLock: [];
  toggleGroupCollapsed: [];
  delete: [];
  detach: [];
  restoreDefault: [];
  copyToOther: [];
  moveToOther: [];
  migrationBadgeClick: [];
}>();

const expanded = ref(false);
const editing = ref(false);
const editingTitleName = ref(false);
const triggerPanelOpen = ref(false);
const promptItemRoot = ref<HTMLElement | null>(null);
const isDragging = ref(false);
const titleInput = ref<HTMLInputElement>();
const contentInput = ref<HTMLTextAreaElement>();
let autoSaveTimer: ReturnType<typeof window.setTimeout> | null = null;
const draft = reactive<PromptEditDraft>({
  name: '',
  role: 'system',
  content: '',
  positionType: 'relative',
  depth: DEFAULT_DEPTH,
  order: DEFAULT_ORDER,
  triggers: [],
});

const isPlaceholder = computed(() => isPresetPlaceholderPrompt(props.prompt));
const isPreview = computed(() => !!props.preview);
const manualDrag = computed(() => !!props.manualDrag);
const isEmptyContent = computed(() => !String(props.prompt.content ?? '').trim());
const promptAny = computed(() => props.prompt as any);
const isGroupHeader = computed(() => !!props.isGroupHeader);
const groupCollapsed = computed(() => !!props.groupCollapsed);
const collapsedGroupCount = computed(() => props.collapsedGroupCount ?? 0);
const diffLinesForCurrentSide = computed(() => {
  if (!props.migrationDiffLines || !props.migrationBadge) return [];
  if (props.migrationBadge.side === 'old') return props.migrationDiffLines.oldLines;
  if (props.migrationBadge.side === 'new') return props.migrationDiffLines.newLines;
  return [];
});
const diffTextForCurrentSide = computed(() => diffLinesForCurrentSide.value.map(line => line.text).join('\n'));

const triggerLabel = computed(() => {
  const triggers = promptAny.value.injection_trigger ?? promptAny.value.triggers;
  if (!Array.isArray(triggers) || triggers.length === 0) return '';
  return `触发 ${triggers.length}`;
});

const positionLabel = computed(() => {
  const position = promptAny.value.position;
  const injectionPosition = promptAny.value.injection_position;
  if (position?.type === 'in_chat' || injectionPosition === 1) {
    const depth = position?.depth ?? promptAny.value.injection_depth;
    const order = position?.order ?? promptAny.value.injection_order;
    return `聊天中 D${depth ?? '-'} / O${order ?? '-'}`;
  }
  return '相对位置';
});

const triggerSummaryLabel = computed(() => `触发类型 · ${draft.triggers.length}`);

function toggle() {
  if (isPreview.value) return;
  if (expanded.value) {
    flushAutoSave();
    editing.value = false;
    expanded.value = false;
    return;
  }
  startInlineEdit('content');
}

function normalizeRole(role: PresetPrompt['role']): PromptRole {
  return role === 'user' || role === 'assistant' ? role : 'system';
}

function normalizeNumber(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function resetDraft() {
  draft.name = props.prompt.name ?? '';
  draft.role = normalizeRole(props.prompt.role);
  draft.content = props.prompt.content ?? '';
  draft.positionType = promptAny.value.injection_position === INJECTION_POSITION_IN_CHAT
    || promptAny.value.position?.type === 'in_chat'
    ? 'in_chat'
    : 'relative';
  draft.depth = normalizeNumber(promptAny.value.injection_depth ?? promptAny.value.position?.depth, DEFAULT_DEPTH);
  draft.order = normalizeNumber(promptAny.value.injection_order ?? promptAny.value.position?.order, DEFAULT_ORDER);
  draft.triggers = Array.isArray(promptAny.value.injection_trigger)
    ? [...promptAny.value.injection_trigger]
    : [];
  editingTitleName.value = false;
  triggerPanelOpen.value = false;
}

function focusInitialField(initialFocus: InlineEditFocus) {
  if (initialFocus === 'content') {
    contentInput.value?.focus();
  }
}

function startInlineEdit(initialFocus: InlineEditFocus = 'content') {
  if (isPlaceholder.value || isPreview.value) return;
  expanded.value = true;
  resetDraft();
  editing.value = true;
  nextTick(() => focusInitialField(initialFocus));
}

function startTitleNameEdit() {
  if (isPlaceholder.value || isPreview.value || !editing.value) return;
  editingTitleName.value = true;
  nextTick(() => {
    titleInput.value?.focus();
    titleInput.value?.select();
  });
}

function stopTitleNameEdit() {
  if (!editingTitleName.value) return;
  editingTitleName.value = false;
  draft.name = draft.name.trim() || props.prompt.name || 'Untitled';
  scheduleAutoSave();
}

function cancelTitleNameEdit() {
  draft.name = props.prompt.name ?? '';
  editingTitleName.value = false;
}

function buildDraftUpdates() {
  const isInChat = draft.positionType === 'in_chat';
  return {
    name: draft.name.trim() || 'Untitled',
    role: draft.role,
    content: draft.content,
    position: isInChat
      ? { type: 'in_chat', depth: draft.depth, order: draft.order }
      : { type: 'relative' },
    injection_position: isInChat ? INJECTION_POSITION_IN_CHAT : INJECTION_POSITION_RELATIVE,
    injection_depth: draft.depth,
    injection_order: draft.order,
    injection_trigger: [...draft.triggers],
  } as Partial<PresetPrompt>;
}

function hasDraftChanges() {
  const current = promptAny.value;
  const currentPositionType = current.injection_position === INJECTION_POSITION_IN_CHAT
    || current.position?.type === 'in_chat'
    ? 'in_chat'
    : 'relative';
  const currentDepth = normalizeNumber(current.injection_depth ?? current.position?.depth, DEFAULT_DEPTH);
  const currentOrder = normalizeNumber(current.injection_order ?? current.position?.order, DEFAULT_ORDER);
  const currentTriggers = Array.isArray(current.injection_trigger) ? current.injection_trigger : [];

  return (draft.name.trim() || 'Untitled') !== (props.prompt.name || 'Untitled')
    || draft.role !== normalizeRole(props.prompt.role)
    || draft.content !== (props.prompt.content ?? '')
    || draft.positionType !== currentPositionType
    || draft.depth !== currentDepth
    || draft.order !== currentOrder
    || JSON.stringify(draft.triggers) !== JSON.stringify(currentTriggers);
}

function scheduleAutoSave() {
  if (!editing.value || isPlaceholder.value || isPreview.value) return;
  if (autoSaveTimer) window.clearTimeout(autoSaveTimer);
  autoSaveTimer = window.setTimeout(() => {
    autoSaveTimer = null;
    flushAutoSave();
  }, AUTO_SAVE_DELAY_MS);
}

function flushAutoSave() {
  if (autoSaveTimer) {
    window.clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
  if (!editing.value || isPlaceholder.value || isPreview.value || !hasDraftChanges()) return;
  emit('saveEdits', buildDraftUpdates());
}

function saveInlineEdit() {
  flushAutoSave();
  editing.value = false;
  expanded.value = false;
}

function cancelInlineEdit() {
  editing.value = false;
  editingTitleName.value = false;
  expanded.value = false;
  resetDraft();
}

function closeTriggerPanelFromOutside(event: Event) {
  if (!triggerPanelOpen.value) return;
  const target = event.target as HTMLElement | null;
  const triggerField = target?.closest?.('.inline-trigger-field');
  if (triggerField && promptItemRoot.value?.contains(triggerField)) return;
  triggerPanelOpen.value = false;
}

function closeTriggerPanelFromKey(event: KeyboardEvent) {
  if (event.key === 'Escape') triggerPanelOpen.value = false;
}

function onDragStart(e: DragEvent) {
  if (isPreview.value || isPlaceholder.value || manualDrag.value) {
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

const watchDraftForAutoSave = watch(
  () => [
    draft.name,
    draft.role,
    draft.content,
    draft.positionType,
    draft.depth,
    draft.order,
    draft.triggers.join('|'),
  ],
  () => {
    if (editing.value) scheduleAutoSave();
  },
);

watch(
  () => [
    props.prompt?.id,
    promptAny.value.identifier,
    props.prompt?.name,
    props.prompt?.content,
    props.prompt?.role,
    promptAny.value.injection_position,
    promptAny.value.injection_depth,
    promptAny.value.injection_order,
    JSON.stringify(promptAny.value.injection_trigger ?? []),
  ],
  (next, previous) => {
    const promptChanged = previous && (next[0] !== previous[0] || next[1] !== previous[1]);
    if (promptChanged) {
      flushAutoSave();
      editing.value = false;
      editingTitleName.value = false;
    }
    if (!editing.value) resetDraft();
  },
  { immediate: true },
);

onMounted(() => {
  document.addEventListener('pointerdown', closeTriggerPanelFromOutside, true);
  document.addEventListener('mousedown', closeTriggerPanelFromOutside, true);
  document.addEventListener('click', closeTriggerPanelFromOutside, true);
  window.addEventListener('keydown', closeTriggerPanelFromKey, true);
});

onBeforeUnmount(() => {
  flushAutoSave();
  document.removeEventListener('pointerdown', closeTriggerPanelFromOutside, true);
  document.removeEventListener('mousedown', closeTriggerPanelFromOutside, true);
  document.removeEventListener('click', closeTriggerPanelFromOutside, true);
  window.removeEventListener('keydown', closeTriggerPanelFromKey, true);
  watchDraftForAutoSave();
});

defineExpose({ expanded, editing, startInlineEdit });
</script>

<style scoped>
.prompt-item {
  position: relative;
  border: 0;
  border-radius: 10px;
  background: var(--pm-bg-card);
  cursor: grab;
  transition: background 0.14s ease, opacity 0.14s ease;
}
.prompt-item:hover {
  background: color-mix(in srgb, var(--pm-bg-card-hover) 86%, var(--pm-text) 4%);
}
.prompt-item.expanded {
  background: var(--pm-bg-card);
  box-shadow: none;
}
.prompt-item.locked {
  box-shadow: none;
}
.prompt-item.locked.expanded {
  background: var(--pm-bg-card);
}
.prompt-item.dragging {
  opacity: 0.5;
  cursor: grabbing;
}
.prompt-item.disabled {
  opacity: 1;
  background: color-mix(in srgb, var(--pm-bg-card) 38%, var(--pm-bg-workspace));
}
.prompt-item.disabled:hover {
  background: color-mix(in srgb, var(--pm-bg-card) 44%, var(--pm-bg-workspace));
}
.prompt-item.empty-content {
  background: color-mix(in srgb, var(--pm-warning) 9%, var(--pm-bg-card));
}
.prompt-item.empty-content:hover {
  background: color-mix(in srgb, var(--pm-warning) 12%, var(--pm-bg-card-hover));
}
.prompt-item.empty-content.disabled {
  background: color-mix(in srgb, var(--pm-warning) 5%, var(--pm-bg-workspace));
}
.prompt-item.empty-content.disabled:hover {
  background: color-mix(in srgb, var(--pm-warning) 7%, var(--pm-bg-workspace));
}
.prompt-item.empty-content .prompt-name {
  color: color-mix(in srgb, var(--pm-warning) 42%, var(--pm-text));
}
.prompt-item.empty-content.disabled .prompt-name {
  color: color-mix(in srgb, var(--pm-warning) 25%, var(--pm-text-muted));
}
.prompt-item.is-placeholder {
  cursor: default;
  opacity: 0.5;
}
.prompt-item.preview {
  cursor: default;
  opacity: 0.82;
  pointer-events: none;
  filter: saturate(0.86);
}
.prompt-item.preview .prompt-row,
.prompt-item.preview .prompt-preview {
  cursor: default;
}
.prompt-item.migration-side-old {
  box-shadow: inset 2px 0 0 color-mix(in srgb, var(--migration-side-tone, var(--pm-danger)) 78%, transparent);
}
.prompt-item.migration-side-new {
  box-shadow: inset 2px 0 0 color-mix(in srgb, var(--migration-side-tone, var(--pm-success)) 78%, transparent);
}
.prompt-item.migration-side-neutral {
  box-shadow: inset 2px 0 0 color-mix(in srgb, var(--migration-tone, var(--pm-text-muted)) 58%, transparent);
}
.prompt-item.migration-side-old .prompt-preview,
.prompt-item.migration-side-old .prompt-content {
  background: color-mix(in srgb, var(--migration-side-tone, var(--pm-danger)) 10%, var(--pm-bg-elevated));
}
.prompt-item.migration-side-new .prompt-preview,
.prompt-item.migration-side-new .prompt-content {
  background: color-mix(in srgb, var(--migration-side-tone, var(--pm-success)) 10%, var(--pm-bg-elevated));
}
.prompt-item.migration-side-old {
  --migration-side-tone: #ff6f6f;
}
.prompt-item.migration-side-new {
  --migration-side-tone: #56d17f;
}
.prompt-item.migration-tone-added {
  --migration-tone: #56d17f;
}
.prompt-item.migration-tone-removed {
  --migration-tone: #ff6f6f;
}
.prompt-item.migration-tone-content {
  --migration-tone: #62a8ff;
}
.prompt-item.migration-tone-enabled {
  --migration-tone: #b18cff;
}
.prompt-item.migration-tone-mixed {
  --migration-tone: #ffd447;
}
.prompt-item.migration-tone-duplicate {
  --migration-tone: #8c8f96;
}
.prompt-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: var(--pm-prompt-row-min, 40px);
  padding: var(--pm-prompt-pad-y, 7px) calc(var(--pm-prompt-pad-x, 12px)) var(--pm-prompt-pad-y, 7px) calc(var(--pm-prompt-pad-x, 12px) + 18px);
  cursor: pointer;
}
.prompt-left-marker {
  position: absolute;
  left: calc(var(--pm-prompt-pad-x, 12px) - 7px);
  top: 50%;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-50%);
  pointer-events: none;
  z-index: 1;
}
.prompt-item.expanded .prompt-left-marker.has-role-dot {
  display: none;
}
.prompt-role-dot {
  flex: 0 0 auto;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pm-text-muted) 58%, transparent);
  transition: background 0.12s ease, box-shadow 0.12s ease;
}
.prompt-role-dot.role-system {
  background: color-mix(in srgb, var(--pm-text-muted) 60%, transparent);
}
.prompt-role-dot.role-user {
  background: color-mix(in srgb, var(--pm-text-muted) 64%, transparent);
}
.prompt-role-dot.role-assistant {
  background: color-mix(in srgb, var(--pm-text-muted) 64%, transparent);
}
.prompt-item.enabled .prompt-role-dot {
  background: color-mix(in srgb, var(--pm-text-muted) 72%, transparent);
  box-shadow: none;
}
.prompt-name {
  min-width: 0;
  color: var(--pm-text);
  font-weight: 500;
  letter-spacing: -0.005em;
  line-height: 1.35;
  word-break: break-all;
}
.prompt-title-cluster {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 1 1 auto;
}
.prompt-title-cluster > .prompt-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.prompt-title-edit {
  min-width: 0;
  max-width: min(100%, 360px);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: -5px;
  padding: 2px 5px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--pm-text);
  cursor: text;
  transition: background 0.12s ease, color 0.12s ease;
}
.prompt-title-edit .prompt-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.prompt-title-edit:hover {
  background: var(--pm-pill-bg-hover);
}
.prompt-title-edit-icon {
  flex-shrink: 0;
  color: var(--pm-text-subtle);
  opacity: 0.48;
  transition: color 0.12s ease, opacity 0.12s ease;
}
.prompt-title-edit:hover .prompt-title-edit-icon {
  color: var(--pm-text);
  opacity: 1;
}
.prompt-title-input-wrap {
  min-width: 0;
  flex: 1 1 180px;
  margin-left: -5px;
}
.prompt-title-input {
  width: 100%;
  height: 28px;
  border: 0;
  border-radius: 7px;
  padding: 0 8px;
  background: color-mix(in srgb, var(--pm-bg-elevated) 80%, transparent);
  color: var(--pm-text);
  outline: none;
}
.prompt-title-input:focus {
  background: color-mix(in srgb, var(--pm-bg-elevated) 92%, var(--pm-bg-hover));
}
.prompt-item.disabled .prompt-name {
  color: color-mix(in srgb, var(--pm-text-muted) 56%, transparent);
}
.prompt-relation {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 7px;
  border: 1px solid var(--pm-border);
  border-radius: 999px;
  color: var(--pm-text-subtle);
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1;
}
.prompt-migration-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 7px;
  border: 1px solid color-mix(in srgb, var(--migration-tone, var(--pm-text-muted)) 38%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--migration-tone, var(--pm-text-muted)) 11%, transparent);
  color: color-mix(in srgb, var(--migration-tone, var(--pm-text-muted)) 82%, var(--pm-text));
  font-size: 10.5px;
  font-weight: 620;
  line-height: 1;
  cursor: pointer;
}
.prompt-migration-badge:hover {
  background: color-mix(in srgb, var(--migration-tone, var(--pm-text-muted)) 18%, transparent);
}
.prompt-migration-badge.tone-added {
  --migration-tone: #56d17f;
}
.prompt-migration-badge.tone-removed {
  --migration-tone: #ff6f6f;
}
.prompt-migration-badge.tone-content {
  --migration-tone: #62a8ff;
}
.prompt-migration-badge.tone-enabled {
  --migration-tone: #b18cff;
}
.prompt-migration-badge.tone-mixed {
  --migration-tone: #ffd447;
}
.prompt-migration-badge.tone-duplicate {
  --migration-tone: #8c8f96;
}
.prompt-row-spacer {
  flex: 1;
  min-width: 0;
}
.prompt-group-toggle {
  position: absolute;
  inset: 50% auto auto 50%;
  flex: 0 0 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 0;
  border-radius: 999px;
  padding: 0;
  background: transparent;
  color: #ffffff;
  cursor: pointer;
  transform: translate(-50%, -50%);
  pointer-events: auto;
  transition: background 0.12s ease, color 0.12s ease, transform 0.12s ease;
}
.prompt-group-toggle:hover {
  background: color-mix(in srgb, var(--pm-text) 7%, transparent);
  color: #ffffff;
}
.prompt-group-toggle:active {
  transform: translate(-50%, -50%) scale(0.94);
}
.prompt-group-count {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pm-text) 5%, transparent);
  color: var(--pm-text-subtle);
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}
.prompt-preview {
  display: -webkit-box;
  margin: calc(-1 * var(--pm-prompt-pad-y, 7px) + 1px) calc(var(--pm-prompt-pad-x, 12px) + 64px) var(--pm-prompt-pad-y, 7px) calc(var(--pm-prompt-pad-x, 12px) + 18px);
  color: color-mix(in srgb, var(--pm-text) 74%, transparent);
  font-size: 12.5px;
  line-height: 1.45;
  word-break: break-all;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--pm-prompt-preview-lines, 1);
  cursor: text;
  transition: color 0.12s ease;
}
.prompt-preview:hover,
.prompt-preview:focus-visible {
  color: color-mix(in srgb, var(--pm-text) 86%, transparent);
  outline: none;
}
.prompt-item.disabled .prompt-preview {
  color: color-mix(in srgb, var(--pm-text-muted) 44%, transparent);
}

.status-toggle {
  appearance: none;
  position: relative;
  width: 28px;
  height: 16px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, #54585f 54%, #000);
  box-shadow: none;
  opacity: 0.72;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  flex-shrink: 0;
  transition: all 100ms ease-out;
}
.status-toggle::before {
  content: "";
  position: absolute;
  inset: -6px;
}
.status-toggle.on {
  background: #6ca775;
  box-shadow: none;
  opacity: 1;
}
.status-toggle:disabled {
  cursor: not-allowed;
}
.status-toggle:hover {
  background: color-mix(in srgb, #60656d 58%, #000);
  opacity: 0.86;
}
.status-toggle.on:hover {
  background: #6ca775;
  opacity: 1;
}
.status-dot {
  position: absolute;
  top: 0;
  left: 0;
  width: 16px;
  height: 16px;
  display: block;
  background: color-mix(in srgb, #ffffff 58%, #54585f);
  border-radius: 50%;
  box-shadow: none;
  transition: all 100ms ease-out;
}
.status-toggle.on .status-dot {
  background: #ffffff;
  transform: translateX(12px);
  box-shadow: none;
}

/* Expanded body */
.prompt-body {
  padding: 0 var(--pm-prompt-pad-x, 12px) var(--pm-prompt-pad-y, 7px);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.prompt-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}
.role-pill,
.meta-pill {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 8px;
  border: 1px solid var(--pm-border);
  border-radius: 999px;
  color: var(--pm-text-subtle);
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.02em;
  line-height: 1;
  text-transform: uppercase;
}
.role-pill.role-user {
  border-color: color-mix(in srgb, var(--pm-success) 32%, transparent);
  background: color-mix(in srgb, var(--pm-success) 14%, transparent);
  color: var(--pm-success);
}
.role-pill.role-assistant {
  border-color: color-mix(in srgb, var(--pm-warning) 32%, transparent);
  background: color-mix(in srgb, var(--pm-warning) 14%, transparent);
  color: var(--pm-warning);
}
.role-pill.role-system {
  color: var(--pm-text-muted);
}
.prompt-content {
  max-height: clamp(260px, 42vh, 560px);
  padding: 10px 12px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-bg-elevated);
  color: var(--pm-text-muted);
  font-size: var(--pm-prompt-editor-font-size, 15px);
  line-height: 1.6;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  cursor: text;
  transition: border-color 0.12s ease, background 0.12s ease;
}
.prompt-content:hover,
.prompt-content:focus-visible {
  border-color: var(--pm-border-strong);
  background: color-mix(in srgb, var(--pm-bg-elevated) 80%, var(--pm-bg-hover));
  outline: none;
}
.prompt-content-diff {
  display: block;
  white-space: normal;
}
.diff-line {
  display: block;
  min-height: 1.45em;
  color: color-mix(in srgb, var(--pm-text-muted) 86%, transparent);
  font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace;
  font-size: 12.5px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
.diff-line.same {
  color: color-mix(in srgb, var(--pm-text-muted) 62%, transparent);
}
.diff-line.removed {
  color: color-mix(in srgb, var(--pm-danger) 86%, var(--pm-text));
}
.diff-line.added {
  color: color-mix(in srgb, var(--pm-success) 86%, var(--pm-text));
}
.prompt-item.disabled .prompt-content {
  background: color-mix(in srgb, var(--pm-bg-elevated) 90%, var(--pm-bg-hover));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pm-text) 8%, transparent);
}
.prompt-empty {
  padding: 10px 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--pm-warning) 7%, var(--pm-bg-elevated));
  color: var(--pm-text-faint);
  font-size: 12px;
  font-style: italic;
  cursor: text;
}
.prompt-empty:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--pm-accent) 44%, transparent);
  outline-offset: 2px;
}
.prompt-inline-editor {
  display: grid;
  gap: 10px;
  padding: 6px 0 0;
  border-radius: 0;
  background: transparent;
}
.inline-editor-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  align-items: center;
}
.inline-editor-grid.compact {
  display: flex;
}
.inline-meta-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 7px;
}
.inline-field,
.inline-content-field {
  min-width: 0;
  display: grid;
  gap: 5px;
}
.inline-field-label,
.inline-trigger-field legend {
  color: var(--pm-text-subtle);
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}
.inline-field {
  flex: 0 0 auto;
}
.inline-input,
.inline-select,
.inline-content-input {
  width: 100%;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pm-bg-elevated) 72%, transparent);
  color: var(--pm-text);
  outline: none;
  box-shadow: none;
  transition: background 0.12s ease, color 0.12s ease;
}
.inline-input,
.inline-select {
  height: 32px;
  padding: 0 12px;
  font-size: 12.5px;
}
.inline-control-capsule {
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 11px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, #000 20%, var(--pm-bg-elevated));
  color: var(--pm-text-muted);
  font-size: 12.5px;
  box-shadow: none;
  transition: background 0.12s ease, color 0.12s ease;
}
.inline-control-capsule:hover,
.inline-control-capsule:focus,
.inline-trigger-summary.inline-control-capsule[aria-expanded='true'] {
  background: color-mix(in srgb, #000 8%, var(--pm-bg-elevated));
  color: var(--pm-text);
}
.inline-select.inline-control-capsule {
  padding: 0 28px 0 12px;
  appearance: none;
  -webkit-appearance: none;
}
.inline-field .inline-input,
.inline-field .inline-select {
  width: auto;
  min-width: 112px;
}
.inline-input:focus,
.inline-select:focus,
.inline-content-input:focus {
  background: color-mix(in srgb, var(--pm-bg-elevated) 88%, var(--pm-bg-hover));
  box-shadow: none;
}
.inline-select.inline-control-capsule:focus {
  background: color-mix(in srgb, #000 8%, var(--pm-bg-elevated));
  color: var(--pm-text);
}
.inline-content-input {
  border-radius: 8px;
  min-height: clamp(260px, 42vh, 560px);
  resize: vertical;
  padding: 12px 13px;
  font-family: inherit;
  font-size: var(--pm-prompt-editor-font-size, 15px);
  line-height: 1.6;
  white-space: pre-wrap;
}
.inline-content-shell {
  position: relative;
  display: block;
  min-width: 0;
}
.inline-content-input.has-diff-overlay {
  background: transparent;
  color: transparent;
  caret-color: var(--pm-text);
}
.inline-content-diff-overlay {
  position: absolute;
  inset: 0;
  min-height: clamp(260px, 42vh, 560px);
  padding: 12px 13px;
  border-radius: 8px;
  color: var(--pm-text-muted);
  font-size: var(--pm-prompt-editor-font-size, 15px);
  line-height: 1.6;
  overflow: auto;
  pointer-events: none;
  white-space: pre-wrap;
  word-break: break-word;
}
.prompt-item.disabled .inline-content-input {
  background: color-mix(in srgb, var(--pm-bg-elevated) 92%, var(--pm-bg-hover));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pm-text) 9%, transparent);
}
.inline-lock-toggle {
  height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 11px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, #000 20%, var(--pm-bg-elevated));
  color: var(--pm-text-muted);
  font-size: 12.5px;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}
.inline-lock-toggle:hover {
  background: color-mix(in srgb, #000 8%, var(--pm-bg-elevated));
  color: var(--pm-text);
}
.inline-lock-toggle.locked {
  background: color-mix(in srgb, #000 20%, var(--pm-bg-elevated));
  color: var(--pm-text-muted);
}
.inline-trigger-field {
  display: grid;
  gap: 6px;
  justify-items: start;
  align-self: end;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
.inline-trigger-field legend {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.inline-trigger-summary {
  width: fit-content;
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 11px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, #000 20%, var(--pm-bg-elevated));
  color: var(--pm-text-muted);
  font-size: 12.5px;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}
.inline-trigger-summary:hover,
.inline-trigger-summary[aria-expanded='true'] {
  background: color-mix(in srgb, #000 8%, var(--pm-bg-elevated));
  color: var(--pm-text);
}
.inline-trigger-panel {
  width: fit-content;
  max-width: 100%;
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, #000 18%, var(--pm-bg-elevated));
}
.inline-trigger-pill {
  position: relative;
  min-height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  border-radius: 999px;
  background: transparent;
  color: var(--pm-text-muted);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}
.inline-trigger-pill:hover {
  background: var(--pm-pill-bg-hover);
  color: var(--pm-text);
}
.inline-trigger-pill.active {
  background: var(--pm-control-highlight);
  color: var(--pm-text);
}
.inline-trigger-checkbox {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.prompt-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding-top: 2px;
}

@media (max-width: 720px) {
  .inline-editor-grid,
  .inline-editor-grid.compact {
    grid-template-columns: 1fr;
  }
}
</style>
