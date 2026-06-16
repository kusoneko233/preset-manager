<template>
  <div ref="sidebarRoot" class="sidebar-preset-list">
    <div class="sidebar-section-head">
      <span class="sidebar-section-kicker">预设</span>
      <div class="sidebar-section-actions">
        <button
          class="sidebar-section-import"
          type="button"
          title="导入预设"
          aria-label="导入预设"
          @click.stop="importPreset"
        >
          <Icon name="upload" :size="13" />
        </button>
        <button
          class="sidebar-section-create"
          type="button"
          title="新建预设"
          aria-label="新建预设"
          @click.stop="createPreset"
        >
          <Icon name="plus" :size="13" />
        </button>
      </div>
    </div>

    <div class="preset-list" @contextmenu.prevent.stop="openEmptyPresetContextMenu($event)">
      <div
        v-for="(name, i) in presetNames"
        :key="name"
        class="preset-list-row"
      >
        <div
          v-if="presetDropIndex === i && name !== draggedPresetName"
          class="preset-drop-indicator"
        />
        <button
          class="sidebar-preset-item"
          :class="getPresetItemClass(name, i)"
          :style="getPresetItemStyle(name, i)"
          :data-preset-name="name"
          :draggable="false"
          :title="name"
          type="button"
          @mousedown="onPresetMouseDown($event, name)"
          @click.prevent.stop="selectPresetFromClick($event, name)"
          @mousedown.right.prevent.stop
          @contextmenu.prevent.stop="openPresetContextMenu($event, name)"
        >
          <Icon name="folder" :size="13" class="preset-icon" />
          <span class="preset-name">{{ name }}</span>
        </button>
        <div v-if="name === draggedPresetName" class="preset-drag-spacer" />
      </div>
      <div
        v-if="presetDropIndex === presetNames.length"
        class="preset-drop-indicator preset-drop-indicator-tail"
      />

      <div v-if="presetNames.length === 0" class="empty-hint">
        <Icon name="folder" :size="14" />
        <span>暂无可用预设</span>
      </div>
    </div>

    <div
      v-if="dragPreview.visible"
      class="preset-drag-preview"
      :class="{ active: dragPreview.name === activePresetName }"
      :style="dragPreviewStyle"
    >
      <Icon name="folder" :size="13" class="preset-icon" />
      <span class="preset-name">{{ dragPreview.name }}</span>
    </div>

    <Teleport v-if="contextMenuTarget" :to="contextMenuTarget">
      <Transition name="preset-context-pop">
        <div
          v-if="contextMenuOpen"
          ref="contextMenuRef"
          class="preset-context-menu"
          :style="{ left: `${contextMenuPosition.x}px`, top: `${contextMenuPosition.y}px` }"
          @pointerdown.stop
          @mousedown.stop
          @contextmenu.prevent
        >
          <template v-if="contextMenuKind === 'preset'">
            <button class="preset-context-item" @click="runPresetAction('openSecondPreset', $event)">
              <Icon name="external-link" :size="14" />
              <span>在侧边栏打开</span>
            </button>
            <button class="preset-context-item" @click="runPresetAction('renamePreset', $event)">
              <Icon name="pen-line" :size="14" />
              <span>重命名预设</span>
            </button>
            <button class="preset-context-item danger" @click="runPresetAction('deletePreset', $event)">
              <Icon name="trash-2" :size="14" />
              <span>删除预设</span>
            </button>
          </template>
          <template v-else>
            <button class="preset-context-item" @click="runPresetAction('importPreset', $event)">
              <Icon name="upload" :size="14" />
              <span>导入预设</span>
            </button>
            <button class="preset-context-item" @click="runPresetAction('createPreset', $event)">
              <Icon name="plus" :size="14" />
              <span>新建预设</span>
            </button>
          </template>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import Icon from './Icon.vue';
import { useManagerStore } from '../stores/manager';
import type { ConfirmAnchor } from '../stores/confirm';
import { startParentDrag } from '../utils/drag';

export type SidebarPresetAction = 'createPreset' | 'importPreset' | 'openSecondPreset' | 'renamePreset' | 'deletePreset';

