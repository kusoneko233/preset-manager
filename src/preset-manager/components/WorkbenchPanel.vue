<template>
  <div ref="workbenchRoot" class="workbench-panel">
    <div class="sidebar-section-head">
      <span class="sidebar-section-kicker">新建 / 草稿</span>
      <IconButton name="plus" size="sm" title="新建草稿" @click="store.addDraft()" />
    </div>

    <div class="draft-list">
      <div
        v-for="(draft, i) in drafts"
        :key="draft.id"
      >
        <div
          v-if="draftDropIndex === i && !isDraftDragging(draft)"
          class="draft-drop-indicator"
        />
        <div
        class="draft-item"
        :class="{ expanded: !draft.collapsed, dragging: isDraftDragging(draft), 'drop-target': draftDropIndex === i }"
        :style="getDraftItemStyle(draft, i)"
        :draggable="false"
        @contextmenu.prevent="openDraftContextMenu($event, draft)"
      >
        <div class="draft-row" @mousedown="onDraftMouseDown($event, draft, i)" @click="toggleDraft(draft)">
          <input
            v-if="isDraftNameEditing(draft)"
            class="draft-title-input"
            placeholder="未命名"
            :value="editingDraftName"
            @click.stop
            @pointerdown.stop
            @mousedown.stop
            @dragstart.stop
            @input="editingDraftName = ($event.target as HTMLInputElement).value"
            @keydown.enter.stop.prevent="finishDraftNameEdit(draft)"
            @keydown.escape.stop.prevent="cancelDraftNameEdit"
            @blur="finishDraftNameEdit(draft)"
          />
          <span v-else class="draft-title-text">{{ draft.name || '未命名' }}</span>
          <div class="draft-entry-actions" @click.stop>
            <button
              class="draft-rename-action"
              type="button"
              :title="isDraftNameEditing(draft) ? '完成重命名' : '重命名'"
              @pointerdown.prevent.stop
              @mousedown.prevent.stop
              @click.stop="toggleDraftNameEdit(draft)"
            >
              <Icon :name="isDraftNameEditing(draft) ? 'check' : 'pen-line'" :size="12" />
            </button>
            <button
              class="draft-delete-action draft-entry-action-danger"
              type="button"
              title="删除"
              @pointerdown.prevent.stop
              @mousedown.prevent.stop
              @click.stop="deleteDraftInline(draft)"
            >
              <Icon name="trash-2" :size="12" />
            </button>
          </div>
        </div>

        <div
          v-if="draft.collapsed && draft.content"
          class="draft-preview left-entry-preview"
          role="button"
          tabindex="0"
          @click.stop="toggleDraft(draft)"
          @keydown.enter.stop.prevent="toggleDraft(draft)"
          @keydown.space.stop.prevent="toggleDraft(draft)"
        >
          {{ draft.content }}
        </div>

        <div v-if="!draft.collapsed" class="draft-body">
          <textarea
            class="draft-textarea"
            placeholder="提示词内容..."
            :value="draft.content"
            rows="10"
            @input="store.updateDraft(draft.id, { content: ($event.target as HTMLTextAreaElement).value })"
          ></textarea>
          <div class="draft-meta-row">
            <div class="draft-capsule-wrap">
              <button
                class="draft-role-pill sidebar-entry-pill has-arrow"
                type="button"
                aria-label="草稿角色"
                :aria-expanded="isDraftRoleOpen(draft)"
                @click="toggleDraftRoleMenu(draft)"
              >
                <span>{{ roleLabel(draft.role) }}</span>
                <Icon :name="isDraftRoleOpen(draft) ? 'chevron-up' : 'chevron-down'" :size="11" />
              </button>
              <div v-if="isDraftRoleOpen(draft)" class="draft-capsule-menu" role="menu" aria-label="草稿角色">
                <button
                  v-for="option in ROLE_OPTIONS"
                  :key="option.value"
                  class="draft-capsule-option"
                  :class="{ active: draft.role === option.value }"
                  type="button"
                  role="menuitem"
                  @click="setDraftRole(draft, option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
            <div class="draft-capsule-wrap">
              <button
                class="draft-position-pill sidebar-entry-pill has-arrow"
                type="button"
                aria-label="草稿位置"
                :aria-expanded="isDraftPositionOpen(draft)"
                @click="toggleDraftPositionMenu(draft)"
              >
                <span>{{ positionLabel(draftPositionType(draft)) }}</span>
                <Icon :name="isDraftPositionOpen(draft) ? 'chevron-up' : 'chevron-down'" :size="11" />
              </button>
              <div v-if="isDraftPositionOpen(draft)" class="draft-capsule-menu" role="menu" aria-label="草稿位置">
                <button
                  v-for="option in POSITION_OPTIONS"
                  :key="option.value"
                  class="draft-capsule-option"
                  :class="{ active: draftPositionType(draft) === option.value }"
                  type="button"
                  role="menuitem"
                  @click="setDraftPosition(draft, option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
            <div class="draft-trigger-wrap">
              <button
                class="draft-trigger-summary sidebar-entry-pill"
                type="button"
                :aria-expanded="isDraftTriggerOpen(draft)"
                @click="toggleDraftTriggerPanel(draft)"
              >
                <span>{{ draftTriggerSummary(draft) }}</span>
                <Icon :name="isDraftTriggerOpen(draft) ? 'chevron-up' : 'chevron-down'" :size="11" />
              </button>
              <div v-if="isDraftTriggerOpen(draft)" class="draft-trigger-panel" role="group" aria-label="触发类型">
                <label
                  v-for="option in TRIGGER_OPTIONS"
                  :key="option.value"
                  class="draft-trigger-pill"
                  :class="{ active: draft.injection_trigger.includes(option.value) }"
                >
                  <input
                    class="draft-trigger-checkbox"
                    type="checkbox"
                    :value="option.value"
                    :checked="draft.injection_trigger.includes(option.value)"
                    @change="toggleDraftTrigger(draft, option.value)"
                  />
                  <span>{{ option.label }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      <div v-if="draftDropIndex === drafts.length" class="draft-drag-spacer draft-drop-indicator" />
    </div>

    <div
      v-if="draftDragPreview.visible"
      class="draft-drag-preview preset-drag-preview"
      :class="{ preset: draftDragPreview.mode === 'preset' }"
      :style="draftDragPreview.mode === 'preset' ? draftPresetDragPreviewStyle : draftDragPreviewStyle"
    >
      <template v-if="draftDragPreview.mode === 'sidebar'">
        <span class="draft-title-text">{{ draftDragPreview.name }}</span>
        <div v-if="draftDragPreview.preview" class="draft-preview left-entry-preview">{{ draftDragPreview.preview }}</div>
      </template>
      <PromptItem
        v-else-if="presetPreviewPrompt"
        :prompt="presetPreviewPrompt"
        :preview="true"
      />
    </div>

    <Transition name="sidebar-entry-context-pop">
      <div
        v-if="draftContextMenuOpen"
        ref="draftContextMenuRef"
        class="draft-context-menu sidebar-entry-context-menu"
        :style="{ left: `${draftContextMenu.x}px`, top: `${draftContextMenu.y}px` }"
        @pointerdown.stop
        @mousedown.stop
        @contextmenu.prevent
      >
        <button class="sidebar-entry-context-item" type="button" @click="renameDraftFromContext">
          <Icon name="pen-line" :size="13" />
          <span>重命名</span>
        </button>
        <button class="sidebar-entry-context-item danger" type="button" @click="deleteDraftFromContext">
          <Icon name="trash-2" :size="13" />
          <span>删除</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import Icon from './Icon.vue';
import IconButton from './IconButton.vue';
import PromptItem from './PromptItem.vue';
import { useManagerStore, type DraftPrompt } from '../stores/manager';
import { startParentDrag } from '../utils/drag';

type PromptPositionType = 'relative' | 'in_chat';
type SidebarCapsuleOption<T extends string> = {
  value: T;
  label: string;
};

const INJECTION_POSITION_RELATIVE = 0;
const INJECTION_POSITION_IN_CHAT = 1;
const DEFAULT_DEPTH = 4;
const DEFAULT_ORDER = 100;
const TRIGGER_OPTIONS = [
  { value: 'normal', label: '普通' },
  { value: 'continue', label: '继续' },
  { value: 'impersonate', label: '扮演' },
  { value: 'swipe', label: '换回复' },
  { value: 'regenerate', label: '重新生成' },
  { value: 'quiet', label: '静默' },
] as const;
const ROLE_OPTIONS: SidebarCapsuleOption<DraftPrompt['role']>[] = [
  { value: 'system', label: '系统' },
  { value: 'user', label: '用户' },
  { value: 'assistant', label: 'AI助手' },
];
const POSITION_OPTIONS: SidebarCapsuleOption<PromptPositionType>[] = [
  { value: 'relative', label: '相对位置' },
  { value: 'in_chat', label: '插入聊天' },
];
const DRAFT_DRAG_START_DISTANCE = 4;
const DRAFT_PROMPT_DRAG_OVER_EVENT = 'preset-manager-favorite-dragover';
const DRAFT_PROMPT_DROP_EVENT = 'preset-manager-favorite-drop';
const DRAFT_PROMPT_DRAG_END_EVENT = 'preset-manager-favorite-dragend';

const store = useManagerStore();
const parentDocument = inject<Document>('parentDocument', document);
const iframeElement = inject<HTMLIFrameElement | null>('iframeElement', null);
const localDoc: Document = iframeElement?.contentDocument ?? document;
const drafts = computed(() => store.drafts);
const openDraftTriggerId = ref<string | null>(null);
const openDraftRoleId = ref<string | null>(null);
const openDraftPositionId = ref<string | null>(null);
const workbenchRoot = ref<HTMLElement | null>(null);
const editingDraftId = ref<string | null>(null);
const editingDraftName = ref('');
const draftContextMenuRef = ref<HTMLElement | null>(null);
const draftContextMenuOpen = ref(false);
const draftContextMenu = reactive({
  x: 0,
  y: 0,
  draftId: '',
});
const draftDropIndex = ref<number | null>(null);
const draftMouseDrag = reactive({
  active: false,
  dragging: false,
  draftId: '',
  startIndex: -1,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  width: 0,
  height: 38,
  offsetX: 0,
  offsetY: 0,
});
const draftDragPreview = reactive({
  visible: false,
  draftId: '',
  name: '',
  preview: '',
  mode: 'sidebar' as 'sidebar' | 'preset',
  prompt: null as PresetNormalPrompt | null,
  x: 0,
  y: 0,
  width: 0,
  presetWidth: 0,
});
let suppressDraftClick = false;
let suppressDraftClickTimer: ReturnType<typeof window.setTimeout> | null = null;
let activeDraftPromptDropPanel: HTMLElement | null = null;
const draftDragPreviewStyle = computed(() => ({
  '--draft-drag-x': `${draftDragPreview.x}px`,
  '--draft-drag-y': `${draftDragPreview.y}px`,
  width: draftDragPreview.width ? `${draftDragPreview.width}px` : undefined,
}));
const draftPresetDragPreviewStyle = computed(() => ({
  '--draft-drag-x': `${draftDragPreview.x}px`,
  '--draft-drag-y': `${draftDragPreview.y}px`,
  width: draftDragPreview.presetWidth ? `${draftDragPreview.presetWidth}px` : undefined,
}));
const presetPreviewPrompt = computed(() => draftDragPreview.prompt);
function toggleDraft(draft: DraftPrompt) {
  if (suppressDraftClick) {
    suppressDraftClick = false;
    return;
  }
  if (isDraftNameEditing(draft)) return;
  store.updateDraft(draft.id, { collapsed: !draft.collapsed });
}

function isDraftDragging(draft: DraftPrompt) {
  return draftMouseDrag.dragging && draftMouseDrag.draftId === draft.id;
}

function getDraftItemStyle(draft: DraftPrompt, index: number) {
  if (!draftDragPreview.visible || isDraftDragging(draft)) return {};
  const offset = getDraftReflowOffset(index);
  return offset ? { transform: `translate3d(0, ${offset}px, 0)` } : {};
}

function isDraftNameEditing(draft: DraftPrompt) {
  return editingDraftId.value === draft.id;
}

function startDraftNameEdit(draft: DraftPrompt) {
  editingDraftId.value = draft.id;
  editingDraftName.value = draft.name ?? '';
  nextTick(() => {
    const input = workbenchRoot.value?.querySelector<HTMLInputElement>('.draft-title-input');
    input?.focus();
    input?.select();
  });
}

function finishDraftNameEdit(draft: DraftPrompt) {
  if (!isDraftNameEditing(draft)) return;
  store.updateDraft(draft.id, { name: editingDraftName.value.trim() });
  editingDraftId.value = null;
  editingDraftName.value = '';
}

function cancelDraftNameEdit() {
  editingDraftId.value = null;
  editingDraftName.value = '';
}

function toggleDraftNameEdit(draft: DraftPrompt) {
  if (isDraftNameEditing(draft)) {
    finishDraftNameEdit(draft);
    return;
  }
  startDraftNameEdit(draft);
}

function openDraftContextMenu(event: MouseEvent, draft: DraftPrompt) {
  closeDraftCapsuleMenus();
  draftContextMenu.draftId = draft.id;
  draftContextMenu.x = event.clientX;
  draftContextMenu.y = event.clientY;
  draftContextMenuOpen.value = true;
  nextTick(clampDraftContextMenuPosition);
}

function closeDraftContextMenu(event?: Event) {
  if (event && draftContextMenuRef.value?.contains(event.target as Node)) return;
  draftContextMenuOpen.value = false;
}

function closeDraftCapsuleMenus(event?: Event) {
  const target = event?.target as HTMLElement | null;
  if (target?.closest?.('.draft-capsule-wrap, .draft-trigger-wrap')) return;
  openDraftRoleId.value = null;
  openDraftPositionId.value = null;
  openDraftTriggerId.value = null;
}

function closeDraftPopupMenus(event?: Event) {
  closeDraftContextMenu(event);
  closeDraftCapsuleMenus(event);
}

function closeDraftPopupMenusFromKey(event: KeyboardEvent) {
  if (event.key === 'Escape') closeDraftPopupMenus();
}

function clampDraftContextMenuPosition() {
  const menu = draftContextMenuRef.value;
  if (!menu) return;
  const margin = 8;
  draftContextMenu.x = Math.max(margin, Math.min(draftContextMenu.x, window.innerWidth - menu.offsetWidth - margin));
  draftContextMenu.y = Math.max(margin, Math.min(draftContextMenu.y, window.innerHeight - menu.offsetHeight - margin));
}

function getContextDraft() {
  return store.drafts.find(draft => draft.id === draftContextMenu.draftId);
}

function renameDraftFromContext() {
  const draft = getContextDraft();
  closeDraftContextMenu();
  if (draft) startDraftNameEdit(draft);
}

function deleteDraftFromContext() {
  const draft = getContextDraft();
  closeDraftContextMenu();
  if (draft) store.removeDraft(draft.id);
}

function deleteDraftInline(draft: DraftPrompt) {
  store.removeDraft(draft.id);
}

function draftPositionType(draft: DraftPrompt): PromptPositionType {
  return draft.injection_position === INJECTION_POSITION_IN_CHAT || draft.position?.type === 'in_chat'
    ? 'in_chat'
    : 'relative';
}

function updateDraftPosition(draft: DraftPrompt, positionType: PromptPositionType) {
  const isInChat = positionType === 'in_chat';
  const depth = draft.injection_depth ?? DEFAULT_DEPTH;
  const order = draft.injection_order ?? DEFAULT_ORDER;
  store.updateDraft(draft.id, {
    position: isInChat ? { type: 'in_chat', depth, order } : { type: 'relative' },
    injection_position: isInChat ? INJECTION_POSITION_IN_CHAT : INJECTION_POSITION_RELATIVE,
    injection_depth: depth,
    injection_order: order,
  });
}

function roleLabel(role: DraftPrompt['role']) {
  return ROLE_OPTIONS.find(option => option.value === role)?.label ?? role;
}

function positionLabel(positionType: PromptPositionType) {
  return POSITION_OPTIONS.find(option => option.value === positionType)?.label ?? '相对位置';
}

function isDraftRoleOpen(draft: DraftPrompt) {
  return openDraftRoleId.value === draft.id;
}

function isDraftPositionOpen(draft: DraftPrompt) {
  return openDraftPositionId.value === draft.id;
}

function toggleDraftRoleMenu(draft: DraftPrompt) {
  openDraftPositionId.value = null;
  openDraftTriggerId.value = null;
  openDraftRoleId.value = isDraftRoleOpen(draft) ? null : draft.id;
}

function toggleDraftPositionMenu(draft: DraftPrompt) {
  openDraftRoleId.value = null;
  openDraftTriggerId.value = null;
  openDraftPositionId.value = isDraftPositionOpen(draft) ? null : draft.id;
}

function setDraftRole(draft: DraftPrompt, role: DraftPrompt['role']) {
  store.updateDraft(draft.id, { role });
  openDraftRoleId.value = null;
}

function setDraftPosition(draft: DraftPrompt, positionType: PromptPositionType) {
  updateDraftPosition(draft, positionType);
  openDraftPositionId.value = null;
}

function draftTriggerSummary(draft: DraftPrompt) {
  const count = Array.isArray(draft.injection_trigger) ? draft.injection_trigger.length : 0;
  return count > 0 ? `触发类型 · ${count}` : '触发类型';
}

function isDraftTriggerOpen(draft: DraftPrompt) {
  return openDraftTriggerId.value === draft.id;
}

function toggleDraftTriggerPanel(draft: DraftPrompt) {
  openDraftRoleId.value = null;
  openDraftPositionId.value = null;
  openDraftTriggerId.value = isDraftTriggerOpen(draft) ? null : draft.id;
}

function toggleDraftTrigger(draft: DraftPrompt, trigger: string) {
  const triggers = new Set(Array.isArray(draft.injection_trigger) ? draft.injection_trigger : []);
  if (triggers.has(trigger)) triggers.delete(trigger);
  else triggers.add(trigger);
  store.updateDraft(draft.id, { injection_trigger: [...triggers] });
}

function draftPreviewText(draft: DraftPrompt) {
  return String(draft.content || '').replace(/\s+/g, ' ').trim();
}

function onDraftMouseDown(event: MouseEvent, draft: DraftPrompt, index: number) {
  if (event.button === 2 || isDraftNameEditing(draft)) return;
  if (event.button !== 0) return;

  const target = event.target as HTMLElement | null;
  if (target?.closest('.draft-entry-actions, .draft-body, input, textarea, button, label')) return;

  const row = event.currentTarget as HTMLElement | null;
  const itemElement = row?.closest<HTMLElement>('.draft-item');
  const rect = itemElement?.getBoundingClientRect();
  const point = getDraftLocalPoint(event);
  resetDraftMouseDrag();
  draftMouseDrag.active = true;
  draftMouseDrag.dragging = false;
  draftMouseDrag.draftId = draft.id;
  draftMouseDrag.startIndex = index;
  draftMouseDrag.startX = point.x;
  draftMouseDrag.startY = point.y;
  draftMouseDrag.lastX = point.x;
  draftMouseDrag.lastY = point.y;
  draftMouseDrag.width = Math.max(120, Math.round(rect?.width ?? 0));
  draftMouseDrag.height = Math.max(32, Math.round(rect?.height ?? 38));
  draftMouseDrag.offsetX = Math.max(0, point.x - (rect?.left ?? point.x));
  draftMouseDrag.offsetY = Math.max(0, point.y - (rect?.top ?? point.y));
  startParentDrag(parentDocument, {
    startEvent: event,
    cursor: 'grabbing',
    expectFocusInsideSourceFrame: true,
    onMove: onDraftMouseMove,
    onEnd: finishDraftMouseDrag,
  });
}

function getDraftLocalPoint(event: MouseEvent) {
  // event.target.ownerDocument === localDoc → 事件已处于 iframe 坐标系，直接返回
  if ((event.target as Node | null)?.ownerDocument === localDoc) {
    return { x: event.clientX, y: event.clientY };
  }
  // 事件来自酒馆主页（拖拽遮罩层），需转换为 iframe 本地坐标
  const frameRect = (iframeElement ?? window.frameElement)?.getBoundingClientRect();
  return {
    x: event.clientX - (frameRect?.left ?? 0),
    y: event.clientY - (frameRect?.top ?? 0),
  };
}

function startDraftMouseDrag(x = draftMouseDrag.lastX, y = draftMouseDrag.lastY) {
  if (!draftMouseDrag.active || draftMouseDrag.dragging || draftMouseDrag.startIndex < 0) return;
  const draft = drafts.value[draftMouseDrag.startIndex];
  if (!draft) return;

  draftMouseDrag.dragging = true;
  suppressNextDraftClick();
  draftDragPreview.draftId = draft.id;
  draftDragPreview.name = draft.name || '未命名';
  draftDragPreview.preview = draftPreviewText(draft);
  draftDragPreview.mode = 'sidebar';
  draftDragPreview.prompt = klona(store.draftToPrompt(draft) as any) as PresetNormalPrompt;
  draftDragPreview.width = draftMouseDrag.width;
  draftDragPreview.presetWidth = 0;
  draftDragPreview.visible = true;
  draftDropIndex.value = draftMouseDrag.startIndex;
  closeDraftPopupMenus();
  updateDraftDragFromPoint(x, y);
}

function updateDraftDragPreviewPosition(clientX = draftMouseDrag.lastX, clientY = draftMouseDrag.lastY) {
  if (!draftDragPreview.visible) return;
  draftDragPreview.x = clientX - draftMouseDrag.offsetX;
  draftDragPreview.y = clientY - draftMouseDrag.offsetY;
}

function updateDraftDragFromPoint(clientX: number, clientY: number) {
  const overPresetPanel = dispatchDraftPromptDragOver(clientX, clientY);
  draftDragPreview.mode = overPresetPanel ? 'preset' : 'sidebar';
  draftDropIndex.value = overPresetPanel ? null : resolveDraftMouseDropIndex(clientY);
  requestAnimationFrame(() => updateDraftDragPreviewPosition(clientX, clientY));
}

function onDraftMouseMove(event: MouseEvent) {
  if (!draftMouseDrag.active) return;
  const point = getDraftLocalPoint(event);
  draftMouseDrag.lastX = point.x;
  draftMouseDrag.lastY = point.y;

  if (!draftMouseDrag.dragging) {
    const distance = Math.hypot(point.x - draftMouseDrag.startX, point.y - draftMouseDrag.startY);
    if (distance < DRAFT_DRAG_START_DISTANCE) return;
    startDraftMouseDrag(point.x, point.y);
    return;
  }

  updateDraftDragFromPoint(point.x, point.y);
}

function finishDraftMouseDrag() {
  if (!draftMouseDrag.active) return;
  const sourceId = draftMouseDrag.draftId;
  const targetIndex = draftDropIndex.value ?? draftMouseDrag.startIndex;
  const handledPresetDrop = draftMouseDrag.dragging && dispatchDraftPromptDrop();
  if (draftMouseDrag.dragging && sourceId) {
    if (!handledPresetDrop && isDraftPointerInsideWorkbench()) {
      store.reorderDraftToIndex(sourceId, targetIndex);
    }
    suppressNextDraftClick();
  }
  resetDraftMouseDrag();
}

function resetDraftMouseDrag() {
  draftMouseDrag.active = false;
  draftMouseDrag.dragging = false;
  draftMouseDrag.draftId = '';
  draftMouseDrag.startIndex = -1;
  draftMouseDrag.startX = 0;
  draftMouseDrag.startY = 0;
  draftMouseDrag.lastX = 0;
  draftMouseDrag.lastY = 0;
  draftMouseDrag.width = 0;
  draftMouseDrag.height = 38;
  draftMouseDrag.offsetX = 0;
  draftMouseDrag.offsetY = 0;
  draftDropIndex.value = null;
  clearDraftPromptDragTarget();
  draftDragPreview.visible = false;
  draftDragPreview.draftId = '';
  draftDragPreview.name = '';
  draftDragPreview.preview = '';
  draftDragPreview.mode = 'sidebar';
  draftDragPreview.prompt = null;
  draftDragPreview.width = 0;
  draftDragPreview.presetWidth = 0;
}

function resolveDraftMouseDropIndex(clientY: number) {
  const items = Array.from(workbenchRoot.value?.querySelectorAll<HTMLElement>('.draft-item') ?? []);
  if (!items.length) return drafts.value.length;
  for (const [index, item] of items.entries()) {
    const rect = item.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) return index;
  }
  return items.length;
}

