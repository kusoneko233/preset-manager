<template>
  <div
    ref="panelRoot"
    class="preset-panel flex h-full flex-col"
    :class="`${panelId}-panel`"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
    @preset-manager-favorite-dragover="onFavoritePromptDragOver"
    @preset-manager-favorite-drop="onFavoritePromptDrop"
    @preset-manager-favorite-dragend="onFavoritePromptDragEnd"
  >
    <header v-if="panelId === 'second' && showSecondHeader" class="preset-panel-head">
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
      ref="promptListRef"
      :key="promptListKey"
      class="prompt-list flex-1 overflow-y-auto"
      :class="{ 'drop-target': isDropTarget, sorting: isSortingDrop }"
      @dragover.prevent="onListDragOver"
    >
      <div v-if="selectionMode && selectedPromptKeys.length" class="bulk-selection-bar">
        <span class="bulk-selection-count">已选 {{ selectedPromptKeys.length }} 条</span>
        <button class="bulk-selection-action" type="button" @click="bulkSetEnabled(true)">启用</button>
        <button class="bulk-selection-action" type="button" @click="bulkSetEnabled(false)">禁用</button>
        <button class="bulk-selection-action" type="button" @click="bulkSetLocked(true)">锁定</button>
        <button class="bulk-selection-action" type="button" @click="bulkSetLocked(false)">解锁</button>
        <button v-if="canTransferToOther" class="bulk-selection-action" type="button" @click="bulkCopySelectedToOther">复制到{{ otherPanelLabel }}</button>
        <button v-if="canTransferToOther" class="bulk-selection-action" type="button" @click="bulkMoveSelectedToOther">移动到{{ otherPanelLabel }}</button>
        <button class="bulk-selection-action danger" type="button" @click="bulkDetachSelected">移出</button>
        <button class="bulk-selection-action danger" type="button" @click="bulkDeleteSelected">删除所选</button>
        <button class="bulk-selection-clear" type="button" @click="finishSelectionMode">完成</button>
      </div>

      <div v-if="!prompts.length" class="empty-state">
        <Icon name="file-text" :size="22" class="empty-state-icon" />
        <div class="empty-state-text" @contextmenu.prevent.stop="openPromptTailContextMenu">
          {{ selectedPreset || panelId === 'main' ? '预设为空' : '请选择预设' }}
        </div>
        <div v-if="currentPresetName()" class="empty-state-actions">
          <button class="empty-state-action" type="button" :disabled="creatingSinglePrompt" @click="createSinglePrompt">新建条目</button>
          <button class="empty-state-action primary" type="button" @click="createBatchPrompts">批量新建条目</button>
        </div>
      </div>

      <template v-for="(prompt, i) in prompts" :key="getPromptKey(prompt)">
        <div
          v-if="!isPromptHiddenByCollapsedGroup(i)"
          class="prompt-drop-slot"
          :data-preset-prompt-key="getPromptKey(prompt)"
          :data-preset-prompt-index="i"
          :class="{ 'drop-before': dropIndex === i, focused: isPromptFocused(prompt), selecting: selectionMode, dragging: isPresetPromptDragging(prompt, i) }"
          :style="getPresetPromptSlotStyle(prompt, i)"
          @click.capture="onPresetPromptClickCapture"
          @mousedown="onPresetPromptMouseDown($event, prompt, i)"
          @dragover.prevent.stop="onPromptDragOver($event, i)"
          @drop.prevent.stop="onPromptDrop($event, i)"
          @contextmenu.prevent.stop="openPromptContextMenu($event, prompt)"
        >
          <div
            v-if="showExternalPromptInsertSpacer(i)"
            class="external-insert-spacer"
          />
          <div
            v-if="showPresetPromptReorderSpacer(i)"
            class="external-insert-spacer preset-reorder"
          />
          <button
            v-if="selectionMode && !isPresetPlaceholderPrompt(prompt)"
            class="prompt-select-toggle"
            :class="{ selected: isPromptSelected(prompt) }"
            type="button"
            :data-preset-prompt-key="getPromptKey(prompt)"
            :aria-label="`选择条目 ${prompt.name}，上下方向键调整顺序`"
            :title="isPromptSelected(prompt) ? '取消选择，上下方向键调整顺序' : '选择条目，上下方向键调整顺序'"
            @focus="setFocusedPrompt(prompt)"
            @keydown.up.prevent="moveFocusedPrompt(prompt, -1)"
            @keydown.down.prevent="moveFocusedPrompt(prompt, 1)"
            @click.stop="togglePromptSelected(prompt)"
          >
            <Icon v-if="isPromptSelected(prompt)" name="check" :size="11" />
          </button>
          <PromptItem
            :ref="el => setPromptItemRef(prompt, el)"
            :prompt="prompt"
            :is-favorited="isFavorited(prompt)"
            :drag-type="'preset-prompt'"
            :drag-source="panelId"
            :drag-index="i"
            :manual-drag="true"
            :relation-label="relationLabel(prompt)"
            :can-transfer="canTransferPromptToOther(prompt)"
            :can-detach="canDeletePrompt(prompt)"
            :can-delete="canDeletePrompt(prompt)"
            :can-restore-default="canRestoreDefaultPrompt(prompt)"
            :transfer-target-label="otherPanelLabel"
            :locked="isPromptLocked(prompt)"
            :is-group-header="getPromptGroupState(i).isHeader"
            :group-collapsed="getPromptGroupState(i).collapsed"
            :collapsed-group-count="getPromptGroupState(i).count"
            @zoom="zoomPrompt = prompt"
            @save-edits="savePromptEdits(prompt, $event)"
            @toggle-enabled="togglePromptEnabled(prompt)"
            @toggle-lock="togglePromptLock(prompt)"
            @toggle-group-collapsed="togglePromptGroupCollapsed(prompt)"
            @toggle-favorite="$emit('favorite', prompt)"
            @copy-to-other="copyPromptToOther(prompt)"
            @move-to-other="movePromptToOther(prompt)"
            @restore-default="restoreSystemPromptDefault(prompt)"
            @detach="detachPrompt(prompt)"
            @delete="deletePrompt(prompt)"
          />
          <span v-if="dropIndex === i" class="drop-hint" aria-live="polite">{{ dropHintText }}</span>
        </div>
      </template>

      <div
        v-if="prompts.length"
        class="prompt-drop-tail"
        :class="{ 'drop-before': dropIndex === prompts.length }"
        @dragover.prevent.stop="onPromptDragOver($event, prompts.length)"
        @drop.prevent.stop="onPromptDrop($event, prompts.length)"
        @contextmenu.prevent.stop="openPromptTailContextMenu"
      >
        <div
          v-if="showExternalPromptInsertSpacer(prompts.length)"
          class="external-insert-spacer tail"
        />
        <div
          v-if="showPresetPromptReorderSpacer(prompts.length)"
          class="external-insert-spacer preset-reorder tail"
        />
        <span v-if="dropIndex === prompts.length" class="drop-hint tail" aria-live="polite">{{ dropHintText }}</span>
      </div>
    </div>

    <div
      v-if="presetPromptDragPreview.visible && presetPromptDragPreview.prompt"
      class="preset-prompt-drag-preview preset-drag-preview"
      :style="presetPromptDragPreviewStyle"
    >
      <PromptItem
        :prompt="presetPromptDragPreview.prompt"
        :preview="true"
        :can-transfer="false"
        :can-detach="false"
        :can-delete="false"
        :can-restore-default="false"
      />
    </div>

    <PromptDetailOverlay
      :visible="!!zoomPrompt"
      :prompt="zoomPrompt ?? emptyPrompt"
      :is-favorited="zoomPrompt ? isFavorited(zoomPrompt) : false"
      :show-actions="!!zoomPrompt && !isPresetPlaceholderPrompt(zoomPrompt)"
      @close="zoomPrompt = null"
      @toggle-favorite="zoomPrompt && $emit('favorite', zoomPrompt)"
    />

    <Teleport v-if="promptContextMenuTarget" :to="promptContextMenuTarget">
      <div
        v-if="promptContextMenuOpen"
        class="prompt-context-backdrop"
        @pointerdown.prevent.stop="closePromptContextMenu()"
        @mousedown.prevent.stop="closePromptContextMenu()"
        @click.prevent.stop="closePromptContextMenu()"
        @contextmenu.prevent.stop="closePromptContextMenu()"
      />
      <Transition name="prompt-context-pop">
        <div
          v-if="promptContextMenuOpen"
          ref="promptContextMenuRef"
          class="prompt-context-menu"
          :style="{ left: `${promptContextMenuPosition.x}px`, top: `${promptContextMenuPosition.y}px` }"
          @pointerdown.stop
          @mousedown.stop
          @contextmenu.prevent
        >
          <template v-if="selectionMode">
            <button class="prompt-context-item" type="button" @click="exitSelectionMode">
              <Icon name="x" :size="14" />
              <span>退出多选</span>
            </button>
            <button class="prompt-context-item danger" type="button" @click="bulkDeleteSelected">
              <Icon name="trash-2" :size="14" />
              <span>删除所选</span>
            </button>
          </template>
          <template v-else>
            <button v-if="contextPrompt" class="prompt-context-item" type="button" @click="enterSelectionMode">
              <Icon name="list-checks" :size="14" />
              <span>多选条目</span>
            </button>
            <button v-if="contextPrompt" class="prompt-context-item" type="button" @click="copyPromptFromContext">
              <Icon name="copy" :size="14" />
              <span>复制条目</span>
            </button>
            <button class="prompt-context-item" type="button" :disabled="!copiedPromptClipboard" @click="pastePromptFromContext">
              <Icon name="clipboard-paste" :size="14" />
              <span>粘贴条目</span>
            </button>
            <button class="prompt-context-item" type="button" @click="createBatchPromptsFromContext">
              <Icon name="list-plus" :size="14" />
              <span>批量新建条目</span>
            </button>
            <button v-if="contextPrompt" class="prompt-context-item" type="button" @click="editPromptFromContext">
              <Icon name="pen-line" :size="14" />
              <span>编辑条目</span>
            </button>
            <button v-if="contextPrompt" class="prompt-context-item" type="button" @click="togglePromptLockFromContext">
              <Icon :name="contextPrompt && isPromptLocked(contextPrompt) ? 'lock-open' : 'lock'" :size="14" />
              <span>{{ contextPrompt && isPromptLocked(contextPrompt) ? '解锁条目' : '锁定条目' }}</span>
            </button>
            <button v-if="contextPrompt" class="prompt-context-item danger" type="button" @click="deletePromptFromContext">
              <Icon name="trash-2" :size="14" />
              <span>删除条目</span>
            </button>
          </template>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import Icon from './Icon.vue';