export interface SidebarPresetActionPayload {
  action: SidebarPresetAction;
  presetName: string;
  anchor?: ConfirmAnchor;
}

const store = useManagerStore();

const props = defineProps<{
  activePresetName: string;
}>();

const emit = defineEmits<{
  'select-preset': [name: string];
  'preset-action': [payload: SidebarPresetActionPayload];
}>();

const presetNames = computed(() => store.presetNames);
const sidebarRoot = ref<HTMLElement>();
const contextMenuTarget = ref<HTMLElement | null>(null);
const contextMenuOpen = ref(false);
const contextPresetName = ref('');
const contextMenuKind = ref<'preset' | 'empty'>('preset');
const contextMenuRef = ref<HTMLElement>();
const contextMenuPosition = reactive({ x: 0, y: 0 });
const parentDocument = inject<Document>('parentDocument', document);
const iframeEl = inject<HTMLIFrameElement>('iframeElement')!;
const PRESET_DRAG_START_DISTANCE = 4;
const draggedPresetName = ref('');
const dragOverPresetName = ref('');
const presetDropIndex = ref<number | null>(null);
const presetDragPointer = reactive({ x: 0, y: 0 });
const presetMouseDrag = reactive({
  active: false,
  dragging: false,
  name: '',
  startIndex: -1,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  width: 0,
  offsetX: 0,
  offsetY: 0,
  originX: 0,
});
const dragPreview = reactive({
  visible: false,
  name: '',
  x: 0,
  y: 0,
  width: 0,
});
let suppressPresetClick = false;
let suppressPresetClickTimer: ReturnType<typeof window.setTimeout> | null = null;
const dragPreviewStyle = computed(() => ({
  '--preset-drag-x': `${dragPreview.x}px`,
  '--preset-drag-y': `${dragPreview.y}px`,
  width: dragPreview.width ? `${dragPreview.width}px` : undefined,
}));

function openPreset(name: string) {
  if (!name || name === props.activePresetName) return;
  emit('select-preset', name);
}

function getPresetItemClass(name: string, index: number) {
  return {
    active: name === props.activePresetName,
    secondary: name === store.secondPresetName,
    dragging: name === draggedPresetName.value,
    'drop-target': presetDropIndex.value === index && name !== draggedPresetName.value,
  };
}

function getPresetItemStyle(name: string, index: number) {
  if (!draggedPresetName.value || name === draggedPresetName.value) return {};
  const offset = getPresetReflowOffset(name, index);
  return offset ? { transform: `translate3d(0, ${offset}px, 0)` } : {};
}

function openPresetContextMenu(event: MouseEvent, name: string) {
  if (!name) return;
  event.preventDefault();
  event.stopPropagation();
  contextMenuTarget.value = sidebarRoot.value?.closest('.app-root') as HTMLElement | null;
  contextMenuKind.value = 'preset';
  contextPresetName.value = name;
  Object.assign(contextMenuPosition, getContextMenuPosition(event));
  contextMenuOpen.value = true;
  nextTick(clampContextMenuPosition);
}

function openEmptyPresetContextMenu(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (target?.closest?.('.sidebar-preset-item, .preset-context-menu')) return;
  event.preventDefault();
  event.stopPropagation();
  contextMenuTarget.value = sidebarRoot.value?.closest('.app-root') as HTMLElement | null;
  contextMenuKind.value = 'empty';
  contextPresetName.value = props.activePresetName;
  Object.assign(contextMenuPosition, getContextMenuPosition(event));
  contextMenuOpen.value = true;
  nextTick(clampContextMenuPosition);
}