function getDraftPromptDropPanel(clientX = draftMouseDrag.lastX, clientY = draftMouseDrag.lastY) {
  // clientX/Y 是本地 iframe 坐标（由 getDraftLocalPoint 转换）
  // localDoc 是 iframe 内文档，document 是外层酒馆页面
  const hit = localDoc.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('.preset-panel');
  if (hit) return hit;
  for (const panel of Array.from(localDoc.querySelectorAll<HTMLElement>('.preset-panel'))) {
    const rect = panel.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) return panel;
  }
  return null;
}

function dispatchDraftPromptDragOver(clientX: number, clientY: number) {
  const panel = getDraftPromptDropPanel(clientX, clientY);
  if (activeDraftPromptDropPanel && activeDraftPromptDropPanel !== panel) {
    activeDraftPromptDropPanel.dispatchEvent(new CustomEvent(DRAFT_PROMPT_DRAG_END_EVENT, {
      detail: { previewMode: 'sidebar' },
    }));
  }
  activeDraftPromptDropPanel = panel;
  if (!panel) return false;

  const draft = drafts.value[draftMouseDrag.startIndex];
  const panelRect = panel.getBoundingClientRect();
  draftDragPreview.presetWidth = Math.max(160, Math.round(panelRect.width - 28));
  panel.dispatchEvent(new CustomEvent(DRAFT_PROMPT_DRAG_OVER_EVENT, {
    detail: {
      clientY,
      prompt: draft ? klona(store.draftToPrompt(draft) as any) : undefined,
      previewMode: 'preset',
    },
  }));
  return true;
}