import PromptItem from './PromptItem.vue';
import PromptDetailOverlay from './PromptDetailOverlay.vue';
import { getPromptKey, useManagerStore } from '../stores/manager';
import { useHistoryStore } from '../stores/history';
import { useConfirmStore } from '../stores/confirm';
import { useTextPromptStore } from '../stores/textPrompt';
import { getPromptRelation, getPromptRelationLabel, type PromptRelation } from '../utils/promptRelations';
import {
  isOfficialPromptDeletable,
  isOfficialRestorableSystemPrompt,
  isPresetPlaceholderPrompt,
} from '../utils/officialPromptManager';
import { startParentDrag } from '../utils/drag';

const PRESET_PROMPT_DRAG_START_DISTANCE = 4;
const PRESET_PROMPT_FAVORITE_DRAG_OVER_EVENT = 'preset-manager-preset-prompt-dragover';
const PRESET_PROMPT_FAVORITE_DROP_EVENT = 'preset-manager-preset-prompt-drop';
const PRESET_PROMPT_FAVORITE_DRAG_END_EVENT = 'preset-manager-preset-prompt-dragend';

const props = defineProps<{
  panelId: 'main' | 'second';
  activePresetName?: string;
  favoritedIds?: Set<string>;
  showSecondHeader?: boolean;
}>();

const emit = defineEmits<{
  favorite: [prompt: PresetPrompt];
}>();

const store = useManagerStore();
const history = useHistoryStore();
const confirmDialog = useConfirmStore();
const textPrompt = useTextPromptStore();

const panelRoot = ref<HTMLElement | null>(null);
const promptListRef = ref<HTMLElement | null>(null);
const selectedPreset = ref('');
const zoomPrompt = ref<PresetPrompt | null>(null);
const isDropTarget = ref(false);
const dropIndex = ref<number | null>(null);
const isSortingDrop = ref(false);
const externalPromptInsertPreview = ref<PresetNormalPrompt | null>(null);
const pendingScrollAnchor = ref<{ key?: string; index?: number } | null>(null);
const selectionMode = ref(false);
const selectedPromptKeys = ref<string[]>([]);
const focusedPromptKey = ref('');
const collapsedPromptGroupKeys = ref<Set<string>>(new Set());
const contextPrompt = ref<PresetPrompt | null>(null);
const promptItemRefs = new Map<string, { startInlineEdit?: (initialFocus?: 'content') => void }>();
const promptContextMenuTarget = ref<HTMLElement | null>(null);
const promptContextMenuOpen = ref(false);
const promptContextMenuRef = ref<HTMLElement>();
const promptContextMenuPosition = reactive({ x: 0, y: 0 });
const copiedPromptClipboard = ref<PresetNormalPrompt | null>(null);
const contextPasteIndex = ref(0);
const creatingSinglePrompt = ref(false);
const parentDocument = inject<Document>('parentDocument', document);
const iframeElement = inject<HTMLIFrameElement | null>('iframeElement', null);
const localDoc: Document = iframeElement?.contentDocument ?? document;
const presetPromptMouseDrag = reactive({
  active: false,
  dragging: false,
  key: '',
  startIndex: -1,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  width: 0,
  height: 40,
  offsetX: 0,
  offsetY: 0,
});
const presetPromptDragPreview = reactive({
  visible: false,
  key: '',
  prompt: null as PresetNormalPrompt | null,
  x: 0,
  y: 0,
  width: 0,
});
let suppressPresetPromptClick = false;
let suppressPresetPromptClickTimer: ReturnType<typeof window.setTimeout> | null = null;
let activePresetPromptDropFavoriteTarget: HTMLElement | null = null;

const emptyPrompt: PresetPrompt = { id: '', name: '', enabled: false, role: 'system' };

const presetNames = computed(() => store.presetNames);
const showSecondHeader = computed(() => props.showSecondHeader ?? true);
const prompts = ref<PresetPrompt[]>([]);
const promptListKey = computed(() => `${props.panelId}:${selectedPreset.value}:${prompts.value.length}:${prompts.value.map(p => `${getPromptKey(p)}:${p.enabled}`).join('|')}`);
const presetPromptDragPreviewStyle = computed(() => ({
  '--preset-prompt-drag-x': `${presetPromptDragPreview.x}px`,
  '--preset-prompt-drag-y': `${presetPromptDragPreview.y}px`,
  width: presetPromptDragPreview.width ? `${presetPromptDragPreview.width}px` : undefined,
}));
const dropHintText = computed(() => {
  if (dropIndex.value === null) return '';
  const target = Math.max(0, Math.min(dropIndex.value, prompts.value.length));
  if (isSortingDrop.value) {
    const movement = getPresetPromptRelativeMovement(target);
    if (movement === 0) return '移到原位';
    return movement < 0 ? `向上移动 ${Math.abs(movement)} 位` : `向下移动 ${movement} 位`;
  }
  return target >= prompts.value.length ? '插入到列表末尾' : `插入到第 ${target + 1} 位`;
});