function onPresetMouseDown(event: MouseEvent, name: string) {
  if (event.button === 2) {
    event.preventDefault();
    event.stopPropagation();
    cancelPresetMouseDrag();
    return;
  }
  if (event.button !== 0 || !name) return;

  const target = event.currentTarget as HTMLElement | null;
  const rect = target?.getBoundingClientRect();
  const point = getPresetLocalPoint(event);
  cancelPresetMouseDrag();
  presetMouseDrag.active = true;
  presetMouseDrag.dragging = false;
  presetMouseDrag.name = name;
  presetMouseDrag.startIndex = presetNames.value.indexOf(name);
  presetMouseDrag.startX = point.x;
  presetMouseDrag.startY = point.y;
  presetMouseDrag.lastX = point.x;
  presetMouseDrag.lastY = point.y;
  presetMouseDrag.width = Math.max(120, Math.round(rect?.width ?? 0));
  presetMouseDrag.offsetX = Math.max(0, point.x - (rect?.left ?? point.x));
  presetMouseDrag.offsetY = Math.max(0, point.y - (rect?.top ?? point.y));
  presetMouseDrag.originX = Math.round(rect?.left ?? (point.x - presetMouseDrag.offsetX));
  startParentDrag(parentDocument, {
    startEvent: event,
    cursor: 'grabbing',
    expectFocusInsideSourceFrame: true,
    onMove: onPresetMouseMove,
    onEnd: finishPresetMouseDrag,
  });
}

function selectPresetFromClick(event: MouseEvent, name: string) {
  event.preventDefault();
  event.stopPropagation();
  if (suppressPresetClick) {
    suppressPresetClick = false;
    return;
  }
  closePresetContextMenu();
  openPreset(name);
}

function clampContextMenuPosition() {
  const menu = contextMenuRef.value;
  if (!menu) return;

  const margin = 8;
  const bounds = contextMenuTarget.value?.getBoundingClientRect();
  const maxX = (bounds?.width ?? window.innerWidth) - menu.offsetWidth - margin;
  const maxY = (bounds?.height ?? window.innerHeight) - menu.offsetHeight - margin;
  contextMenuPosition.x = Math.max(margin, Math.min(contextMenuPosition.x, maxX));
  contextMenuPosition.y = Math.max(margin, Math.min(contextMenuPosition.y, maxY));
}

function getContextMenuPosition(event: MouseEvent) {
  const targetRect = contextMenuTarget.value?.getBoundingClientRect();
  return {
    x: event.clientX - (targetRect?.left ?? 0),
    y: event.clientY - (targetRect?.top ?? 0),
  };
}

function closePresetContextMenu(event?: Event) {
  if (event && contextMenuRef.value?.contains(event.target as Node)) return;
  contextMenuOpen.value = false;
}

function closePresetContextMenuFromPointer(event: Event) {
  const target = event.target as Node | null;
  if (target && contextMenuRef.value?.contains(target)) return;
  closePresetContextMenu();
}

function closePresetContextMenuFromKey(event: KeyboardEvent) {
  if (event.key === 'Escape') closePresetContextMenu();
}

function closePresetContextMenuOnScroll() {
  closePresetContextMenu();
}

function createPreset() {
  closePresetContextMenu();
  emit('preset-action', { action: 'createPreset', presetName: props.activePresetName });
}

function importPreset() {
  closePresetContextMenu();
  emit('preset-action', { action: 'importPreset', presetName: props.activePresetName });
}