function clearDraftPromptDragTarget() {
  if (!activeDraftPromptDropPanel) return;
  activeDraftPromptDropPanel.dispatchEvent(new CustomEvent(DRAFT_PROMPT_DRAG_END_EVENT, {
    detail: { previewMode: 'sidebar' },
  }));
  activeDraftPromptDropPanel = null;
}

function dispatchDraftPromptDrop() {
  const panel = activeDraftPromptDropPanel ?? getDraftPromptDropPanel();
  const draft = drafts.value[draftMouseDrag.startIndex];
  if (!panel || !draft) return false;

  const dropEvent = new CustomEvent(DRAFT_PROMPT_DROP_EVENT, {
    cancelable: true,
    detail: {
      clientY: draftMouseDrag.lastY,
      prompt: klona(store.draftToPrompt(draft) as any),
    },
  });
  panel.dispatchEvent(dropEvent);
  return dropEvent.defaultPrevented;
}

function isDraftPointerInsideWorkbench() {
  const target = localDoc.elementFromPoint(draftMouseDrag.lastX, draftMouseDrag.lastY);
  return Boolean(target && workbenchRoot.value?.contains(target));
}

function suppressNextDraftClick() {
  suppressDraftClick = true;
  if (suppressDraftClickTimer !== null) window.clearTimeout(suppressDraftClickTimer);
  suppressDraftClickTimer = window.setTimeout(() => {
    suppressDraftClick = false;
    suppressDraftClickTimer = null;
  }, 0);
}