function syncPromptsFromStore() {
  prompts.value = props.panelId === 'main' ? [...store.mainPrompts] : [...store.secondPrompts];
  const visibleKeys = new Set(prompts.value.map(prompt => getPromptKey(prompt)));
  selectedPromptKeys.value = selectedPromptKeys.value.filter(key => visibleKeys.has(key));
  if (focusedPromptKey.value && !visibleKeys.has(focusedPromptKey.value)) {
    focusedPromptKey.value = '';
  }
  pruneCollapsedPromptGroups();
  const scrollAnchor = pendingScrollAnchor.value;
  if (scrollAnchor) {
    pendingScrollAnchor.value = null;
    nextTick(() => scrollToPromptAnchor(scrollAnchor));
  }
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
  const relation = relationOf(prompt);
  if (relation === 'same-id' || relation === 'same-content') return '';
  return getPromptRelationLabel(relation);
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

function isPromptGroupHeader(prompt: PresetPrompt) {
  return !isPresetPlaceholderPrompt(prompt) && !String(prompt.content ?? '').trim();
}

function getPromptGroupState(index: number) {
  const prompt = prompts.value[index];
  if (!prompt || !isPromptGroupHeader(prompt)) {
    return { isHeader: false, collapsed: false, count: 0 };
  }

  let count = 0;
  for (let cursor = index + 1; cursor < prompts.value.length; cursor += 1) {
    if (isPromptGroupHeader(prompts.value[cursor])) break;
    count += 1;
  }

  const key = getPromptKey(prompt);
  return {
    isHeader: true,
    collapsed: collapsedPromptGroupKeys.value.has(key),
    count,
  };
}

function isPromptHiddenByCollapsedGroup(index: number) {
  const prompt = prompts.value[index];
  if (!prompt || isPromptGroupHeader(prompt)) return false;

  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const groupPrompt = prompts.value[cursor];
    if (!isPromptGroupHeader(groupPrompt)) continue;
    return collapsedPromptGroupKeys.value.has(getPromptKey(groupPrompt));
  }

  return false;
}

function togglePromptGroupCollapsed(prompt: PresetPrompt) {
  if (!isPromptGroupHeader(prompt)) return;
  const key = getPromptKey(prompt);
  if (!key) return;

  const next = new Set(collapsedPromptGroupKeys.value);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  collapsedPromptGroupKeys.value = next;
}

function pruneCollapsedPromptGroups() {
  const groupKeys = new Set(prompts.value.filter(isPromptGroupHeader).map(prompt => getPromptKey(prompt)));
  const next = new Set([...collapsedPromptGroupKeys.value].filter(key => groupKeys.has(key)));
  if (next.size !== collapsedPromptGroupKeys.value.size) {
    collapsedPromptGroupKeys.value = next;
  }
}

function setPromptItemRef(prompt: PresetPrompt, element: any) {
  const key = getPromptKey(prompt);
  if (!key) return;
  if (element) {
    promptItemRefs.set(key, element);
  } else {
    promptItemRefs.delete(key);
  }
}

function scrollToPromptAnchor(payload: { key?: string; index?: number; mainAnchorIndex?: number }) {
  const list = promptListRef.value;
  if (!list) return;

  let target = payload.key
    ? Array.from(list.querySelectorAll<HTMLElement>('[data-preset-prompt-key]'))
      .find(element => element.dataset.presetPromptKey === payload.key)
    : undefined;

  const anchorIndex = payload.mainAnchorIndex ?? payload.index;
  if (!target && typeof anchorIndex === 'number' && anchorIndex >= 0 && anchorIndex < prompts.value.length) {
    target = list.querySelector<HTMLElement>(`[data-preset-prompt-index="${anchorIndex}"]`) ?? undefined;
  } else if (!target && typeof anchorIndex === 'number' && anchorIndex >= prompts.value.length) {
    target = list.querySelector<HTMLElement>('.prompt-drop-tail') ?? undefined;
  }

  if (!target) return;
  const top = Math.max(0, target.offsetTop - list.offsetTop - 14);
  list.scrollTo({ top, behavior: 'smooth' });

  if (payload.key) {
    focusedPromptKey.value = payload.key;
  }
}

function startInlineEditForPrompt(prompt: PresetPrompt, initialFocus: 'content' = 'content') {
  if (isPresetPlaceholderPrompt(prompt)) return;
  promptItemRefs.get(getPromptKey(prompt))?.startInlineEdit?.(initialFocus);
}

function isPromptSelected(prompt: PresetPrompt) {
  return selectedPromptKeys.value.includes(getPromptKey(prompt));
}

function isPromptFocused(prompt: PresetPrompt) {
  return !!focusedPromptKey.value && focusedPromptKey.value === getPromptKey(prompt);
}

function setFocusedPrompt(prompt: PresetPrompt) {
  if (isPresetPlaceholderPrompt(prompt)) return;
  focusedPromptKey.value = getPromptKey(prompt);
}

function isPresetPromptDragging(prompt: PresetPrompt, index: number) {
  return presetPromptMouseDrag.dragging
    && presetPromptMouseDrag.startIndex === index
    && presetPromptMouseDrag.key === getPromptKey(prompt);
}

function getPresetPromptRelativeMovement(targetIndex: number) {
  if (!presetPromptMouseDrag.dragging || presetPromptMouseDrag.startIndex < 0) return 0;
  const sourceIndex = presetPromptMouseDrag.startIndex;
  const boundedTarget = Math.max(0, Math.min(targetIndex, prompts.value.length));
  const insertIndex = boundedTarget > sourceIndex ? boundedTarget - 1 : boundedTarget;
  return insertIndex - sourceIndex;
}

function getPresetPromptSlotStyle(prompt: PresetPrompt, index: number) {
  if (!presetPromptDragPreview.visible || !presetPromptDragPreview.key || isPresetPromptDragging(prompt, index)) return {};
  if (isSortingDrop.value) return {};
  const offset = getPresetPromptReflowOffset(index);
  return offset ? { transform: `translate3d(0, ${offset}px, 0)` } : {};
}

function togglePromptSelected(prompt: PresetPrompt) {
  if (isPresetPlaceholderPrompt(prompt)) return;
  if (!selectionMode.value) selectionMode.value = true;
  const key = getPromptKey(prompt);
  if (!key) return;
  selectedPromptKeys.value = selectedPromptKeys.value.includes(key)
    ? selectedPromptKeys.value.filter(item => item !== key)
    : [...selectedPromptKeys.value, key];
}

function clearSelection() {
  selectedPromptKeys.value = [];
}

function enterSelectionMode() {
  selectionMode.value = true;
  if (contextPrompt.value && !isPresetPlaceholderPrompt(contextPrompt.value)) {
    const key = getPromptKey(contextPrompt.value);
    if (key && !selectedPromptKeys.value.includes(key)) {
      selectedPromptKeys.value = [...selectedPromptKeys.value, key];
    }
  }
  closePromptContextMenu();
}

function exitSelectionMode() {
  selectionMode.value = false;
  clearSelection();
  closePromptContextMenu();
}

function finishSelectionMode() {
  exitSelectionMode();
}

function selectedPromptNames() {
  const selected = new Set(selectedPromptKeys.value);
  return prompts.value
    .filter(prompt => selected.has(getPromptKey(prompt)))
    .map(prompt => prompt.name)
    .filter(Boolean);
}

function selectedTransferablePrompts() {
  const selected = new Set(selectedPromptKeys.value);
  return prompts.value.filter(prompt => selected.has(getPromptKey(prompt)) && canTransferPromptToOther(prompt));
}

function selectedPromptSummary(promptsToSummarize: PresetPrompt[]) {
  const names = promptsToSummarize.slice(0, 5).map(prompt => prompt.name).filter(Boolean).join('、');
  return names ? `包含：${names}${promptsToSummarize.length > 5 ? ' 等' : ''}。` : '';
}

function openPromptContextMenu(event: MouseEvent, prompt: PresetPrompt) {
  if (isPresetPlaceholderPrompt(prompt)) return;
  contextPrompt.value = prompt;
  contextPasteIndex.value = resolveContextPasteIndex(event, prompt);
  promptContextMenuTarget.value = panelRoot.value?.closest('.app-root') as HTMLElement | null;
  Object.assign(promptContextMenuPosition, getPromptContextMenuPosition(event));
  promptContextMenuOpen.value = true;
  nextTick(clampPromptContextMenuPosition);
}

function openPromptTailContextMenu(event: MouseEvent) {
  contextPrompt.value = null;
  contextPasteIndex.value = prompts.value.length;
  promptContextMenuTarget.value = panelRoot.value?.closest('.app-root') as HTMLElement | null;
  Object.assign(promptContextMenuPosition, getPromptContextMenuPosition(event));
  promptContextMenuOpen.value = true;
  nextTick(clampPromptContextMenuPosition);
}