function getPresetContextActionAnchor(action: SidebarPresetAction, event?: MouseEvent): ConfirmAnchor | undefined {
  if (action !== 'deletePreset') return undefined;
  const target = event?.currentTarget as HTMLElement | null;
  const rect = target?.getBoundingClientRect();
  return rect
    ? { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
    : { x: contextMenuPosition.x, y: contextMenuPosition.y };
}

function runPresetAction(action: SidebarPresetAction, event?: MouseEvent) {
  if (!contextPresetName.value && action !== 'createPreset' && action !== 'importPreset') return;
  contextMenuOpen.value = false;
  emit('preset-action', {
    action,
    presetName: contextPresetName.value,
    anchor: getPresetContextActionAnchor(action, event),
  });
}

function updatePresetDragPreviewPosition(clientX = presetDragPointer.x, clientY = presetDragPointer.y) {
  dragPreview.x = presetMouseDrag.originX;
  dragPreview.y = clientY - presetMouseDrag.offsetY;
}

function updatePresetDragFromPoint(clientX: number, clientY: number) {
  presetDragPointer.x = clientX;
  presetDragPointer.y = clientY;
  presetDropIndex.value = resolvePresetMouseDropIndex(clientY);
  const names = presetNames.value;
  dragOverPresetName.value = names[Math.min(presetDropIndex.value, names.length - 1)] ?? '';
  requestAnimationFrame(() => updatePresetDragPreviewPosition(clientX, clientY));
}

function getPresetLocalPoint(event: MouseEvent) {
  if (event.view === window || (event.target as Node | null)?.ownerDocument === document) {
    return { x: event.clientX, y: event.clientY };
  }
  const frameRect = window.frameElement?.getBoundingClientRect();
  return {
    x: event.clientX - (frameRect?.left ?? 0),
    y: event.clientY - (frameRect?.top ?? 0),
  };
}

function startPresetMouseDrag(x = presetMouseDrag.lastX, y = presetMouseDrag.lastY) {
  if (!presetMouseDrag.active || presetMouseDrag.dragging || presetMouseDrag.startIndex < 0) return;
  presetMouseDrag.dragging = true;
  suppressNextPresetClick();
  draggedPresetName.value = presetMouseDrag.name;
  dragOverPresetName.value = '';
  presetDropIndex.value = presetMouseDrag.startIndex;
  closePresetContextMenu();
  dragPreview.name = presetMouseDrag.name;
  dragPreview.width = presetMouseDrag.width;
  dragPreview.visible = true;
  updatePresetDragFromPoint(x, y);
}

function onPresetMouseMove(event: MouseEvent) {
  if (!presetMouseDrag.active) return;
  const point = getPresetLocalPoint(event);
  presetMouseDrag.lastX = point.x;
  presetMouseDrag.lastY = point.y;
  if (!presetMouseDrag.dragging) {
    const distance = Math.hypot(point.x - presetMouseDrag.startX, point.y - presetMouseDrag.startY);
    if (distance < PRESET_DRAG_START_DISTANCE) return;
    startPresetMouseDrag(point.x, point.y);
  } else {
    updatePresetDragFromPoint(point.x, point.y);
  }
}

function finishPresetMouseDrag() {
  if (!presetMouseDrag.active) return;
  const wasDragging = presetMouseDrag.dragging;
  const sourceName = presetMouseDrag.name;
  const targetIndex = presetDropIndex.value ?? presetMouseDrag.startIndex;
  if (wasDragging && sourceName) {
    store.reorderPresetDisplayToIndex(sourceName, targetIndex);
    suppressNextPresetClick();
  }
  resetPresetMouseDrag();
}

function cancelPresetMouseDrag() {
  if (!presetMouseDrag.active && !presetMouseDrag.dragging) return;
  resetPresetMouseDrag();
}

function shouldIgnorePresetBlur(event: Event) {
  if (event.currentTarget === window) return true;
  if (event.currentTarget !== parentDocument.defaultView) return false;
  const frame = window.frameElement;
  return Boolean(frame && frame.ownerDocument === parentDocument && parentDocument.activeElement === frame);
}

function cancelPresetMouseDragFromBlur(event: Event) {
  if (shouldIgnorePresetBlur(event)) return;
  cancelPresetMouseDrag();
}

function resetPresetMouseDrag() {
  presetMouseDrag.active = false;
  presetMouseDrag.dragging = false;
  presetMouseDrag.name = '';
  presetMouseDrag.startIndex = -1;
  presetMouseDrag.startX = 0;
  presetMouseDrag.startY = 0;
  presetMouseDrag.lastX = 0;
  presetMouseDrag.lastY = 0;
  presetMouseDrag.width = 0;
  presetMouseDrag.offsetX = 0;
  presetMouseDrag.offsetY = 0;
  presetMouseDrag.originX = 0;
  draggedPresetName.value = '';
  dragOverPresetName.value = '';
  presetDropIndex.value = null;
  dragPreview.visible = false;
  dragPreview.name = '';
  dragPreview.width = 0;
}

function resolvePresetMouseDropIndex(clientY: number) {
  const items = Array.from(sidebarRoot.value?.querySelectorAll<HTMLElement>('.sidebar-preset-item') ?? []);
  if (!items.length) return presetNames.value.length;
  for (const [index, item] of items.entries()) {
    const rect = item.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) return index;
  }
  return items.length;
}