function getDraftReflowOffset(index: number) {
  const sourceIndex = draftMouseDrag.startIndex;
  const dropIndex = draftDropIndex.value;
  if (sourceIndex < 0 || dropIndex === null) return 0;

  const rowStep = draftMouseDrag.height;
  if (dropIndex > sourceIndex && index > sourceIndex && index < dropIndex) return -rowStep;
  if (dropIndex < sourceIndex && index >= dropIndex && index < sourceIndex) return rowStep;
  return 0;
}

onMounted(() => {
  document.addEventListener('pointerdown', closeDraftPopupMenus, true);
  document.addEventListener('mousedown', closeDraftPopupMenus, true);
  document.addEventListener('click', closeDraftPopupMenus, true);
  window.addEventListener('keydown', closeDraftPopupMenusFromKey, true);
});

onUnmounted(() => {
  resetDraftMouseDrag();
  if (suppressDraftClickTimer !== null) window.clearTimeout(suppressDraftClickTimer);
  document.removeEventListener('pointerdown', closeDraftPopupMenus, true);
  document.removeEventListener('mousedown', closeDraftPopupMenus, true);
  document.removeEventListener('click', closeDraftPopupMenus, true);
  window.removeEventListener('keydown', closeDraftPopupMenusFromKey, true);
});