function resolveContextPasteIndex(event: MouseEvent, prompt: PresetPrompt) {
  const index = prompts.value.findIndex(item => getPromptKey(item) === getPromptKey(prompt));
  if (index < 0) return prompts.value.length;

  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) return index + 1;

  const rect = target.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? index : index + 1;
}

function getPromptContextMenuPosition(event: MouseEvent) {
  const targetRect = promptContextMenuTarget.value?.getBoundingClientRect();
  return {
    x: event.clientX - (targetRect?.left ?? 0),
    y: event.clientY - (targetRect?.top ?? 0),
  };
}

function clampPromptContextMenuPosition() {
  const menu = promptContextMenuRef.value;
  if (!menu) return;

  const margin = 8;
  const bounds = promptContextMenuTarget.value?.getBoundingClientRect();
  const maxX = (bounds?.width ?? window.innerWidth) - menu.offsetWidth - margin;
  const maxY = (bounds?.height ?? window.innerHeight) - menu.offsetHeight - margin;
  promptContextMenuPosition.x = Math.max(margin, Math.min(promptContextMenuPosition.x, maxX));
  promptContextMenuPosition.y = Math.max(margin, Math.min(promptContextMenuPosition.y, maxY));
}

function closePromptContextMenu(event?: Event) {
  if (event && promptContextMenuRef.value?.contains(event.target as Node)) return;
  promptContextMenuOpen.value = false;
}

function closePromptContextMenuFromPointer(event: Event) {
  const target = event.target as Node | null;
  if (target && promptContextMenuRef.value?.contains(target)) return;
  closePromptContextMenu();
}

function closePromptContextMenuFromKey(event: KeyboardEvent) {
  if (event.key === 'Escape') closePromptContextMenu();
}

function closePromptContextMenuOnScroll() {
  closePromptContextMenu();
}

function editPromptFromContext() {
  const prompt = contextPrompt.value;
  closePromptContextMenu();
  if (prompt) startInlineEditForPrompt(prompt, 'content');
}

function togglePromptLockFromContext() {
  const prompt = contextPrompt.value;
  closePromptContextMenu();
  if (prompt) togglePromptLock(prompt);
}

async function deletePromptFromContext() {
  const prompt = contextPrompt.value;
  closePromptContextMenu();
  if (prompt) await deletePrompt(prompt);
}

function copyPromptFromContext() {
  const prompt = contextPrompt.value;
  closePromptContextMenu();
  if (!prompt) return;
  copiedPromptClipboard.value = normalizePrompt(prompt);
  toastr.success(`已复制 "${prompt.name}"`, '', { timeOut: 1200 });
}

async function pastePromptFromContext() {
  const promptToPaste = copiedPromptClipboard.value as unknown as PresetPrompt;
  const index = Math.max(0, Math.min(contextPasteIndex.value, prompts.value.length));
  closePromptContextMenu();
  if (!promptToPaste) return;

  const ok = await recordPresetChange(`粘贴条目: ${promptToPaste.name}`, async () => {
    await store.insertPromptToPreset(normalizePrompt(promptToPaste), props.panelId, index);
  });
  if (ok) toastr.success(`已粘贴 "${promptToPaste.name}"`, '', { timeOut: 1400 });
}

async function createSinglePrompt() {
  if (creatingSinglePrompt.value) return;
  creatingSinglePrompt.value = true;
  try {
    const ok = await recordPresetChange('新建条目', async () => {
      return Boolean(await store.createPromptInPreset(props.panelId));
    });
    if (ok) toastr.success('条目已新建', '', { timeOut: 1400 });
  } finally {
    creatingSinglePrompt.value = false;
  }
}

async function createBatchPromptsFromContext() {
  closePromptContextMenu();
  await createBatchPrompts();
}