function suppressNextPresetClick() {
  suppressPresetClick = true;
  if (suppressPresetClickTimer !== null) window.clearTimeout(suppressPresetClickTimer);
  suppressPresetClickTimer = window.setTimeout(() => {
    suppressPresetClick = false;
    suppressPresetClickTimer = null;
  }, 0);
}

function getPresetReflowOffset(name: string, index: number) {
  const sourceIndex = presetNames.value.indexOf(draggedPresetName.value);
  const dropIndex = presetDropIndex.value;
  if (sourceIndex < 0 || dropIndex === null || name === draggedPresetName.value) return 0;

  const rowStep = 34;
  if (dropIndex > sourceIndex && index > sourceIndex && index < dropIndex) return -rowStep;
  if (dropIndex < sourceIndex && index >= dropIndex && index < sourceIndex) return rowStep;
  return 0;
}

function getPanelDocument() {
  return iframeEl.contentDocument ?? document;
}

onMounted(() => {
  contextMenuTarget.value = sidebarRoot.value?.closest('.app-root') as HTMLElement | null;
  getPanelDocument().addEventListener('pointerdown', closePresetContextMenuFromPointer, true);
  getPanelDocument().addEventListener('mousedown', closePresetContextMenuFromPointer, true);
  getPanelDocument().addEventListener('click', closePresetContextMenuFromPointer, true);
  getPanelDocument().defaultView?.addEventListener('pointerdown', closePresetContextMenuFromPointer, true);
  window.addEventListener('blur', cancelPresetMouseDragFromBlur, true);
  parentDocument.addEventListener('pointerdown', closePresetContextMenuFromPointer, true);
  parentDocument.addEventListener('mousedown', closePresetContextMenuFromPointer, true);
  parentDocument.addEventListener('click', closePresetContextMenuFromPointer, true);
  parentDocument.defaultView?.addEventListener('pointerdown', closePresetContextMenuFromPointer, true);
  parentDocument.defaultView?.addEventListener('blur', cancelPresetMouseDragFromBlur, true);
  getPanelDocument().defaultView?.addEventListener('keydown', closePresetContextMenuFromKey, true);
  parentDocument.defaultView?.addEventListener('keydown', closePresetContextMenuFromKey, true);
  getPanelDocument().addEventListener('scroll', closePresetContextMenuOnScroll, true);
  parentDocument.addEventListener('scroll', closePresetContextMenuOnScroll, true);
});

onUnmounted(() => {
  cancelPresetMouseDrag();
  if (suppressPresetClickTimer !== null) window.clearTimeout(suppressPresetClickTimer);
  getPanelDocument().removeEventListener('pointerdown', closePresetContextMenuFromPointer, true);
  getPanelDocument().removeEventListener('mousedown', closePresetContextMenuFromPointer, true);
  getPanelDocument().removeEventListener('click', closePresetContextMenuFromPointer, true);
  getPanelDocument().defaultView?.removeEventListener('pointerdown', closePresetContextMenuFromPointer, true);
  window.removeEventListener('blur', cancelPresetMouseDragFromBlur, true);
  parentDocument.removeEventListener('pointerdown', closePresetContextMenuFromPointer, true);
  parentDocument.removeEventListener('mousedown', closePresetContextMenuFromPointer, true);
  parentDocument.removeEventListener('click', closePresetContextMenuFromPointer, true);
  parentDocument.defaultView?.removeEventListener('pointerdown', closePresetContextMenuFromPointer, true);
  parentDocument.defaultView?.removeEventListener('blur', cancelPresetMouseDragFromBlur, true);
  getPanelDocument().defaultView?.removeEventListener('keydown', closePresetContextMenuFromKey, true);
  parentDocument.defaultView?.removeEventListener('keydown', closePresetContextMenuFromKey, true);
  getPanelDocument().removeEventListener('scroll', closePresetContextMenuOnScroll, true);
  parentDocument.removeEventListener('scroll', closePresetContextMenuOnScroll, true);
});
</script>