</script>

<style scoped>
.workbench-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.sidebar-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 26px;
  padding: 0 0 3px 12px;
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
.draft-list {
  flex: 1;
  overflow-y: auto;
  padding: 2px 0 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.draft-item {
  border-radius: 8px;
  background: transparent;
  cursor: grab;
  transition:
    background 0.12s ease,
    transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
  will-change: transform;
}
.draft-item:not(.expanded) {
  background: var(--pm-control-highlight);
}
.draft-item:not(.expanded):hover {
  background: var(--pm-control-highlight-hover);
}
.draft-item.expanded {
  background: var(--pm-input-bg);
  box-shadow: none;
}
.draft-item.dragging {
  opacity: 0;
  pointer-events: none;
}
.draft-item.drop-target {
  background: transparent;
}
.draft-drag-spacer {
  pointer-events: none;
}
.draft-drop-indicator {
  height: 2px;
  margin: 0 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pm-text) 42%, transparent);
  pointer-events: none;
}
.draft-drag-preview {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1300;
  box-sizing: border-box;
  min-height: 32px;
  max-width: calc(100vw - 16px);
  display: grid;
  align-items: center;
  gap: 3px;
  padding: 5px 8px 6px;
  border: 0;
  border-radius: 8px;
  background: var(--pm-control-highlight-hover);
  color: var(--pm-text);
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  overflow: hidden;
  pointer-events: none;
  cursor: grabbing;
  transform: translate3d(var(--draft-drag-x, 0), var(--draft-drag-y, 0), 0);
  transform-origin: left top;
  will-change: transform;
}
.draft-drag-preview .draft-title-text {
  width: 100%;
}
.draft-drag-preview .draft-preview {
  margin-bottom: 7px;
}
.draft-drag-preview.preset {
  padding: 0;
  background: transparent;
  border-radius: 10px;
}
.draft-drag-preview.preset :deep(.prompt-item) {
  opacity: 0.86;
  box-shadow: 0 10px 26px color-mix(in srgb, #000 22%, transparent);
  border: 1px solid color-mix(in srgb, var(--pm-text) 18%, transparent);
}
.draft-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 5px 8px;
  cursor: pointer;
}
.draft-title-text {
  flex: 1;
  min-width: 0;
  height: 22px;
  display: inline-flex;
  align-items: center;
  padding: 0 5px;
  color: var(--pm-text);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.005em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.draft-title-input {
  flex: 1;
  min-width: 0;
  height: 22px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--pm-text);
  padding: 0 5px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.005em;
  outline: none;
  transition: border-color 0.12s ease, background 0.12s ease;
}
.draft-title-input:hover {
  background: var(--pm-input-bg);
}
.draft-title-input:focus {
  border-color: var(--pm-border-strong);
  background: var(--pm-input-bg);
}
.draft-title-input::placeholder {
  color: var(--pm-text);
  opacity: 1;
}
.draft-entry-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
  opacity: 0.64;
  transition: opacity 0.12s ease;
}
.draft-row:hover .draft-entry-actions,
.draft-row:focus-within .draft-entry-actions {
  opacity: 1;
}
.left-entry-preview {
  display: -webkit-box;
  margin: -2px 35px 4px 13px;
  color: color-mix(in srgb, var(--pm-text) 66%, transparent);
  font-size: 12px;
  line-height: 1.45;
  word-break: break-all;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  cursor: pointer;
}
.draft-rename-action {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--pm-text-subtle);
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, opacity 0.12s ease;
}
.draft-delete-action {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--pm-text-subtle);
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, opacity 0.12s ease;
}
.draft-rename-action:hover,
.draft-rename-action:focus-visible,
.draft-delete-action:hover,
.draft-delete-action:focus-visible {
  background: var(--pm-pill-bg-hover);
  color: var(--pm-text);
  outline: none;
}
.draft-entry-action-danger:hover,
.draft-entry-action-danger:focus-visible {
  background: color-mix(in srgb, var(--pm-danger) 14%, transparent);
  color: var(--pm-danger);
}
.draft-body {
  padding: 3px 4px 9px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.draft-meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 22px;
  overflow: visible;
}
.sidebar-entry-pill {
  flex: 0 0 auto;
  width: fit-content;
  max-width: max-content;
  min-width: 0;
  height: 22px;
  padding: 0 8px;
  border: 0;
  border-radius: 999px;
  background: var(--pm-pill-bg);
  color: var(--pm-text);
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
  outline: none;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}