function parseBatchPromptNames(value: string) {
  return value
    .split(/[\n,，、]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

async function createBatchPrompts() {
  const rawNames = await textPrompt.prompt({
    title: '批量新建条目',
    message: '每行一个条目名称，也可以用逗号或顿号分隔。',
    label: '条目名称',
    placeholder: '文风锚点\n世界书摘要\n输出格式',
    confirmLabel: '新建',
    multiline: true,
    rows: 6,
  });
  if (rawNames === null) return;

  const names = parseBatchPromptNames(rawNames);
  if (!names.length) {
    toastr.warning('没有可新建的条目名称', '', { timeOut: 1400 });
    return;
  }

  const created = await recordPresetChange(`批量新建条目: ${names.length} 条`, async () => {
    return await store.createPromptsInPreset(names, props.panelId) > 0;
  });
  if (created) toastr.success(`已新建 ${names.length} 个条目`, '', { timeOut: 1400 });
}

async function bulkSetEnabled(enabled: boolean) {
  const keys = [...selectedPromptKeys.value];
  if (!keys.length) return;

  const ok = await recordPresetChange(`${enabled ? '批量启用' : '批量禁用'}条目: ${keys.length} 条`, async () => {
    return store.updatePromptsInPreset(keys, { enabled }, props.panelId);
  });
  if (ok) {
    clearSelection();
    toastr.info(enabled ? '已启用所选条目' : '已禁用所选条目', '', { timeOut: 1200 });
  }
}

async function bulkSetLocked(locked: boolean) {
  const keys = [...selectedPromptKeys.value];
  if (!keys.length) return;

  for (const key of keys) {
    store.setPromptLock(key, locked, props.panelId);
  }
  clearSelection();
  toastr.info(locked ? '已锁定所选条目' : '已解锁所选条目', '', { timeOut: 1200 });
}

async function bulkDetachSelected() {
  const keys = [...selectedPromptKeys.value];
  if (!keys.length) return;

  const names = selectedPromptNames().slice(0, 5).join('、');
  if (!await confirmDialog.confirm({
    title: '批量移出列表',
    message: `确定移出已选择的 ${keys.length} 个条目吗？`,
    details: names ? `包含：${names}${keys.length > 5 ? ' 等' : ''}。它们会保留在未使用条目中。` : '它们会保留在未使用条目中。',
    confirmLabel: '移出',
  })) return;

  const ok = await recordPresetChange(`批量移出列表: ${keys.length} 条`, async () => {
    const deletableKeys = prompts.value
      .filter(prompt => keys.includes(getPromptKey(prompt)) && canDeletePrompt(prompt))
      .map(prompt => getPromptKey(prompt));
    return (await store.detachPromptsFromPreset(deletableKeys, props.panelId)) > 0;
  });
  if (ok) {
    clearSelection();
    toastr.info('已移出所选条目', '', { timeOut: 1400 });
  }
}

async function bulkDeleteSelected() {
  const keys = [...selectedPromptKeys.value];
  if (!keys.length) {
    closePromptContextMenu();
    return;
  }

  const deletablePrompts = prompts.value.filter(prompt => keys.includes(getPromptKey(prompt)) && canDeletePrompt(prompt));
  if (!deletablePrompts.length) {
    closePromptContextMenu();
    toastr.warning('没有可删除的所选条目', '', { timeOut: 1400 });
    return;
  }

  if (!await confirmDialog.confirm({
    title: '删除所选条目',
    message: `确定彻底删除已选择的 ${deletablePrompts.length} 个条目吗？`,
    details: selectedPromptSummary(deletablePrompts) || '系统条目和占位条目不会被删除。',
    confirmLabel: '删除所选',
    tone: 'danger',
  })) return;

  const ok = await recordPresetChange(`批量删除条目: ${deletablePrompts.length} 条`, async () => {
    let deleted = 0;
    for (const prompt of deletablePrompts) {
      if (await store.deletePromptEverywhere(getPromptKey(prompt), props.panelId)) deleted += 1;
    }
    return deleted > 0;
  });
  if (ok) {
    exitSelectionMode();
    toastr.info('已删除所选条目', '', { timeOut: 1400 });
  }
}

async function bulkCopySelectedToOther() {
  const selected = selectedTransferablePrompts();
  if (!selected.length) {
    toastr.warning('没有可复制的所选条目', '', { timeOut: 1400 });
    return;
  }

  const targetPanel = otherPanelId();
  const ok = await recordTargetPresetChange(targetPanel, `批量复制条目到${otherPanelLabel.value}: ${selected.length} 条`, async () => {
    for (const prompt of selected) {
      await store.insertPromptToPreset(normalizePrompt(prompt), targetPanel);
    }
  });
  if (ok) {
    clearSelection();
    toastr.success(`已复制 ${selected.length} 个条目到${otherPanelLabel.value}`, '', { timeOut: 1600 });
  }
}

async function bulkMoveSelectedToOther() {
  const selected = selectedTransferablePrompts();
  if (!selected.length) {
    toastr.warning('没有可移动的所选条目', '', { timeOut: 1400 });
    return;
  }
  if (!await confirmDialog.confirm({
    title: '批量移动条目',
    message: `确定把 ${selected.length} 个条目移动到${otherPanelLabel.value}吗？`,
    details: `${selectedPromptSummary(selected)}原预设中的这些条目会被移除。`,
    confirmLabel: '移动',
  })) return;

  const sourceName = currentPresetName();
  const targetPanel = otherPanelId();
  const targetName = otherPresetName();
  if (!sourceName || !targetName) return;

  const sourceBefore = snapshotPreset(sourceName);
  const targetBefore = snapshotPreset(targetName);

  for (const prompt of selected) {
    await store.insertPromptToPreset(normalizePrompt(prompt), targetPanel);
  }
  for (const prompt of selected) {
    await store.deletePromptEverywhere(getPromptKey(prompt), props.panelId);
  }

  const sourceAfter = snapshotPreset(sourceName);
  const targetAfter = snapshotPreset(targetName);
  history.recordMultiOperation(`批量移动条目到${otherPanelLabel.value}: ${selected.length} 条`, [
    { presetName: targetName, before: targetBefore, after: targetAfter },
    { presetName: sourceName, before: sourceBefore, after: sourceAfter },
  ]);
  syncPromptsFromStore();
  clearSelection();
  toastr.success(`已移动 ${selected.length} 个条目到${otherPanelLabel.value}`, '', { timeOut: 1600 });
}

function onPresetChange() {
  if (!selectedPreset.value) return;
  exitSelectionMode();
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
  if (data?.type === 'preset' || data?.type === 'preset-reorder') {
    e.dataTransfer!.dropEffect = 'copy';
    isDropTarget.value = true;
    isSortingDrop.value = false;
    return;
  }

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
  externalPromptInsertPreview.value = null;
  if (e.target === e.currentTarget) {
    dropIndex.value = prompts.value.length;
  }
}

function onPresetPromptMouseDown(event: MouseEvent, prompt: PresetPrompt, index: number) {
  if (event.button !== 0 || selectionMode.value || isPresetPlaceholderPrompt(prompt)) return;

  const target = event.target as HTMLElement | null;
  if (target?.closest('button, input, textarea, select, label, .prompt-preview, .prompt-body, .prompt-actions, .status-toggle, .prompt-group-toggle')) return;

  const slot = event.currentTarget as HTMLElement | null;
  const rect = slot?.getBoundingClientRect();
  const point = getPresetPromptLocalPoint(event);
  resetPresetPromptMouseDrag();
  presetPromptMouseDrag.active = true;
  presetPromptMouseDrag.dragging = false;
  presetPromptMouseDrag.key = getPromptKey(prompt);
  presetPromptMouseDrag.startIndex = index;
  presetPromptMouseDrag.startX = point.x;
  presetPromptMouseDrag.startY = point.y;
  presetPromptMouseDrag.lastX = point.x;
  presetPromptMouseDrag.lastY = point.y;
  presetPromptMouseDrag.width = Math.max(160, Math.round(rect?.width ?? 0));
  presetPromptMouseDrag.height = Math.max(40, Math.round(rect?.height ?? 40));
  presetPromptMouseDrag.offsetX = Math.max(0, point.x - (rect?.left ?? point.x));
  presetPromptMouseDrag.offsetY = Math.max(0, point.y - (rect?.top ?? point.y));
  startParentDrag(parentDocument, {
    startEvent: event,
    cursor: 'grabbing',
    expectFocusInsideSourceFrame: true,
    onMove: onPresetPromptMouseMove,
    onEnd: finishPresetPromptMouseDrag,
  });
}

function getPresetPromptLocalPoint(event: MouseEvent) {
  if ((event.target as Node | null)?.ownerDocument === localDoc) {
    return { x: event.clientX, y: event.clientY };
  }
  const frameRect = (iframeElement ?? window.frameElement)?.getBoundingClientRect();
  return {
    x: event.clientX - (frameRect?.left ?? 0),
    y: event.clientY - (frameRect?.top ?? 0),
  };
}

function startPresetPromptMouseDrag(x = presetPromptMouseDrag.lastX, y = presetPromptMouseDrag.lastY) {
  if (!presetPromptMouseDrag.active || presetPromptMouseDrag.dragging || presetPromptMouseDrag.startIndex < 0) return;
  const prompt = prompts.value[presetPromptMouseDrag.startIndex];
  if (!prompt || isPresetPlaceholderPrompt(prompt)) return;

  presetPromptMouseDrag.dragging = true;
  suppressNextPresetPromptClick();
  presetPromptDragPreview.key = presetPromptMouseDrag.key;
  presetPromptDragPreview.prompt = normalizePrompt(prompt);
  presetPromptDragPreview.width = presetPromptMouseDrag.width;
  presetPromptDragPreview.visible = true;
  isDropTarget.value = true;
  isSortingDrop.value = true;
  externalPromptInsertPreview.value = null;
  dropIndex.value = presetPromptMouseDrag.startIndex;
  closePromptContextMenu();
  updatePresetPromptDragFromPoint(x, y);
}

function updatePresetPromptDragPreviewPosition(clientX = presetPromptMouseDrag.lastX, clientY = presetPromptMouseDrag.lastY) {
  if (!presetPromptDragPreview.visible) return;
  presetPromptDragPreview.x = clientX - presetPromptMouseDrag.offsetX;
  presetPromptDragPreview.y = clientY - presetPromptMouseDrag.offsetY;
}

function updatePresetPromptDragFromPoint(clientX: number, clientY: number) {
  const overFavoriteTarget = dispatchPresetPromptFavoriteDragOver(clientX, clientY);
  isDropTarget.value = !overFavoriteTarget;
  isSortingDrop.value = !overFavoriteTarget;
  externalPromptInsertPreview.value = null;
  dropIndex.value = overFavoriteTarget ? null : resolvePresetPromptMouseDropIndex(clientY);
  requestAnimationFrame(() => updatePresetPromptDragPreviewPosition(clientX, clientY));
}

function onPresetPromptMouseMove(event: MouseEvent) {
  if (!presetPromptMouseDrag.active) return;
  const point = getPresetPromptLocalPoint(event);
  presetPromptMouseDrag.lastX = point.x;
  presetPromptMouseDrag.lastY = point.y;

  if (!presetPromptMouseDrag.dragging) {
    const distance = Math.hypot(point.x - presetPromptMouseDrag.startX, point.y - presetPromptMouseDrag.startY);
    if (distance < PRESET_PROMPT_DRAG_START_DISTANCE) return;
    startPresetPromptMouseDrag(point.x, point.y);
    return;
  }

  updatePresetPromptDragFromPoint(point.x, point.y);
}

async function finishPresetPromptMouseDrag() {
  if (!presetPromptMouseDrag.active) return;
  const prompt = prompts.value[presetPromptMouseDrag.startIndex];
  const targetIndex = dropIndex.value ?? presetPromptMouseDrag.startIndex;
  const sourceIndex = presetPromptMouseDrag.startIndex;
  const wasDragging = presetPromptMouseDrag.dragging;
  const handledFavoriteDrop = wasDragging && dispatchPresetPromptFavoriteDrop();

  if (wasDragging && !handledFavoriteDrop && prompt && isPresetPromptPointerInsidePanel()) {
    await recordPresetChange(`Adjust order: ${prompt.name}`, async () => {
      return store.reorderPromptInPreset(props.panelId, presetPromptMouseDrag.startIndex, targetIndex);
    });
    suppressNextPresetPromptClick();
  }

  const moved = targetIndex !== sourceIndex && targetIndex !== sourceIndex + 1;
  resetPresetPromptMouseDrag();
  if (wasDragging && moved && prompt) {
    toastr.success(`Adjusted "${prompt.name}" order`, '', { timeOut: 1400 });
  }
}

function resetPresetPromptMouseDrag() {
  clearPresetPromptFavoriteDragTarget();
  presetPromptMouseDrag.active = false;
  presetPromptMouseDrag.dragging = false;
  presetPromptMouseDrag.key = '';
  presetPromptMouseDrag.startIndex = -1;
  presetPromptMouseDrag.startX = 0;
  presetPromptMouseDrag.startY = 0;
  presetPromptMouseDrag.lastX = 0;
  presetPromptMouseDrag.lastY = 0;
  presetPromptMouseDrag.width = 0;
  presetPromptMouseDrag.height = 40;
  presetPromptMouseDrag.offsetX = 0;
  presetPromptMouseDrag.offsetY = 0;
  presetPromptDragPreview.visible = false;
  presetPromptDragPreview.key = '';
  presetPromptDragPreview.prompt = null;
  presetPromptDragPreview.x = 0;
  presetPromptDragPreview.y = 0;
  presetPromptDragPreview.width = 0;
  resetDropState();
}

function resolvePresetPromptMouseDropIndex(clientY: number) {
  const slots = Array.from(promptListRef.value?.querySelectorAll<HTMLElement>('.prompt-drop-slot') ?? []);
  if (!slots.length) return prompts.value.length;

  for (const slot of slots) {
    const rect = slot.getBoundingClientRect();
    const index = Number(slot.dataset.presetPromptIndex);
    if (Number.isFinite(index) && clientY < rect.top + rect.height / 2) return index;
  }

  return prompts.value.length;
}

function getPresetPromptReflowOffset(index: number) {
  const sourceIndex = presetPromptMouseDrag.startIndex;
  const targetIndex = dropIndex.value;
  if (sourceIndex < 0 || targetIndex === null) return 0;

  const rowStep = presetPromptMouseDrag.height;
  if (targetIndex > sourceIndex && index > sourceIndex && index < targetIndex) return -rowStep;
  if (targetIndex < sourceIndex && index >= targetIndex && index < sourceIndex) return rowStep;
  return 0;
}

function isPresetPromptPointerInsidePanel() {
  const target = localDoc.elementFromPoint(presetPromptMouseDrag.lastX, presetPromptMouseDrag.lastY);
  return Boolean(target && panelRoot.value?.contains(target));
}

function getPresetPromptDropFavoriteTarget(clientX = presetPromptMouseDrag.lastX, clientY = presetPromptMouseDrag.lastY) {
  const hit = localDoc.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('.favorite-folder, .favorites-panel');
  if (hit) return hit;

  for (const target of Array.from(localDoc.querySelectorAll<HTMLElement>('.favorite-folder, .favorites-panel'))) {
    const rect = target.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) return target;
  }
  return null;
}

function dispatchPresetPromptFavoriteDragOver(clientX: number, clientY: number) {
  const target = getPresetPromptDropFavoriteTarget(clientX, clientY);
  if (activePresetPromptDropFavoriteTarget && activePresetPromptDropFavoriteTarget !== target) {
    activePresetPromptDropFavoriteTarget.dispatchEvent(new CustomEvent(PRESET_PROMPT_FAVORITE_DRAG_END_EVENT));
  }
  activePresetPromptDropFavoriteTarget = target;
  if (!target) return false;

  const prompt = prompts.value[presetPromptMouseDrag.startIndex];
  target.dispatchEvent(new CustomEvent(PRESET_PROMPT_FAVORITE_DRAG_OVER_EVENT, {
    detail: {
      clientY,
      prompt: prompt && !isPresetPlaceholderPrompt(prompt) ? klona(prompt as any) : undefined,
    },
  }));
  return true;
}

function clearPresetPromptFavoriteDragTarget() {
  if (!activePresetPromptDropFavoriteTarget) return;
  activePresetPromptDropFavoriteTarget.dispatchEvent(new CustomEvent(PRESET_PROMPT_FAVORITE_DRAG_END_EVENT));
  activePresetPromptDropFavoriteTarget = null;
}

function dispatchPresetPromptFavoriteDrop() {
  const target = activePresetPromptDropFavoriteTarget ?? getPresetPromptDropFavoriteTarget();
  const prompt = prompts.value[presetPromptMouseDrag.startIndex];
  if (!target || !prompt || isPresetPlaceholderPrompt(prompt)) return false;

  const dropEvent = new CustomEvent(PRESET_PROMPT_FAVORITE_DROP_EVENT, {
    cancelable: true,
    detail: {
      clientY: presetPromptMouseDrag.lastY,
      prompt: klona(prompt as any),
    },
  });
  target.dispatchEvent(dropEvent);
  return dropEvent.defaultPrevented;
}

function suppressNextPresetPromptClick() {
  suppressPresetPromptClick = true;
  if (suppressPresetPromptClickTimer !== null) window.clearTimeout(suppressPresetPromptClickTimer);
  suppressPresetPromptClickTimer = window.setTimeout(() => {
    suppressPresetPromptClick = false;
    suppressPresetPromptClickTimer = null;
  }, 0);
}

function onPresetPromptClickCapture(event: MouseEvent) {
  if (!suppressPresetPromptClick) return;
  suppressPresetPromptClick = false;
  event.preventDefault();
  event.stopPropagation();
}

function focusPromptToggle(promptKey: string) {
  requestAnimationFrame(() => {
    const selector = `[data-preset-prompt-key="${CSS.escape(promptKey)}"]`;
    panelRoot.value?.querySelector<HTMLButtonElement>(selector)?.focus();
  });
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

function showExternalPromptInsertSpacer(index: number) {
  return !isSortingDrop.value && dropIndex.value === index && !!externalPromptInsertPreview.value;
}

function showPresetPromptReorderSpacer(index: number) {
  return isSortingDrop.value
    && presetPromptMouseDrag.dragging
    && dropIndex.value === index;
}

async function insertDroppedPrompt(prompt: PresetPrompt, index: number) {
  if (!prompt || !prompt.name || isPresetPlaceholderPrompt(prompt)) return false;

  pendingScrollAnchor.value = { key: getPromptKey(prompt), index };
  const inserted = await recordPresetChange(`插入条目: ${prompt.name}`, async () => {
    await store.insertPromptToPreset(normalizePrompt(prompt), props.panelId, index);
  });
  if (!inserted) return false;

  toastr.success(`已插入 "${prompt.name}"`, '操作成功', { timeOut: 2000 });
  return true;
}

function resolvePointerDropIndex(clientY: number) {
  const slots = Array.from(promptListRef.value?.querySelectorAll<HTMLElement>('.prompt-drop-slot') ?? []);
  if (!slots.length) return prompts.value.length;

  for (const slot of slots) {
    const rect = slot.getBoundingClientRect();
    const index = Number(slot.dataset.presetPromptIndex);
    if (Number.isFinite(index) && clientY < rect.top + rect.height / 2) return index;
  }

  return prompts.value.length;
}

function onFavoritePromptDragOver(event: Event) {
  const detail = (event as CustomEvent<{ clientY?: number; prompt?: PresetPrompt }>).detail;
  if (typeof detail?.clientY !== 'number') return;
  const prompt = detail.prompt;
  isDropTarget.value = true;
  isSortingDrop.value = false;
  externalPromptInsertPreview.value = prompt ? normalizePrompt(prompt) : null;
  dropIndex.value = resolvePointerDropIndex(detail.clientY);
}

function onFavoritePromptDragEnd() {
  resetDropState();
}

async function onFavoritePromptDrop(event: Event) {
  const detail = (event as CustomEvent<{ clientY?: number; prompt?: PresetPrompt }>).detail;
  const prompt = detail?.prompt;
  if (!prompt || typeof detail?.clientY !== 'number') {
    resetDropState();
    return;
  }

  event.preventDefault();
  const index = resolvePointerDropIndex(detail.clientY);
  resetDropState();
  await insertDroppedPrompt(prompt, index);
}

function getDragData(e: DragEvent) {
  const raw =
    e.dataTransfer?.getData('application/x-preset-manager-preset')
    || e.dataTransfer?.getData('application/json');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as {
      type?: string;
      source?: string;
      index?: number;
      prompt?: PresetPrompt;
      presetName?: string;
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
  externalPromptInsertPreview.value = null;
}

async function confirmRelation(prompt: PresetPrompt, actionLabel: string) {
  const relation = relationOf(prompt);
  if (relation === 'none') return true;

  const label = getPromptRelationLabel(relation);
  return confirmDialog.confirm({
    title: '确认重复关系',
    message: `${otherPanelLabel.value}中已有${label}条目 "${prompt.name}"，仍要${actionLabel}吗？`,
    confirmLabel: '继续',
  });
}

function resolveDropIndex(e: DragEvent, index: number) {
  const target = e.currentTarget;
  if (!(target instanceof HTMLElement) || index >= prompts.value.length) return index;

  const rect = target.getBoundingClientRect();
  const isAfter = e.clientY > rect.top + rect.height / 2;
  return isAfter ? index + 1 : index;
}

async function moveFocusedPrompt(prompt: PresetPrompt, direction: -1 | 1) {
  if (isPresetPlaceholderPrompt(prompt)) return;
  const promptKey = getPromptKey(prompt);
  const fromIndex = prompts.value.findIndex(item => getPromptKey(item) === promptKey);
  if (fromIndex < 0) return;

  const toIndex = fromIndex + direction;
  if (toIndex < 0 || toIndex >= prompts.value.length) return;

  const moved = await recordPresetChange(`键盘调整顺序: ${prompt.name}`, async () => {
    return store.reorderPromptInPreset(props.panelId, fromIndex, toIndex);
  });
  if (!moved) return;

  focusedPromptKey.value = promptKey;
  dropIndex.value = toIndex;
  isSortingDrop.value = true;
  focusPromptToggle(promptKey);
  window.setTimeout(() => {
    if (focusedPromptKey.value === promptKey) resetDropState();
  }, 900);
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
  const raw =
    e.dataTransfer?.getData('application/x-preset-manager-preset')
    || e.dataTransfer?.getData('application/json');
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    if ((data.type === 'preset' || data.type === 'preset-reorder') && typeof data.presetName === 'string') {
      loadDroppedPreset(data.presetName);
      return;
    }

    const prompt = data.prompt as PresetPrompt;
    if (!prompt || !prompt.name) return;

    if (isPresetPlaceholderPrompt(prompt)) return;

    if (isSamePanelPresetDrag(data)) {
      const moved = await recordPresetChange(`调整顺序: ${prompt.name}`, async () => {
        return false;
      });

      if (moved) toastr.success(`已调整 "${prompt.name}" 的顺序`, '', { timeOut: 1400 });
      return;
    }

    await insertDroppedPrompt(prompt, index);
  } catch (err) {
    console.error('[PresetPanel] Drop error:', err);
  }
}

function loadDroppedPreset(name: string) {
  exitSelectionMode();
  const loaded = props.panelId === 'main'
    ? store.loadMainPreset(name)
    : store.loadSecondPreset(name);
  if (!loaded) return;

  if (props.panelId === 'second') selectedPreset.value = name;
  syncPromptsFromStore();
  history.createSnapshot(name, undefined, true);
  toastr.success(`已打开预设 "${name}"`, '', { timeOut: 1400 });
}

function isPromptLocked(prompt: PresetPrompt) {
  if (isPresetPlaceholderPrompt(prompt)) return false;
  return store.isPromptLocked(getPromptKey(prompt), props.panelId);
}

function togglePromptLock(prompt: PresetPrompt) {
  if (isPresetPlaceholderPrompt(prompt)) return;
  const locked = store.togglePromptLock(getPromptKey(prompt), props.panelId);
  toastr.info(locked ? '条目已锁定' : '条目已解锁', '', { timeOut: 1200 });
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
  if (!await confirmRelation(prompt, `复制到${otherPanelLabel.value}`)) return;

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
  if (!await confirmRelation(prompt, `迁移到${otherPanelLabel.value}`)) return;
  if (!await confirmDialog.confirm({
    title: '迁移条目',
    message: `确定将 "${prompt.name}" 迁移到${otherPanelLabel.value}吗？`,
    details: '原预设中的该条目会被移除。',
    confirmLabel: '迁移',
  })) return;

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
  const ok = await recordPresetChange(`移出列表: ${prompt.name}`, async () => {
    return store.detachPromptFromPreset(getPromptKey(prompt), props.panelId);
  });
  if (ok) {
    selectedPromptKeys.value = selectedPromptKeys.value.filter(key => key !== getPromptKey(prompt));
    if (getPromptKey(zoomPrompt.value) === getPromptKey(prompt)) zoomPrompt.value = null;
    toastr.info('已移出列表，可从未使用条目中重新添加', '', { timeOut: 1600 });
  }
}

async function savePromptEdits(prompt: PresetPrompt, updates: Partial<PresetPrompt>) {
  if (!prompt || isPresetPlaceholderPrompt(prompt)) return;

  const ok = await recordPresetChange(`编辑条目: ${prompt.name}`, async () => {
    await store.updatePromptInPreset(getPromptKey(prompt), updates, props.panelId);
  });
  if (ok) {
    zoomPrompt.value = null;
    toastr.success('条目已保存', '', { timeOut: 1400 });
  }
}

async function restoreSystemPromptDefault(prompt: PresetPrompt) {
  if (!canRestoreDefaultPrompt(prompt)) return;
  if (!await confirmDialog.confirm({
    title: '恢复官方默认',
    message: `确定将 "${prompt.name}" 恢复为官方默认内容吗？`,
    details: '当前启用状态会保留。',
    confirmLabel: '恢复',
  })) return;

  const ok = await recordPresetChange(`恢复默认系统条目: ${prompt.name}`, async () => {
    return store.restoreSystemPromptDefault(getPromptKey(prompt), props.panelId);
  });
  if (ok) {
    selectedPromptKeys.value = selectedPromptKeys.value.filter(key => key !== getPromptKey(prompt));
    if (getPromptKey(zoomPrompt.value) === getPromptKey(prompt)) zoomPrompt.value = null;
    toastr.success('系统条目已恢复默认内容', '', { timeOut: 1400 });
  } else {
    toastr.warning('未找到可恢复的官方默认内容', '', { timeOut: 1600 });
  }
}

async function deletePrompt(prompt: PresetPrompt) {
  if (!canDeletePrompt(prompt)) return;
  if (!await confirmDialog.confirm({
    title: '彻底删除条目',
    message: `确定彻底删除条目 "${prompt.name}" 吗？`,
    details: '系统条目和占位条目不能彻底删除，可以通过撤销恢复。',
    confirmLabel: '删除',
    tone: 'danger',
  })) return;

  const ok = await recordPresetChange(`删除条目: ${prompt.name}`, async () => {
    return store.deletePromptEverywhere(getPromptKey(prompt), props.panelId);
  });
  if (ok) {
    selectedPromptKeys.value = selectedPromptKeys.value.filter(key => key !== getPromptKey(prompt));
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

watch(currentPresetName, name => {
  selectedPreset.value = name;
  exitSelectionMode();
  syncPromptsFromStore();
});

watch(() => props.activePresetName, name => {
  if (!name) {
    selectedPreset.value = '';
    exitSelectionMode();
    syncPromptsFromStore();
    return;
  }

  const loaded = props.panelId === 'main' ? store.loadMainPreset(name) : store.loadSecondPreset(name);
  if (!loaded) return;

  selectedPreset.value = name;
  exitSelectionMode();
  syncPromptsFromStore();
});

function initializeMainPanelFromActivePreset() {
  const activeName = props.activePresetName || (props.panelId === 'main' ? store.presetName : store.secondPresetName);
  if (activeName) {
    const loaded = props.panelId === 'main' ? store.loadMainPreset(activeName) : store.loadSecondPreset(activeName);
    if (!loaded) return;
    selectedPreset.value = activeName;
    syncPromptsFromStore();
    history.createSnapshot(activeName, undefined, true);
  }
}

defineExpose({
  scrollToPromptAnchor,
});

onMounted(() => {
  promptContextMenuTarget.value = panelRoot.value?.closest('.app-root') as HTMLElement | null;
  document.addEventListener('pointerdown', closePromptContextMenuFromPointer, true);
  document.addEventListener('mousedown', closePromptContextMenuFromPointer, true);
  document.addEventListener('click', closePromptContextMenuFromPointer, true);
  window.addEventListener('pointerdown', closePromptContextMenuFromPointer, true);
  parentDocument.addEventListener('pointerdown', closePromptContextMenuFromPointer, true);
  parentDocument.addEventListener('mousedown', closePromptContextMenuFromPointer, true);
  parentDocument.addEventListener('click', closePromptContextMenuFromPointer, true);
  parentDocument.defaultView?.addEventListener('pointerdown', closePromptContextMenuFromPointer, true);
  window.addEventListener('keydown', closePromptContextMenuFromKey, true);
  parentDocument.defaultView?.addEventListener('keydown', closePromptContextMenuFromKey, true);
  document.addEventListener('scroll', closePromptContextMenuOnScroll, true);
  parentDocument.addEventListener('scroll', closePromptContextMenuOnScroll, true);

  try {
    initializeMainPanelFromActivePreset();
  } catch (e) {
    console.error('[PresetManager] PresetPanel mount error:', e);
  }
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', closePromptContextMenuFromPointer, true);
  document.removeEventListener('mousedown', closePromptContextMenuFromPointer, true);
  document.removeEventListener('click', closePromptContextMenuFromPointer, true);
  window.removeEventListener('pointerdown', closePromptContextMenuFromPointer, true);
  parentDocument.removeEventListener('pointerdown', closePromptContextMenuFromPointer, true);
  parentDocument.removeEventListener('mousedown', closePromptContextMenuFromPointer, true);
  parentDocument.removeEventListener('click', closePromptContextMenuFromPointer, true);
  parentDocument.defaultView?.removeEventListener('pointerdown', closePromptContextMenuFromPointer, true);
  window.removeEventListener('keydown', closePromptContextMenuFromKey, true);
  parentDocument.defaultView?.removeEventListener('keydown', closePromptContextMenuFromKey, true);
  document.removeEventListener('scroll', closePromptContextMenuOnScroll, true);
  parentDocument.removeEventListener('scroll', closePromptContextMenuOnScroll, true);
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
  padding: 6px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: background 0.15s ease;
  background: transparent;
}
.preset-panel.main-panel .prompt-list {
  padding-top: 12px;
  padding-bottom: calc(var(--pm-ai-dock-min-height, 93px) + var(--pm-ai-dock-bottom, 18px) + 24px);
}
.bulk-selection-bar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 4px 6px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--pm-bg-elevated) 88%, transparent);
  backdrop-filter: blur(18px) saturate(135%);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
}
.bulk-selection-count {
  flex-shrink: 0;
  padding: 0 5px;
  color: var(--pm-text-subtle);
  font-size: 11.5px;
  font-weight: 500;
  line-height: 1;
}
.bulk-selection-action,
.bulk-selection-clear {
  height: 22px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--pm-text-muted);
  font-size: 11.5px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}
.bulk-selection-action:hover,
.bulk-selection-clear:hover {
  background: var(--pm-btn-hover);
  color: var(--pm-text);
}
.bulk-selection-action.danger {
  color: var(--pm-danger);
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
  z-index: 2;
}
.prompt-drop-slot {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
  align-items: start;
  transition: transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
  will-change: transform;
}
.prompt-drop-slot.selecting {
  grid-template-columns: 22px minmax(0, 1fr);
}
.prompt-drop-slot.dragging {
  pointer-events: none;
}
.prompt-drop-slot.dragging :deep(.prompt-item) {
  display: none;
}
.prompt-drop-slot :deep(.prompt-item) {
  min-width: 0;
}
.preset-prompt-drag-preview {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1300;
  box-sizing: border-box;
  max-width: calc(100vw - 16px);
  padding: 0;
  border-radius: 10px;
  pointer-events: none;
  cursor: grabbing;
  transform: translate3d(var(--preset-prompt-drag-x, 0), var(--preset-prompt-drag-y, 0), 0);
  transform-origin: left top;
  will-change: transform;
}
.preset-prompt-drag-preview :deep(.prompt-item) {
  opacity: 0.86;
  box-shadow: 0 10px 26px color-mix(in srgb, #000 22%, transparent);
  border: 1px solid color-mix(in srgb, var(--pm-text) 18%, transparent);
}
.external-insert-spacer {
  position: relative;
  z-index: 1;
  min-height: 72px;
  margin: 0 0 6px;
  border: 1px dashed color-mix(in srgb, var(--pm-accent) 30%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--pm-accent) 6%, transparent);
  pointer-events: none;
}
.external-insert-spacer.tail {
  margin-top: 6px;
}
.prompt-select-toggle,
.prompt-select-spacer {
  width: 22px;
  height: 22px;
  margin-top: 9px;
  flex: 0 0 22px;
}
.prompt-select-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--pm-border);
  border-radius: 6px;
  background: transparent;
  color: var(--pm-text-faint);
  cursor: pointer;
  opacity: 0.62;
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease, opacity 0.12s ease;
}
.prompt-select-toggle:hover,
.prompt-drop-slot.focused .prompt-select-toggle,
.prompt-select-toggle:focus-visible,
.prompt-select-toggle.selected {
  opacity: 1;
  border-color: var(--pm-border-strong);
  background: var(--pm-btn-hover);
  color: var(--pm-text);
}
.prompt-select-toggle:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--pm-accent) 44%, transparent);
  outline-offset: 2px;
}
.prompt-select-toggle.selected {
  background: var(--pm-control-highlight);
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
.drop-hint {
  position: absolute;
  top: -12px;
  left: 34px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 7px;
  border: 1px solid color-mix(in srgb, var(--pm-accent) 28%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--pm-bg-elevated) 88%, transparent);
  color: var(--pm-text-muted);
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(16px) saturate(135%);
  pointer-events: none;
}
.drop-hint.tail {
  left: 12px;
  top: -8px;
}
.prompt-drop-tail {
  min-height: 2px;
}
.prompt-drop-tail.drop-before::before {
  top: 0;
}
.prompt-context-backdrop {
  position: absolute;
  inset: 0;
  z-index: 939;
  background: transparent;
  cursor: default;
}
.prompt-context-menu {
  position: absolute;
  z-index: 1200;
  width: 168px;
  padding: 4px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--pm-bg-elevated) 94%, transparent);
  box-shadow: var(--pm-menu-shadow, 0 8px 24px rgba(0, 0, 0, 0.28));
  backdrop-filter: var(--pm-menu-backdrop, blur(16px) saturate(150%));
  -webkit-backdrop-filter: var(--pm-menu-backdrop, blur(16px) saturate(150%));
  animation: promptContextPop 0.12s ease-out;
}
.prompt-context-item {
  width: 100%;
  min-height: 30px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
  text-align: left;
  font-size: 13px;
}
.prompt-context-item:hover {
  background: var(--pm-pill-bg-hover);
  color: var(--pm-text);
}
.prompt-context-item:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}
.prompt-context-item:disabled:hover {
  background: transparent;
  color: var(--pm-text-muted);
}
.prompt-context-item.danger {
  color: var(--pm-danger);
}
.prompt-context-item.danger:hover {
  color: var(--pm-danger);
  background: color-mix(in srgb, var(--pm-danger) 14%, transparent);
}
.prompt-context-pop-enter-active,
.prompt-context-pop-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.prompt-context-pop-enter-from,
.prompt-context-pop-leave-to {
  opacity: 0;
  transform: translateY(-2px) scale(0.98);
}
@keyframes promptContextPop {
  from {
    opacity: 0;
    transform: translateY(-2px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
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
.empty-state-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.empty-state-action {
  height: 28px;
  padding: 0 11px;
  border: 0;
  border-radius: 999px;
  background: var(--pm-pill-bg);
  color: var(--pm-text-muted);
  font-size: 12px;
  font-weight: 560;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}
.empty-state-action:hover {
  background: var(--pm-pill-bg-hover);
  color: var(--pm-text);
}
.empty-state-action:disabled {
  cursor: default;
  opacity: 0.45;
}
.empty-state-action:disabled:hover {
  background: var(--pm-pill-bg);
  color: var(--pm-text-muted);
}
.empty-state-action.primary {
  background: var(--pm-control-highlight);
  color: var(--pm-text);
}
</style>
