<template>
  <div
    ref="favoriteFolderRoot"
    class="favorite-folder"
    :data-folder-id="folder.id"
    :class="{ 'drag-over': isDragOver || dragActive }"
    @dragenter.prevent.stop="onFolderDragEnter"
    @dragover.prevent.stop="onFolderDragOver"
    @dragleave="onFolderDragLeave"
    @drop.prevent.stop="onFolderDrop"
  >
    <div class="folder-row" @click="store.toggleFavoriteFolder(folder.id)">
      <Icon :name="folder.collapsed ? 'chevron-right' : 'chevron-down'" :size="12" class="folder-chevron" />

      <template v-if="isEditing">
        <input
          ref="nameInput"
          v-model="editName"
          class="folder-name-input"
          @keydown.enter="finishEdit"
          @keydown.escape="cancelEdit"
          @blur="finishEdit"
          @click.stop
        />
      </template>
      <span v-else class="folder-name">{{ folder.name }}</span>

      <div class="folder-actions" @click.stop>
        <button
          class="folder-action"
          :title="isEditing ? '完成重命名' : '重命名'"
          @pointerdown.prevent
          @mousedown.prevent
          @click="toggleFolderNameEdit"
        >
          <Icon :name="isEditing ? 'check' : 'pen-line'" :size="12" />
        </button>
        <button class="folder-action folder-action-danger" title="删除文件夹" @click="$emit('delete')">
          <Icon name="trash-2" :size="12" />
        </button>
      </div>
    </div>

    <div v-if="!folder.collapsed" class="folder-items">
      <div v-if="!folder.items.length" class="empty-folder">拖拽条目到此处</div>
      <div
        v-for="(item, i) in folder.items"
        :key="favoriteKey(item, i)"
        class="fav-item-wrap"
      >
        <div
          v-if="favoriteDropIndex === i && !isFavoriteDragging(item, i)"
          class="fav-drop-indicator"
        />
        <div
        class="fav-item"
        :class="{ expanded: isFavoriteExpanded(item, i), dragging: isFavoriteDragging(item, i), 'drop-target': favoriteDropIndex === i }"
        :style="getFavoriteItemStyle(item, i)"
        :draggable="false"
        @contextmenu.prevent="openFavoriteContextMenu($event, item, i)"
        @dragover.prevent.stop="onFavoriteItemDragOver($event, i)"
        @drop.prevent.stop="onFavoriteItemDrop($event, i)"
      >
        <div class="fav-row" @mousedown="onFavoriteMouseDown($event, item, i)" @click="toggleFavoriteItem(item, i)">
          <input
            v-if="isFavoriteNameEditing(item, i)"
            class="fav-title-input"
            placeholder="未命名"
            :value="favoriteNameDraft"
            @click.stop
            @pointerdown.stop
            @mousedown.stop
            @dragstart.stop
            @input="favoriteNameDraft = ($event.target as HTMLInputElement).value"
            @keydown.enter.stop.prevent="finishFavoriteNameEdit(item, i)"
            @keydown.escape.stop.prevent="cancelFavoriteNameEdit"
            @blur="finishFavoriteNameEdit(item, i)"
          />
          <span v-else class="fav-title-text">{{ item.name || '未命名' }}</span>
          <div class="fav-entry-actions" @click.stop>
            <button
              class="fav-rename-action"
              type="button"
              :title="isFavoriteNameEditing(item, i) ? '完成重命名' : '重命名'"
              @pointerdown.prevent.stop
              @mousedown.prevent.stop
              @click.stop="toggleFavoriteNameEdit(item, i)"
            >
              <Icon :name="isFavoriteNameEditing(item, i) ? 'check' : 'pen-line'" :size="12" />
            </button>
            <button
              class="fav-delete-action fav-entry-action-danger"
              type="button"
              title="删除"
              @pointerdown.prevent.stop
              @mousedown.prevent.stop
              @click.stop="deleteFavoriteInline(i)"
            >
              <Icon name="trash-2" :size="12" />
            </button>
          </div>
        </div>

        <div
          v-if="!isFavoriteExpanded(item, i) && previewText(item)"
          class="fav-preview left-entry-preview"
          role="button"
          tabindex="0"
          @click.stop="toggleFavoriteItem(item, i)"
          @keydown.enter.stop.prevent="toggleFavoriteItem(item, i)"
          @keydown.space.stop.prevent="toggleFavoriteItem(item, i)"
        >
          {{ previewText(item) }}
        </div>

        <div v-if="isFavoriteExpanded(item, i)" class="fav-body" @click.stop>
          <textarea
            class="fav-textarea"
            placeholder="提示词内容..."
            :value="item.content"
            rows="10"
            @input="updateFavoriteContent(i, ($event.target as HTMLTextAreaElement).value)"
          ></textarea>
          <div class="fav-meta-row">
            <div class="fav-capsule-wrap">
              <button
                class="fav-role-pill sidebar-entry-pill has-arrow"
                type="button"
                aria-label="收藏条目角色"
                :aria-expanded="isFavoriteRoleOpen(item, i)"
                @click="toggleFavoriteRoleMenu(item, i)"
              >
                <span>{{ roleLabel(item.role) }}</span>
                <Icon :name="isFavoriteRoleOpen(item, i) ? 'chevron-up' : 'chevron-down'" :size="11" />
              </button>
              <div v-if="isFavoriteRoleOpen(item, i)" class="fav-capsule-menu" role="menu" aria-label="收藏条目角色">
                <button
                  v-for="option in ROLE_OPTIONS"
                  :key="option.value"
                  class="fav-capsule-option"
                  :class="{ active: item.role === option.value }"
                  type="button"
                  role="menuitem"
                  @click="setFavoriteRole(i, option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
            <div class="fav-capsule-wrap">
              <button
                class="fav-position-pill sidebar-entry-pill has-arrow"
                type="button"
                aria-label="收藏条目位置"
                :aria-expanded="isFavoritePositionOpen(item, i)"
                @click="toggleFavoritePositionMenu(item, i)"
              >
                <span>{{ positionLabel(favoritePositionType(item)) }}</span>
                <Icon :name="isFavoritePositionOpen(item, i) ? 'chevron-up' : 'chevron-down'" :size="11" />
              </button>
              <div v-if="isFavoritePositionOpen(item, i)" class="fav-capsule-menu" role="menu" aria-label="收藏条目位置">
                <button
                  v-for="option in POSITION_OPTIONS"
                  :key="option.value"
                  class="fav-capsule-option"
                  :class="{ active: favoritePositionType(item) === option.value }"
                  type="button"
                  role="menuitem"
                  @click="setFavoritePosition(i, item, option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
            <div class="fav-trigger-wrap">
              <button
                class="fav-trigger-summary sidebar-entry-pill"
                type="button"
                :aria-expanded="isFavoriteTriggerOpen(item, i)"
                @click="toggleFavoriteTriggerPanel(item, i)"
              >
                <span>{{ favoriteTriggerSummary(item) }}</span>
                <Icon :name="isFavoriteTriggerOpen(item, i) ? 'chevron-up' : 'chevron-down'" :size="11" />
              </button>
              <div
                v-if="isFavoriteTriggerOpen(item, i)"
                class="fav-trigger-panel"
                role="group"
                aria-label="触发类型"
              >
                <label
                  v-for="option in TRIGGER_OPTIONS"
                  :key="option.value"
                  class="fav-trigger-pill"
                  :class="{ active: favoriteTriggers(item).includes(option.value) }"
                >
                  <input
                    class="fav-trigger-checkbox"
                    type="checkbox"
                    :value="option.value"
                    :checked="favoriteTriggers(item).includes(option.value)"
                    @change="toggleFavoriteTrigger(i, item, option.value)"
                  />
                  <span>{{ option.label }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      <div v-if="favoriteDropIndex === folder.items.length" class="fav-drag-spacer fav-drop-indicator" />
    </div>

    <div
      v-if="favoriteDragPreview.visible"
      class="fav-drag-preview preset-drag-preview"
      :class="{ preset: favoriteDragPreview.mode === 'preset' }"
      :style="favoriteDragPreview.mode === 'preset' ? favoritePresetDragPreviewStyle : favoriteDragPreviewStyle"
    >
      <template v-if="favoriteDragPreview.mode === 'sidebar'">
        <span class="fav-title-text">{{ favoriteDragPreview.name }}</span>
        <div v-if="favoriteDragPreview.preview" class="fav-preview left-entry-preview">{{ favoriteDragPreview.preview }}</div>
      </template>
      <PromptItem
        v-else-if="presetPreviewPrompt"
        :prompt="presetPreviewPrompt"
        :preview="true"
      />
    </div>

    <Transition name="sidebar-entry-context-pop">
      <div
        v-if="favoriteContextMenuOpen"
        ref="favoriteContextMenuRef"
        class="fav-context-menu sidebar-entry-context-menu"
        :style="{ left: `${favoriteContextMenu.x}px`, top: `${favoriteContextMenu.y}px` }"
        @pointerdown.stop
        @mousedown.stop
        @contextmenu.prevent
      >
        <button class="sidebar-entry-context-item" type="button" @click="renameFavoriteFromContext">
          <Icon name="pen-line" :size="13" />
          <span>重命名</span>
        </button>
        <button class="sidebar-entry-context-item danger" type="button" @click="deleteFavoriteFromContext">
          <Icon name="trash-2" :size="13" />
          <span>删除</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import Icon from './Icon.vue';
import PromptItem from './PromptItem.vue';
import { getPromptKey, useManagerStore, type FavoriteFolder } from '../stores/manager';
import { isPresetPlaceholderPrompt } from '../utils/officialPromptManager';
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
const ROLE_OPTIONS: SidebarCapsuleOption<PresetNormalPrompt['role']>[] = [
  { value: 'system', label: '系统' },
  { value: 'user', label: '用户' },
  { value: 'assistant', label: 'AI助手' },
];
const POSITION_OPTIONS: SidebarCapsuleOption<PromptPositionType>[] = [
  { value: 'relative', label: '相对位置' },
  { value: 'in_chat', label: '插入聊天' },
];
const FAVORITE_DRAG_START_DISTANCE = 4;
const FAVORITE_PROMPT_DRAG_OVER_EVENT = 'preset-manager-favorite-dragover';
const FAVORITE_PROMPT_DROP_EVENT = 'preset-manager-favorite-drop';
const FAVORITE_PROMPT_DRAG_END_EVENT = 'preset-manager-favorite-dragend';

const props = defineProps<{
  folder: FavoriteFolder;
  dragActive?: boolean;
}>();

const emit = defineEmits<{
  delete: [];
  dragFocus: [folderId: string];
  dragClear: [folderId: string];
}>();

const store = useManagerStore();
const favoriteFolderRoot = ref<HTMLElement | null>(null);
const isEditing = ref(false);
const editName = ref('');
const nameInput = ref<HTMLInputElement>();
const isDragOver = ref(false);
const expandedFavorites = reactive<Record<string, boolean>>({});
const openFavoriteTriggerKey = ref<string | null>(null);
const openFavoriteRoleKey = ref<string | null>(null);
const openFavoritePositionKey = ref<string | null>(null);
const favoriteNameEditKey = ref<string | null>(null);
const favoriteNameDraft = ref('');
const favoriteContextMenuRef = ref<HTMLElement | null>(null);
const favoriteContextMenuOpen = ref(false);
const favoriteContextMenu = reactive({
  x: 0,
  y: 0,
  key: '',
  index: -1,
});
const favoriteDropIndex = ref<number | null>(null);
const favoriteDragPreview = reactive({
  visible: false,
  key: '',
  name: '',
  preview: '',
  mode: 'sidebar' as 'sidebar' | 'preset',
  prompt: null as PresetNormalPrompt | null,
  x: 0,
  y: 0,
  width: 0,
  presetWidth: 0,
});
const favoriteMouseDrag = reactive({
  active: false,
  dragging: false,
  key: '',
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
const parentDocument = inject<Document>('parentDocument', document);
const iframeElement = inject<HTMLIFrameElement | null>('iframeElement', null);
const localDoc: Document = iframeElement?.contentDocument ?? document;
let suppressFavoriteClick = false;
let suppressFavoriteClickTimer: ReturnType<typeof window.setTimeout> | null = null;
let activeFavoritePromptDropPanel: HTMLElement | null = null;
const favoriteDragPreviewStyle = computed(() => ({
  '--favorite-drag-x': `${favoriteDragPreview.x}px`,
  '--favorite-drag-y': `${favoriteDragPreview.y}px`,
  width: favoriteDragPreview.width ? `${favoriteDragPreview.width}px` : undefined,
}));
const favoritePresetDragPreviewStyle = computed(() => ({
  '--favorite-drag-x': `${favoriteDragPreview.x}px`,
  '--favorite-drag-y': `${favoriteDragPreview.y}px`,
  width: favoriteDragPreview.presetWidth ? `${favoriteDragPreview.presetWidth}px` : undefined,
}));
const presetPreviewPrompt = computed(() => favoriteDragPreview.prompt);
function startEdit() {
  editName.value = props.folder.name;
  isEditing.value = true;
  nextTick(() => nameInput.value?.focus());
}

function toggleFolderNameEdit() {
  if (isEditing.value) {
    finishEdit();
    return;
  }
  startEdit();
}

function finishEdit() {
  if (isEditing.value && editName.value.trim()) {
    store.renameFavoriteFolder(props.folder.id, editName.value.trim());
  }
  isEditing.value = false;
}

function cancelEdit() {
  isEditing.value = false;
}

function favoriteKey(item: PresetNormalPrompt, index: number) {
  return getPromptKey(item as any) || (item as any).identifier || item.id || `${item.name || 'favorite'}-${index}`;
}

function isFavoriteExpanded(item: PresetNormalPrompt, index: number) {
  return Boolean(expandedFavorites[favoriteKey(item, index)]);
}

function isFavoriteDragging(item: PresetNormalPrompt, index: number) {
  return favoriteMouseDrag.dragging && favoriteMouseDrag.startIndex === index;
}

function getFavoriteItemStyle(item: PresetNormalPrompt, index: number) {
  if (!favoriteDragPreview.visible || !favoriteDragPreview.key || isFavoriteDragging(item, index)) return {};
  const offset = getFavoriteReflowOffset(index);
  return offset ? { transform: `translate3d(0, ${offset}px, 0)` } : {};
}

function toggleFavoriteItem(item: PresetNormalPrompt, index: number) {
  if (suppressFavoriteClick) {
    suppressFavoriteClick = false;
    return;
  }
  if (isFavoriteNameEditing(item, index)) return;
  const key = favoriteKey(item, index);
  expandedFavorites[key] = !expandedFavorites[key];
}

function isFavoriteNameEditing(item: PresetNormalPrompt, index: number) {
  return favoriteNameEditKey.value === favoriteKey(item, index);
}

function startFavoriteNameEdit(item: PresetNormalPrompt, index: number) {
  favoriteNameEditKey.value = favoriteKey(item, index);
  favoriteNameDraft.value = item.name ?? '';
  nextTick(() => {
    const input = document.querySelector<HTMLInputElement>('.fav-title-input');
    input?.focus();
    input?.select();
  });
}

function finishFavoriteNameEdit(item: PresetNormalPrompt, index: number) {
  if (!isFavoriteNameEditing(item, index)) return;
  updateFavoriteName(index, favoriteNameDraft.value.trim());
  favoriteNameEditKey.value = null;
  favoriteNameDraft.value = '';
}

function cancelFavoriteNameEdit() {
  favoriteNameEditKey.value = null;
  favoriteNameDraft.value = '';
}

function toggleFavoriteNameEdit(item: PresetNormalPrompt, index: number) {
  if (isFavoriteNameEditing(item, index)) {
    finishFavoriteNameEdit(item, index);
    return;
  }
  startFavoriteNameEdit(item, index);
}

function updateFavoriteName(index: number, name: string) {
  store.updateFavoriteItem(props.folder.id, index, { name });
}

function updateFavoriteContent(index: number, content: string) {
  store.updateFavoriteItem(props.folder.id, index, { content });
}

function updateFavoriteRole(index: number, role: PresetNormalPrompt['role']) {
  store.updateFavoriteItem(props.folder.id, index, { role });
}

function updateFavoriteEntry(index: number, updates: Partial<PresetPrompt> & Record<string, unknown>) {
  store.updateFavoriteItem(props.folder.id, index, updates as Partial<PresetPrompt>);
}

function favoritePositionType(item: PresetNormalPrompt): PromptPositionType {
  const prompt = item as any;
  return prompt.injection_position === INJECTION_POSITION_IN_CHAT || prompt.position?.type === 'in_chat'
    ? 'in_chat'
    : 'relative';
}

function updateFavoritePosition(index: number, item: PresetNormalPrompt, positionType: PromptPositionType) {
  const prompt = item as any;
  const isInChat = positionType === 'in_chat';
  const depth = prompt.injection_depth ?? prompt.position?.depth ?? DEFAULT_DEPTH;
  const order = prompt.injection_order ?? prompt.position?.order ?? DEFAULT_ORDER;
  updateFavoriteEntry(index, {
    position: isInChat ? { type: 'in_chat', depth, order } : { type: 'relative' },
    injection_position: isInChat ? INJECTION_POSITION_IN_CHAT : INJECTION_POSITION_RELATIVE,
    injection_depth: depth,
    injection_order: order,
  } as any);
}

function roleLabel(role: PresetNormalPrompt['role']) {
  return ROLE_OPTIONS.find(option => option.value === role)?.label ?? String(role);
}

function positionLabel(positionType: PromptPositionType) {
  return POSITION_OPTIONS.find(option => option.value === positionType)?.label ?? '相对位置';
}

function isFavoriteRoleOpen(item: PresetNormalPrompt, index: number) {
  return openFavoriteRoleKey.value === favoriteKey(item, index);
}

function isFavoritePositionOpen(item: PresetNormalPrompt, index: number) {
  return openFavoritePositionKey.value === favoriteKey(item, index);
}

function toggleFavoriteRoleMenu(item: PresetNormalPrompt, index: number) {
  const key = favoriteKey(item, index);
  openFavoritePositionKey.value = null;
  openFavoriteTriggerKey.value = null;
  openFavoriteRoleKey.value = openFavoriteRoleKey.value === key ? null : key;
}

function toggleFavoritePositionMenu(item: PresetNormalPrompt, index: number) {
  const key = favoriteKey(item, index);
  openFavoriteRoleKey.value = null;
  openFavoriteTriggerKey.value = null;
  openFavoritePositionKey.value = openFavoritePositionKey.value === key ? null : key;
}

function setFavoriteRole(index: number, role: PresetNormalPrompt['role']) {
  updateFavoriteRole(index, role);
  openFavoriteRoleKey.value = null;
}

function setFavoritePosition(index: number, item: PresetNormalPrompt, positionType: PromptPositionType) {
  updateFavoritePosition(index, item, positionType);
  openFavoritePositionKey.value = null;
}

function favoriteTriggers(item: PresetNormalPrompt) {
  const triggers = (item as any).injection_trigger;
  return Array.isArray(triggers) ? triggers : [];
}

function favoriteTriggerSummary(item: PresetNormalPrompt) {
  const count = favoriteTriggers(item).length;
  return count > 0 ? `触发类型 · ${count}` : '触发类型';
}

function isFavoriteTriggerOpen(item: PresetNormalPrompt, index: number) {
  return openFavoriteTriggerKey.value === favoriteKey(item, index);
}

function toggleFavoriteTriggerPanel(item: PresetNormalPrompt, index: number) {
  const key = favoriteKey(item, index);
  openFavoriteRoleKey.value = null;
  openFavoritePositionKey.value = null;
  openFavoriteTriggerKey.value = openFavoriteTriggerKey.value === key ? null : key;
}

function toggleFavoriteTrigger(index: number, item: PresetNormalPrompt, trigger: string) {
  const triggers = new Set(favoriteTriggers(item));
  if (triggers.has(trigger)) triggers.delete(trigger);
  else triggers.add(trigger);
  updateFavoriteEntry(index, { injection_trigger: [...triggers] } as any);
}

function openFavoriteContextMenu(event: MouseEvent, item: PresetNormalPrompt, index: number) {
  favoriteContextMenu.key = favoriteKey(item, index);
  favoriteContextMenu.index = index;
  favoriteContextMenu.x = event.clientX;
  favoriteContextMenu.y = event.clientY;
  favoriteContextMenuOpen.value = true;
  nextTick(clampFavoriteContextMenuPosition);
}

function closeFavoriteContextMenu(event?: Event) {
  if (event && favoriteContextMenuRef.value?.contains(event.target as Node)) return;
  favoriteContextMenuOpen.value = false;
}

function closeFavoriteCapsuleMenus(event?: Event) {
  const target = event?.target as HTMLElement | null;
  if (target?.closest?.('.fav-capsule-wrap, .fav-trigger-wrap')) return;
  openFavoriteRoleKey.value = null;
  openFavoritePositionKey.value = null;
  openFavoriteTriggerKey.value = null;
}

function closeFavoritePopupMenus(event?: Event) {
  closeFavoriteContextMenu(event);
  closeFavoriteCapsuleMenus(event);
}

function closeFavoritePopupMenusFromKey(event: KeyboardEvent) {
  if (event.key === 'Escape') closeFavoritePopupMenus();
}

function clampFavoriteContextMenuPosition() {
  const menu = favoriteContextMenuRef.value;
  if (!menu) return;
  const margin = 8;
  favoriteContextMenu.x = Math.max(margin, Math.min(favoriteContextMenu.x, window.innerWidth - menu.offsetWidth - margin));
  favoriteContextMenu.y = Math.max(margin, Math.min(favoriteContextMenu.y, window.innerHeight - menu.offsetHeight - margin));
}

function renameFavoriteFromContext() {
  const index = favoriteContextMenu.index;
  const item = props.folder.items[index];
  closeFavoriteContextMenu();
  if (item) startFavoriteNameEdit(item, index);
}

function deleteFavoriteFromContext() {
  const index = favoriteContextMenu.index;
  closeFavoriteContextMenu();
  if (index >= 0) store.removeFromFavorites(props.folder.id, index);
}

function deleteFavoriteInline(index: number) {
  store.removeFromFavorites(props.folder.id, index);
}

function previewText(item: PresetNormalPrompt) {
  return String(item.content || '').replace(/\s+/g, ' ').trim();
}

function onFolderDragEnter(e: DragEvent) {
  if (e.dataTransfer) e.dataTransfer.dropEffect = isFavoriteDrag(e) ? 'move' : 'copy';
  emit('dragFocus', props.folder.id);
  isDragOver.value = true;
}

function onFolderDragOver(e: DragEvent) {
  if (e.dataTransfer) e.dataTransfer.dropEffect = isFavoriteDrag(e) ? 'move' : 'copy';
  emit('dragFocus', props.folder.id);
  isDragOver.value = true;
  if (isFavoriteDrag(e)) {
    favoriteDropIndex.value = props.folder.items.length;
  }
}

function onFolderDragLeave(e: DragEvent) {
  const current = e.currentTarget as Node | null;
  const related = e.relatedTarget as Node | null;
  if (current && related && current.contains(related)) return;
  isDragOver.value = false;
  emit('dragClear', props.folder.id);
}

function onFolderDrop(e: DragEvent) {
  isDragOver.value = false;
  emit('dragClear', props.folder.id);
  const raw = e.dataTransfer?.getData('application/json');
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    data.targetFolderId = props.folder.id;

    if (data.type === 'favorite' && typeof data.source === 'string' && typeof data.index === 'number') {
      data.targetIndex = favoriteDropIndex.value ?? props.folder.items.length;
      if (data.source === data.targetFolderId && data.index === data.targetIndex) return;
      store.moveFavoriteItem(data.source, data.index, props.folder.id, data.targetIndex);
      resetFavoriteMouseDrag();
      return;
    }

    const prompt = data.prompt as PresetPrompt;
    if (!prompt || isPresetPlaceholderPrompt(prompt)) return;

    const promptKey = getPromptKey(prompt) || prompt.id;
    const stored = {
      ...klona(prompt as any),
      id: prompt.id || promptKey,
      identifier: promptKey,
      name: prompt.name,
      enabled: prompt.enabled ?? true,
      position: (prompt as any).position ?? { type: 'relative' as const },
      role: prompt.role,
      content: (prompt as any).content ?? '',
    };
    stored.injection_position = stored.injection_position
      ?? (stored.position?.type === 'in_chat' ? 1 : 0);
    stored.injection_depth = stored.injection_depth ?? stored.position?.depth ?? 4;
    stored.injection_order = stored.injection_order ?? stored.position?.order ?? 100;
    stored.injection_trigger = Array.isArray(stored.injection_trigger) ? stored.injection_trigger : [];
    stored.forbid_overrides = false;
    const added = store.addToFavorites(props.folder.id, stored as PresetNormalPrompt);
    if (added) toastr.success(`已收藏 "${prompt.name}"`, '', { timeOut: 1500 });
    else toastr.warning(`"${prompt.name}" 已在这个收藏夹中`, '', { timeOut: 1500 });
  } catch (err) {
    console.error('[FavoriteFolder] Drop error:', err);
  }
}

function isFavoriteDrag(e: DragEvent) {
  if (favoriteDragPreview.visible) return true;
  const raw = e.dataTransfer?.getData('application/json');
  if (!raw) return false;
  try {
    return JSON.parse(raw)?.type === 'favorite';
  } catch {
    return false;
  }
}

function onFavoriteMouseDown(event: MouseEvent, item: PresetNormalPrompt, index: number) {
  if (event.button === 2 || isFavoriteNameEditing(item, index)) return;
  if (event.button !== 0) return;

  const target = event.target as HTMLElement | null;
  if (target?.closest('.fav-entry-actions, .fav-body, input, textarea, button, label')) return;

  const row = event.currentTarget as HTMLElement | null;
  const itemElement = row?.closest<HTMLElement>('.fav-item');
  const rect = itemElement?.getBoundingClientRect();
  const point = getFavoriteLocalPoint(event);
  resetFavoriteMouseDrag();
  favoriteMouseDrag.active = true;
  favoriteMouseDrag.dragging = false;
  favoriteMouseDrag.key = favoriteKey(item, index);
  favoriteMouseDrag.startIndex = index;
  favoriteMouseDrag.startX = point.x;
  favoriteMouseDrag.startY = point.y;
  favoriteMouseDrag.lastX = point.x;
  favoriteMouseDrag.lastY = point.y;
  favoriteMouseDrag.width = Math.max(120, Math.round(rect?.width ?? 0));
  favoriteMouseDrag.height = Math.max(32, Math.round(rect?.height ?? 38));
  favoriteMouseDrag.offsetX = Math.max(0, point.x - (rect?.left ?? point.x));
  favoriteMouseDrag.offsetY = Math.max(0, point.y - (rect?.top ?? point.y));
  startParentDrag(parentDocument, {
    startEvent: event,
    cursor: 'grabbing',
    expectFocusInsideSourceFrame: true,
    onMove: onFavoriteMouseMove,
    onEnd: finishFavoriteMouseDrag,
  });
}

function getFavoriteLocalPoint(event: MouseEvent) {
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

function startFavoriteMouseDrag(x = favoriteMouseDrag.lastX, y = favoriteMouseDrag.lastY) {
  if (!favoriteMouseDrag.active || favoriteMouseDrag.dragging || favoriteMouseDrag.startIndex < 0) return;
  const item = props.folder.items[favoriteMouseDrag.startIndex];
  if (!item) return;

  favoriteMouseDrag.dragging = true;
  suppressNextFavoriteClick();
  favoriteDragPreview.key = favoriteMouseDrag.key;
  favoriteDragPreview.name = item.name || '未命名';
  favoriteDragPreview.preview = previewText(item);
  favoriteDragPreview.mode = 'sidebar';
  favoriteDragPreview.prompt = klona(item as any) as PresetNormalPrompt;
  favoriteDragPreview.width = favoriteMouseDrag.width;
  favoriteDragPreview.presetWidth = 0;
  favoriteDragPreview.visible = true;
  favoriteDropIndex.value = favoriteMouseDrag.startIndex;
  closeFavoritePopupMenus();
  updateFavoriteDragFromPoint(x, y);
}

function updateFavoriteDragPreviewPosition(clientX = favoriteMouseDrag.lastX, clientY = favoriteMouseDrag.lastY) {
  if (!favoriteDragPreview.visible) return;
  favoriteDragPreview.x = clientX - favoriteMouseDrag.offsetX;
  favoriteDragPreview.y = clientY - favoriteMouseDrag.offsetY;
}

function updateFavoriteDragFromPoint(clientX: number, clientY: number) {
  const overPresetPanel = dispatchFavoritePromptDragOver(clientX, clientY);
  favoriteDragPreview.mode = overPresetPanel ? 'preset' : 'sidebar';
  favoriteDropIndex.value = overPresetPanel ? null : resolveFavoriteMouseDropIndex(clientY);
  requestAnimationFrame(() => updateFavoriteDragPreviewPosition(clientX, clientY));
}

function onFavoriteMouseMove(event: MouseEvent) {
  if (!favoriteMouseDrag.active) return;
  const point = getFavoriteLocalPoint(event);
  favoriteMouseDrag.lastX = point.x;
  favoriteMouseDrag.lastY = point.y;

  if (!favoriteMouseDrag.dragging) {
    const distance = Math.hypot(point.x - favoriteMouseDrag.startX, point.y - favoriteMouseDrag.startY);
    if (distance < FAVORITE_DRAG_START_DISTANCE) return;
    startFavoriteMouseDrag(point.x, point.y);
    return;
  }

  updateFavoriteDragFromPoint(point.x, point.y);
}

function resolveFavoriteDropIndex(event: DragEvent, targetIndex: number) {
  const target = event.currentTarget as HTMLElement | null;
  const rect = target?.getBoundingClientRect();
  if (!rect) return targetIndex;
  return event.clientY > rect.top + rect.height / 2 ? targetIndex + 1 : targetIndex;
}

function onFavoriteItemDragOver(e: DragEvent, index: number) {
  if (!isFavoriteDrag(e)) return;
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  emit('dragFocus', props.folder.id);
  isDragOver.value = true;
  favoriteDropIndex.value = resolveFavoriteDropIndex(e, index);
}

function onFavoriteItemDrop(e: DragEvent, index: number) {
  favoriteDropIndex.value = resolveFavoriteDropIndex(e, index);
  onFolderDrop(e);
}

function finishFavoriteMouseDrag() {
  if (!favoriteMouseDrag.active) return;
  const targetIndex = favoriteDropIndex.value ?? favoriteMouseDrag.startIndex;
  const handledPresetDrop = favoriteMouseDrag.dragging && dispatchFavoritePromptDrop();
  if (favoriteMouseDrag.dragging && favoriteMouseDrag.startIndex >= 0) {
    if (!handledPresetDrop && isFavoritePointerInsideFolder()) {
      store.reorderFavoriteItem(props.folder.id, favoriteMouseDrag.startIndex, targetIndex);
    }
    suppressNextFavoriteClick();
  }
  resetFavoriteMouseDrag();
}

function resetFavoriteMouseDrag() {
  favoriteMouseDrag.active = false;
  favoriteMouseDrag.dragging = false;
  favoriteMouseDrag.key = '';
  favoriteMouseDrag.startIndex = -1;
  favoriteMouseDrag.startX = 0;
  favoriteMouseDrag.startY = 0;
  favoriteMouseDrag.lastX = 0;
  favoriteMouseDrag.lastY = 0;
  favoriteMouseDrag.width = 0;
  favoriteMouseDrag.height = 38;
  favoriteMouseDrag.offsetX = 0;
  favoriteMouseDrag.offsetY = 0;
  favoriteDropIndex.value = null;
  clearFavoritePromptDragTarget();
  favoriteDragPreview.visible = false;
  favoriteDragPreview.key = '';
  favoriteDragPreview.name = '';
  favoriteDragPreview.preview = '';
  favoriteDragPreview.mode = 'sidebar';
  favoriteDragPreview.prompt = null;
  favoriteDragPreview.width = 0;
  favoriteDragPreview.presetWidth = 0;
}

function resolveFavoriteMouseDropIndex(clientY: number) {
  const items = Array.from(favoriteFolderRoot.value?.querySelectorAll<HTMLElement>('.fav-item') ?? []);
  if (!items.length) return props.folder.items.length;
  for (const [index, item] of items.entries()) {
    const rect = item.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) return index;
  }
  return items.length;
}

function getFavoritePromptDropPanel(clientX = favoriteMouseDrag.lastX, clientY = favoriteMouseDrag.lastY) {
  // clientX/Y 是本地 iframe 坐标（由 getFavoriteLocalPoint 转换）
  // localDoc 是 iframe 内文档，document 是外层酒馆页面
  const hit = localDoc.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('.preset-panel');
  if (hit) return hit;
  for (const panel of Array.from(localDoc.querySelectorAll<HTMLElement>('.preset-panel'))) {
    const rect = panel.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) return panel;
  }
  return null;
}

function dispatchFavoritePromptDragOver(clientX: number, clientY: number) {
  const panel = getFavoritePromptDropPanel(clientX, clientY);
  if (activeFavoritePromptDropPanel && activeFavoritePromptDropPanel !== panel) {
    activeFavoritePromptDropPanel.dispatchEvent(new CustomEvent(FAVORITE_PROMPT_DRAG_END_EVENT, {
      detail: { previewMode: 'sidebar' },
    }));
  }
  activeFavoritePromptDropPanel = panel;
  if (!panel) return false;

  const item = props.folder.items[favoriteMouseDrag.startIndex];
  const panelRect = panel.getBoundingClientRect();
  favoriteDragPreview.presetWidth = Math.max(160, Math.round(panelRect.width - 28));
  panel.dispatchEvent(new CustomEvent(FAVORITE_PROMPT_DRAG_OVER_EVENT, {
    detail: {
      clientY,
      prompt: item && !isPresetPlaceholderPrompt(item) ? klona(item as any) : undefined,
      previewMode: 'preset',
    },
  }));
  return true;
}

function clearFavoritePromptDragTarget() {
  if (!activeFavoritePromptDropPanel) return;
  activeFavoritePromptDropPanel.dispatchEvent(new CustomEvent(FAVORITE_PROMPT_DRAG_END_EVENT, {
    detail: { previewMode: 'sidebar' },
  }));
  activeFavoritePromptDropPanel = null;
}

function dispatchFavoritePromptDrop() {
  const panel = activeFavoritePromptDropPanel ?? getFavoritePromptDropPanel();
  const item = props.folder.items[favoriteMouseDrag.startIndex];
  if (!panel || !item || isPresetPlaceholderPrompt(item)) return false;

  const dropEvent = new CustomEvent(FAVORITE_PROMPT_DROP_EVENT, {
    cancelable: true,
    detail: {
      clientY: favoriteMouseDrag.lastY,
      prompt: klona(item as any),
    },
  });
  panel.dispatchEvent(dropEvent);
  return dropEvent.defaultPrevented;
}

function isFavoritePointerInsideFolder() {
  const target = localDoc.elementFromPoint(favoriteMouseDrag.lastX, favoriteMouseDrag.lastY);
  return Boolean(target && favoriteFolderRoot.value?.contains(target));
}

function suppressNextFavoriteClick() {
  suppressFavoriteClick = true;
  if (suppressFavoriteClickTimer !== null) window.clearTimeout(suppressFavoriteClickTimer);
  suppressFavoriteClickTimer = window.setTimeout(() => {
    suppressFavoriteClick = false;
    suppressFavoriteClickTimer = null;
  }, 0);
}

function getFavoriteReflowOffset(index: number) {
  const sourceIndex = favoriteMouseDrag.startIndex;
  const dropIndex = favoriteDropIndex.value;
  if (sourceIndex < 0 || dropIndex === null) return 0;

  const rowStep = favoriteMouseDrag.height;
  if (dropIndex > sourceIndex && index > sourceIndex && index < dropIndex) return -rowStep;
  if (dropIndex < sourceIndex && index >= dropIndex && index < sourceIndex) return rowStep;
  return 0;
}

onMounted(() => {
  document.addEventListener('pointerdown', closeFavoritePopupMenus, true);
  document.addEventListener('mousedown', closeFavoritePopupMenus, true);
  document.addEventListener('click', closeFavoritePopupMenus, true);
  parentDocument.addEventListener('pointerdown', closeFavoritePopupMenus, true);
  parentDocument.addEventListener('mousedown', closeFavoritePopupMenus, true);
  parentDocument.addEventListener('click', closeFavoritePopupMenus, true);
  parentDocument.defaultView?.addEventListener('pointerdown', closeFavoritePopupMenus, true);
  window.addEventListener('keydown', closeFavoritePopupMenusFromKey, true);
  parentDocument.defaultView?.addEventListener('keydown', closeFavoritePopupMenusFromKey, true);
});

onUnmounted(() => {
  resetFavoriteMouseDrag();
  if (suppressFavoriteClickTimer !== null) window.clearTimeout(suppressFavoriteClickTimer);
  document.removeEventListener('pointerdown', closeFavoritePopupMenus, true);
  document.removeEventListener('mousedown', closeFavoritePopupMenus, true);
  document.removeEventListener('click', closeFavoritePopupMenus, true);
  parentDocument.removeEventListener('pointerdown', closeFavoritePopupMenus, true);
  parentDocument.removeEventListener('mousedown', closeFavoritePopupMenus, true);
  parentDocument.removeEventListener('click', closeFavoritePopupMenus, true);
  parentDocument.defaultView?.removeEventListener('pointerdown', closeFavoritePopupMenus, true);
  window.removeEventListener('keydown', closeFavoritePopupMenusFromKey, true);
  parentDocument.defaultView?.removeEventListener('keydown', closeFavoritePopupMenusFromKey, true);
});
</script>

<style scoped>
.favorite-folder {
  flex: 0 0 auto;
  min-height: 42px;
  border-radius: 8px;
  background: transparent;
  transition: background 0.14s ease;
}
.favorite-folder:not(:last-child) {
  padding-bottom: 10px;
}
.favorite-folder:last-child {
  flex: 1 0 auto;
}
.favorite-folder.drag-over {
  background: color-mix(in srgb, var(--pm-accent) 8%, transparent);
}
.folder-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s ease;
}
.folder-row:hover {
  background: var(--pm-row-hover);
}
.folder-chevron {
  flex-shrink: 0;
  color: var(--pm-text-subtle);
}
.folder-name {
  flex: 1;
  min-width: 0;
  color: var(--pm-text);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.folder-name-input {
  flex: 1;
  min-width: 0;
  height: 24px;
  padding: 0 7px;
  border: 0;
  border-radius: 6px;
  background: var(--pm-input-bg);
  color: var(--pm-text);
  font-size: 12px;
  outline: none;
}
.folder-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.12s ease;
}
.folder-row:hover .folder-actions {
  opacity: 1;
}
.folder-action {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--pm-text-subtle);
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}
.folder-action:hover {
  background: var(--pm-pill-bg-hover);
  color: var(--pm-text);
}
.folder-action.folder-action-danger:hover {
  background: color-mix(in srgb, var(--pm-danger) 14%, transparent);
  color: var(--pm-danger);
}
.folder-items {
  min-height: 64px;
  padding: 3px 0 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.empty-folder {
  min-height: 46px;
  display: grid;
  place-items: center;
  color: var(--pm-text-faint);
  font-size: 11.5px;
  text-align: center;
}
.fav-item-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.fav-item {
  flex: 0 0 auto;
  border-radius: 8px;
  background: transparent;
  cursor: grab;
  transition:
    background 0.12s ease,
    transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
  will-change: transform;
}
.fav-item:not(.expanded) {
  background: var(--pm-control-highlight);
}
.fav-item:not(.expanded):hover {
  background: var(--pm-control-highlight-hover);
}
.fav-item.expanded {
  background: var(--pm-input-bg);
  box-shadow: none;
}
.fav-item.dragging {
  opacity: 0;
  pointer-events: none;
}
.fav-item.drop-target {
  background: transparent;
}
.fav-drag-spacer {
  pointer-events: none;
}
.fav-drop-indicator {
  height: 2px;
  margin: 0 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pm-text) 42%, transparent);
  pointer-events: none;
}
.fav-drag-preview {
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
  transform: translate3d(var(--favorite-drag-x, 0), var(--favorite-drag-y, 0), 0);
  transform-origin: left top;
  will-change: transform;
}
.fav-drag-preview .fav-title-text {
  width: 100%;
}
.fav-drag-preview .left-entry-preview {
  margin-bottom: 7px;
}
.fav-drag-preview.preset {
  padding: 0;
  background: transparent;
  border-radius: 10px;
}
.fav-drag-preview.preset :deep(.prompt-item) {
  opacity: 0.86;
  box-shadow: 0 10px 26px color-mix(in srgb, #000 22%, transparent);
  border: 1px solid color-mix(in srgb, var(--pm-text) 18%, transparent);
}
.fav-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 5px 8px;
  cursor: pointer;
}
.fav-title-text {
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
.fav-title-input {
  flex: 1;
  min-width: 0;
  height: 22px;
  padding: 0 5px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--pm-text);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.005em;
  outline: none;
  transition: border-color 0.12s ease, background 0.12s ease;
}
.fav-title-input:hover {
  background: var(--pm-input-bg);
}
.fav-title-input:focus {
  border-color: var(--pm-border-strong);
  background: var(--pm-input-bg);
}
.fav-title-input::placeholder {
  color: var(--pm-text);
  opacity: 1;
}
.fav-entry-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
  opacity: 0.64;
  transition: opacity 0.12s ease;
}
.fav-row:hover .fav-entry-actions,
.fav-row:focus-within .fav-entry-actions {
  opacity: 1;
}
.fav-preview {
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
.fav-rename-action {
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
.fav-delete-action {
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
.fav-rename-action:hover,
.fav-rename-action:focus-visible,
.fav-delete-action:hover,
.fav-delete-action:focus-visible {
  background: var(--pm-pill-bg-hover);
  color: var(--pm-text);
  outline: none;
}
.fav-entry-action-danger:hover,
.fav-entry-action-danger:focus-visible {
  background: color-mix(in srgb, var(--pm-danger) 14%, transparent);
  color: var(--pm-danger);
}
.fav-body {
  padding: 3px 4px 9px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.fav-meta-row {
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
.fav-trigger-summary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.fav-capsule-wrap {
  position: relative;
  flex: 0 0 auto;
}
.fav-capsule-menu {
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
.fav-capsule-option {
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
.fav-capsule-option:hover,
.fav-capsule-option.active {
  background: var(--pm-pill-bg-hover);
  color: var(--pm-text);
}
.fav-trigger-wrap {
  position: relative;
  flex: 0 0 auto;
}
.fav-trigger-panel {
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
.fav-trigger-pill {
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
.fav-trigger-pill.active {
  color: var(--pm-text);
  background: var(--pm-pill-bg-hover);
}
.fav-trigger-checkbox {
  display: none;
}
.fav-textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 178px;
  max-height: 260px;
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