.sidebar-entry-pill.has-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.sidebar-entry-pill:hover,
.sidebar-entry-pill.active {
  background: var(--pm-pill-bg-hover);
}
.draft-trigger-summary {
  width: 88px;
  flex: 0 0 88px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.draft-capsule-wrap {
  position: relative;
  flex: 0 0 auto;
}
.draft-capsule-menu {
  position: absolute;
  left: 0;
  top: calc(100% + 5px);
  z-index: 80;
  min-width: max-content;
  padding: 4px;
  border-radius: 8px;
  background: var(--pm-left-entry-editor-bg);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(32px) saturate(140%);
  -webkit-backdrop-filter: blur(32px) saturate(140%);
}
.draft-capsule-option {
  width: 100%;
  min-height: 24px;
  padding: 0 9px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--pm-text-muted);
  font-size: 11px;
  line-height: 1;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}
.draft-capsule-option:hover,
.draft-capsule-option.active {
  background: var(--pm-pill-bg-hover);
  color: var(--pm-text);
}
.draft-trigger-wrap {
  position: relative;
  flex: 0 0 auto;
}
.draft-trigger-panel {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 180;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  min-width: 154px;
  max-width: 220px;
  padding: 7px;
  border-radius: 8px;
  background: var(--pm-left-entry-editor-bg);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(32px) saturate(140%);
  -webkit-backdrop-filter: blur(32px) saturate(140%);
}
.sidebar-entry-context-menu {
  position: fixed;
  z-index: 1220;
  min-width: 136px;
  padding: 4px;
  border: 0;
  border-radius: 8px;
  background: color-mix(in srgb, var(--pm-bg-elevated) 94%, #000);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.3);
}
.sidebar-entry-context-item {
  width: 100%;
  min-height: 29px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 9px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
  font-size: 12px;
  text-align: left;
}
.sidebar-entry-context-item:hover {
  background: var(--pm-pill-bg-hover);
  color: var(--pm-text);
}
.sidebar-entry-context-item.danger {
  color: var(--pm-danger);
}
.sidebar-entry-context-item.danger:hover {
  background: color-mix(in srgb, var(--pm-danger) 14%, transparent);
}
.sidebar-entry-context-pop-enter-active,
.sidebar-entry-context-pop-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.sidebar-entry-context-pop-enter-from,
.sidebar-entry-context-pop-leave-to {
  opacity: 0;
  transform: translateY(-2px) scale(0.98);
}
.draft-trigger-pill {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--pm-pill-bg);
  color: var(--pm-text-subtle);
  font-size: 11px;
  cursor: pointer;
}
.draft-trigger-pill.active {
  color: var(--pm-text);
  background: var(--pm-pill-bg-hover);
}
.draft-trigger-checkbox {
  display: none;
}
.draft-textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 178px;
  padding: 10px 11px;
  border: 0;
  border-radius: 7px;
  background: var(--pm-left-entry-editor-bg);
  color: var(--pm-text);
  font-size: 12px;
  font-family: inherit;
  line-height: 1.55;
  resize: vertical;
  outline: none;
}
</style>