<style scoped>
.sidebar-preset-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.sidebar-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
  padding: 4px 4px 6px;
}
.sidebar-section-kicker {
  display: inline-flex;
  align-items: center;
  color: var(--pm-text-subtle);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
}
.sidebar-section-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.sidebar-section-import,
.sidebar-section-create {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--pm-text-subtle);
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease;
}
.sidebar-section-import:hover,
.sidebar-section-import:focus-visible,
.sidebar-section-create:hover,
.sidebar-section-create:focus-visible {
  outline: none;
  background: var(--pm-row-hover);
  color: var(--pm-text);
}
.preset-list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  padding: 2px 0 6px;
}
.preset-list-row {
  display: contents;
}
.sidebar-preset-item {
  width: 100%;
  min-height: 32px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--pm-text);
  cursor: grab;
  text-align: left;
  touch-action: none;
  user-select: none;
  transition:
    background 0.12s ease,
    color 0.12s ease,
    opacity 0.14s ease,
    transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
  will-change: transform;
}
.sidebar-preset-item:hover {
  background: var(--pm-row-hover);
  color: var(--pm-text);
}
.sidebar-preset-item.active {
  background: var(--pm-row-active);
  color: var(--pm-text);
}
.sidebar-preset-item.dragging {
  opacity: 0;
  transform: none;
  cursor: grabbing;
  pointer-events: none;
}
.sidebar-preset-item.drop-target {
  background: transparent;
}
.preset-drag-spacer {
  height: 0;
  pointer-events: none;
}
.preset-drop-indicator {
  height: 2px;
  margin: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pm-text) 42%, transparent);
  pointer-events: none;
}
.preset-drop-indicator-tail {
  flex: 0 0 2px;
}
.preset-drag-preview {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1300;
  box-sizing: border-box;
  min-height: 32px;
  max-width: calc(100vw - 16px);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 0;
  border-radius: 8px;
  background: var(--pm-row-hover);
  color: var(--pm-text);
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  overflow: hidden;
  pointer-events: none;
  cursor: grabbing;
  transform: translate3d(var(--preset-drag-x, 0), var(--preset-drag-y, 0), 0);
  transform-origin: left top;
  will-change: transform;
}
.preset-drag-preview.active {
  background: var(--pm-row-hover);
}
.preset-icon {
  flex: 0 0 auto;
  color: var(--pm-text);
}
.preset-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: inherit;
  font-size: 13px;
  font-weight: 520;
  letter-spacing: -0.005em;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.empty-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 8px;
  color: var(--pm-text-faint);
  font-size: 12px;
}
.preset-context-menu {
  position: absolute;
  z-index: 1200;
  width: 172px;
  padding: 3px;
  border: 0;
  border-radius: 8px;
  background: color-mix(in srgb, #000 72%, var(--pm-bg-elevated));
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.32);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  animation: presetContextPop 0.12s ease-out;
}
.preset-context-item {
  width: 100%;
  min-height: 28px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
  text-align: left;
  font-size: 13px;
}
.preset-context-item:hover {
  background: var(--pm-pill-bg-hover);
  color: var(--pm-text);
}
.preset-context-item.danger {
  color: var(--pm-danger);
}
.preset-context-item.danger:hover {
  color: var(--pm-danger);
  background: color-mix(in srgb, var(--pm-danger) 14%, transparent);
}
.preset-context-divider {
  height: 1px;
  margin: 5px 8px;
  background: var(--pm-divider);
}
.preset-context-pop-enter-active,
.preset-context-pop-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.preset-context-pop-enter-from,
.preset-context-pop-leave-to {
  opacity: 0;
  transform: translateY(-2px) scale(0.98);
}
@keyframes presetContextPop {
  from {
    opacity: 0;
    transform: translateY(-2px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
