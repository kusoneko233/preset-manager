<template>
  <div class="left-sidebar" :class="{ collapsed }" :style="{ width: collapsed ? '0px' : `${width}px` }">
    <template v-if="!collapsed">
      <div class="sidebar-content">
        <div class="sidebar-mode-list" role="tablist" aria-label="预设管理器侧栏">
          <button
            class="sidebar-mode-button"
            :class="{ active: activeMode === 'presets' }"
            type="button"
            role="tab"
            :aria-selected="activeMode === 'presets'"
            @click="setMode('presets')"
          >
            <Icon name="folder" :size="14" />
            <span>预设</span>
          </button>
          <button
            class="sidebar-mode-button"
            :class="{ active: activeMode === 'chat' }"
            type="button"
            role="tab"
            :aria-selected="activeMode === 'chat'"
            @click="setMode('chat')"
          >
            <Icon name="message-square" :size="14" />
            <span>新聊天</span>
          </button>
          <button
            class="sidebar-mode-button"
            :class="{ active: activeMode === 'workbench' }"
            type="button"
            role="tab"
            :aria-selected="activeMode === 'workbench'"
            @click="setMode('workbench')"
          >
            <Icon name="file-text" :size="14" />
            <span>增添预设条目</span>
          </button>
          <button
            class="sidebar-mode-button"
            :class="{ active: activeMode === 'favorites' }"
            type="button"
            role="tab"
            :aria-selected="activeMode === 'favorites'"
            @click="setMode('favorites')"
          >
            <Icon name="bookmark" :size="14" />
            <span>收藏栏</span>
          </button>
        </div>

        <div class="sidebar-main-content">
          <SidebarPresetList
            v-if="activeMode === 'presets'"
            :active-preset-name="activePresetName"
            @select-preset="emit('select-preset', $event)"
            @preset-action="emit('preset-action', $event)"
          />

          <WorkbenchPanel v-else-if="activeMode === 'workbench'" />
          <FavoritesPanel v-else-if="activeMode === 'favorites'" />
          <div v-else-if="activeMode === 'chat'" class="sidebar-chat-list" role="list" aria-label="聊天会话">
            <div
              v-for="chat in chatTabs"
              :key="chat.id"
              class="sidebar-chat-item"
              :class="{ active: chat.id === activeChatId }"
              role="listitem"
            >
              <button class="sidebar-chat-select" type="button" @click="emit('select-chat', chat.id)">
                <Icon name="message-square" :size="13" />
                <span>{{ chat.title }}</span>
              </button>
              <button
                v-if="chatTabs.length > 1"
                class="sidebar-chat-close"
                type="button"
                title="关闭聊天"
                @click.stop="emit('close-chat', chat.id)"
              >
                <Icon name="x" :size="12" />
              </button>
            </div>
          </div>
        </div>

        <div ref="settingsDockRef" class="sidebar-settings-dock">
          <button
            v-if="activeMode === 'chat'"
            class="sidebar-new-chat-button"
            type="button"
            title="新建对话"
            @click="createMainChat"
          >
            <span class="new-chat-icon"><Icon name="plus" :size="14" /></span>
            <span class="new-chat-label">新对话</span>
          </button>

          <button
            class="sidebar-settings-button"
            :class="{ active: settingsOpen }"
            type="button"
            title="设置"
            @click.stop="toggleSettings"
          >
            <Icon name="settings" :size="14" />
            <span>设置</span>
          </button>

          <Transition name="sidebar-settings-pop">
            <div v-if="settingsOpen" class="sidebar-settings-popover" @pointerdown.stop @mousedown.stop>
              <button class="sidebar-settings-item" type="button" @click="runSettingsAction('api')">
                <Icon name="external-link" :size="14" />
                <span>API 设置</span>
              </button>
              <button class="sidebar-settings-item" type="button" @click="runSettingsAction('theme')">
                <Icon :name="theme === 'dark' ? 'sun' : 'moon'" :size="14" />
                <span>{{ theme === 'dark' ? '白天模式' : '黑夜模式' }}</span>
              </button>
              <button class="sidebar-settings-item" type="button" @click="runSettingsAction('history')">
                <Icon name="history" :size="14" />
                <span>历史备份</span>
              </button>

              <div class="sidebar-settings-group">
                <button
                  class="sidebar-settings-item"
                  :class="{ active: annotationVisible }"
                  type="button"
                  @click="runSettingsAction('annotation')"
                >
                  <Icon name="highlighter" :size="14" />
                  <span>UI 批注</span>
                </button>
                <button
                  class="sidebar-settings-item"
                  :class="{ active: codeInspectorEnabled }"
                  type="button"
                  @click="runSettingsAction('inspector')"
                >
                  <Icon name="crosshair" :size="14" />
                  <span>代码检查器</span>
                </button>
                <button class="sidebar-settings-item" type="button" @click="runSettingsAction('devTheme')">
                  <Icon name="palette" :size="14" />
                  <span>背景调试</span>
                </button>
              </div>

              <div class="sidebar-settings-group ui-settings-panel" :class="{ expanded: uiSettingsExpanded }">
                <button class="ui-settings-toggle" type="button" @click.stop="toggleUiSettingsExpanded">
                  <span class="sidebar-settings-heading">
                    <Icon name="sliders-horizontal" :size="13" />
                    <span>界面比例</span>
                  </span>
                  <Icon :name="uiSettingsExpanded ? 'chevron-up' : 'chevron-down'" :size="13" />
                </button>

                <div v-if="uiSettingsExpanded" class="ui-settings-body">
                  <div class="settings-presets">
                    <div v-for="preset in uiPresetOptions" :key="preset.key" class="settings-preset-slot">
                      <button
                        class="settings-preset-apply"
                        :class="{ active: isCurrentUiPreset(preset.key) }"
                        type="button"
                        :title="`套用${preset.label}档位`"
                        @click.stop="applyUiPreset(preset.key)"
                      >
                        <span>{{ preset.label }}</span>
                        <small>{{ Math.round(uiPresets[preset.key].promptScale * 100) }}% · {{ previewLabel(uiPresets[preset.key].promptPreviewLines) }}</small>
                      </button>
                      <button
                        class="settings-preset-save"
                        type="button"
                        :title="`保存当前比例到${preset.label}`"
                        @click.stop="saveCurrentToUiPreset(preset.key)"
                      >
                        <Icon name="save" :size="12" />
                      </button>
                    </div>
                  </div>

                  <button class="settings-reset-btn" type="button" @click.stop="resetUiSettingsDefaults">恢复默认比例</button>

                  <label class="settings-row">
                    <span>整体字体</span>
                    <span class="settings-value">{{ Math.round(uiScale * 100) }}%</span>
                  </label>
                  <input
                    class="settings-range"
                    type="range"
                    min="0.9"
                    max="1.16"
                    step="0.02"
                    :value="uiScale"
                    @input="setUiScale(Number(($event.target as HTMLInputElement).value))"
                  />

                  <label class="settings-row settings-row-spaced">
                    <span>预设条目</span>
                    <span class="settings-value">{{ Math.round(promptScale * 100) }}%</span>
                  </label>
                  <input
                    class="settings-range"
                    type="range"
                    min="1"
                    max="1.42"
                    step="0.02"
                    :value="promptScale"
                    @input="setPromptScale(Number(($event.target as HTMLInputElement).value))"
                  />

                  <label class="settings-row settings-row-spaced">
                    <span>内容预览</span>
                    <span class="settings-value">{{ promptPreviewLines === 0 ? '关闭' : `${promptPreviewLines} 行` }}</span>
                  </label>
                  <input
                    class="settings-range"
                    type="range"
                    min="0"
                    max="3"
                    step="1"
                    :value="promptPreviewLines"
                    @input="setPromptPreviewLines(Number(($event.target as HTMLInputElement).value))"
                  />
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import Icon from './Icon.vue';
import SidebarPresetList from './SidebarPresetList.vue';
import type { SidebarPresetActionPayload } from './SidebarPresetList.vue';
import WorkbenchPanel from './WorkbenchPanel.vue';
import FavoritesPanel from './FavoritesPanel.vue';

type UiPresetKey = 'compact' | 'standard' | 'large';
type UiPresetConfig = { uiScale: number; promptScale: number; promptPreviewLines: number };
type UiPresetMap = Record<UiPresetKey, UiPresetConfig>;

const props = defineProps<{
  width: number;
  collapsed: boolean;
  activePresetName: string;
  activeMode: SidebarMode;
  chatTabs: ChatSidebarItem[];
  activeChatId: string;
  annotationVisible: boolean;
  codeInspectorEnabled: boolean;
  theme: 'dark' | 'light';
  uiScale: number;
  promptScale: number;
  promptPreviewLines: number;
  uiPresets: UiPresetMap;
  uiPresetOptions: { key: UiPresetKey; label: string }[];
}>();

const emit = defineEmits<{
  'select-preset': [name: string];
  'preset-action': [payload: SidebarPresetActionPayload];
  'change-mode': [mode: SidebarMode];
  'new-chat': [];
  'select-chat': [id: string];
  'close-chat': [id: string];
  'open-api-settings': [];
  'toggle-history': [];
  'toggle-theme': [];
  'toggle-annotation': [];
  'toggle-code-inspector': [];
  'toggle-dev-theme-panel': [];
  'set-ui-scale': [value: number];
  'set-prompt-scale': [value: number];
  'set-prompt-preview-lines': [value: number];
  'apply-ui-preset': [key: UiPresetKey];
  'save-current-to-ui-preset': [key: UiPresetKey];
  'reset-ui-settings-defaults': [];
}>();

type SidebarMode = 'presets' | 'workbench' | 'favorites' | 'chat';
type ChatSidebarItem = { id: string; title: string };
type SettingsAction = 'api' | 'theme' | 'history' | 'annotation' | 'inspector' | 'devTheme';

const settingsOpen = ref(false);
const uiSettingsExpanded = ref(false);
const settingsDockRef = ref<HTMLElement | null>(null);
const parentDocument = inject<Document>('parentDocument', document);

function setMode(mode: SidebarMode) {
  emit('change-mode', mode);
}

function createMainChat() {
  emit('new-chat');
}

function toggleSettings() {
  settingsOpen.value = !settingsOpen.value;
}

function closeSettings() {
  settingsOpen.value = false;
}

function toggleUiSettingsExpanded() {
  uiSettingsExpanded.value = !uiSettingsExpanded.value;
}

function runSettingsAction(action: SettingsAction) {
  closeSettings();
  if (action === 'api') emit('open-api-settings');
  if (action === 'theme') emit('toggle-theme');
  if (action === 'history') emit('toggle-history');
  if (action === 'annotation') emit('toggle-annotation');
  if (action === 'inspector') emit('toggle-code-inspector');
  if (action === 'devTheme') emit('toggle-dev-theme-panel');
}

function previewLabel(lines: number) {
  return lines === 0 ? '无预览' : `${lines}行`;
}

function isCurrentUiPreset(key: UiPresetKey) {
  const preset = props.uiPresets[key];
  return (
    Math.abs(props.uiScale - preset.uiScale) < 0.001 &&
    Math.abs(props.promptScale - preset.promptScale) < 0.001 &&
    props.promptPreviewLines === preset.promptPreviewLines
  );
}

function setUiScale(value: number) {
  emit('set-ui-scale', value);
}

function setPromptScale(value: number) {
  emit('set-prompt-scale', value);
}

function setPromptPreviewLines(value: number) {
  emit('set-prompt-preview-lines', value);
}

function applyUiPreset(key: UiPresetKey) {
  emit('apply-ui-preset', key);
}

function saveCurrentToUiPreset(key: UiPresetKey) {
  emit('save-current-to-ui-preset', key);
}

function resetUiSettingsDefaults() {
  emit('reset-ui-settings-defaults');
}

function closeSettingsFromPointer(event: Event) {
  const target = event.target as Node | null;
  if (!settingsOpen.value || !target) return;
  if (settingsDockRef.value?.contains(target)) return;
  closeSettings();
}

function closeSettingsFromKey(event: KeyboardEvent) {
  if (event.key === 'Escape') closeSettings();
}

onMounted(() => {
  document.addEventListener('pointerdown', closeSettingsFromPointer, true);
  document.addEventListener('mousedown', closeSettingsFromPointer, true);
  document.addEventListener('click', closeSettingsFromPointer, true);
  parentDocument.addEventListener('pointerdown', closeSettingsFromPointer, true);
  parentDocument.addEventListener('mousedown', closeSettingsFromPointer, true);
  parentDocument.addEventListener('click', closeSettingsFromPointer, true);
  window.addEventListener('keydown', closeSettingsFromKey, true);
  parentDocument.defaultView?.addEventListener('keydown', closeSettingsFromKey, true);
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', closeSettingsFromPointer, true);
  document.removeEventListener('mousedown', closeSettingsFromPointer, true);
  document.removeEventListener('click', closeSettingsFromPointer, true);
  parentDocument.removeEventListener('pointerdown', closeSettingsFromPointer, true);
  parentDocument.removeEventListener('mousedown', closeSettingsFromPointer, true);
  parentDocument.removeEventListener('click', closeSettingsFromPointer, true);
  window.removeEventListener('keydown', closeSettingsFromKey, true);
  parentDocument.defaultView?.removeEventListener('keydown', closeSettingsFromKey, true);
});
</script>

<style scoped>
.left-sidebar {
  flex-shrink: 0;
  position: relative;
  display: flex;
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border-right: 1px solid var(--pm-sidebar-edge);
  overflow: visible;
}
.left-sidebar::before,
.left-sidebar::after {
  display: none;
}
.left-sidebar.collapsed {
  min-width: 0;
  overflow: hidden;
  border-right: 0;
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  box-shadow: none;
}
.sidebar-content {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: visible;
  padding: 12px 8px 16px 6px;
  gap: 8px;
  /* No internal dividers — the sidebar reads as one continuous glass surface. */
  background: transparent;
}
.sidebar-mode-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 0 0 auto;
  padding: 0 0 6px;
}
.sidebar-mode-button {
  width: 100%;
  min-height: 34px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
  font-size: 13px;
  font-weight: 520;
  text-align: left;
  transition:
    background 0.12s ease,
    color 0.12s ease;
}
.sidebar-mode-button:hover {
  background: var(--pm-row-hover);
  color: var(--pm-text);
}
.sidebar-mode-button.active {
  background: var(--pm-row-active);
  color: var(--pm-text);
}
.sidebar-main-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.sidebar-settings-dock {
  position: relative;
  flex: 0 0 auto;
  padding-top: 5px;
  display: grid;
  gap: 7px;
}
.sidebar-new-chat-button {
  position: relative;
  width: 100%;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 8px 10px;
  border: 0;
  border-radius: 16px;
  background: var(--pm-ai-capsule);
  color: var(--pm-text);
  cursor: pointer;
  font-size: 13px;
  font-weight: 620;
  text-align: center;
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.14);
  transition:
    background 0.12s ease,
    color 0.12s ease;
}
.new-chat-icon {
  position: absolute;
  left: calc(50% - 46px);
  top: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-50%);
}
.new-chat-label {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
}
.sidebar-new-chat-button:hover {
  background: color-mix(in srgb, var(--pm-ai-capsule) 82%, var(--pm-text) 8%);
}
.sidebar-settings-button {
  width: 100%;
  min-height: 32px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
  font-size: 13px;
  font-weight: 520;
  text-align: left;
  transition:
    background 0.12s ease,
    color 0.12s ease;
}
.sidebar-settings-button:hover,
.sidebar-settings-button.active {
  background: var(--pm-row-hover);
  color: var(--pm-text);
}
.sidebar-settings-popover {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 8px);
  z-index: 820;
  width: auto;
  max-height: min(520px, calc(100vh - 72px));
  overflow-y: auto;
  padding: 10px;
  border: 0;
  border-radius: 16px;
  background: var(--pm-left-entry-editor-bg);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(32px) saturate(140%);
  -webkit-backdrop-filter: blur(32px) saturate(140%);
}
.sidebar-settings-group {
  margin-top: 5px;
  padding-top: 5px;
  border-top: 1px solid color-mix(in srgb, var(--pm-divider) 52%, transparent);
}
.ui-settings-panel {
  padding-bottom: 3px;
}
.sidebar-settings-heading,
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.sidebar-settings-heading {
  flex: 1;
  justify-content: flex-start;
  padding: 0;
  color: var(--pm-text-subtle);
  font-size: 11px;
  font-weight: 650;
}
.ui-settings-toggle {
  width: 100%;
  min-height: 31px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 9px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--pm-text-subtle);
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease;
}
.ui-settings-toggle:hover,
.ui-settings-panel.expanded .ui-settings-toggle {
  background: var(--pm-row-hover);
  color: var(--pm-text);
}
.ui-settings-body {
  padding: 8px 2px 0;
}
.sidebar-settings-item {
  width: 100%;
  min-height: 31px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 9px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
  font-size: 12px;
  font-weight: 530;
  text-align: left;
  transition:
    background 0.12s ease,
    color 0.12s ease;
}
.sidebar-settings-item:hover,
.sidebar-settings-item.active {
  background: var(--pm-row-hover);
  color: var(--pm-text);
}
.settings-presets {
  display: grid;
  gap: 6px;
  margin-bottom: 8px;
}
.settings-preset-slot {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px;
  gap: 5px;
}
.settings-preset-apply,
.settings-reset-btn {
  border: 0;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
}
.settings-preset-apply {
  min-width: 0;
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  padding: 5px 8px;
  border-radius: 7px;
  text-align: left;
}
.settings-preset-apply span {
  color: var(--pm-text);
  font-size: 12px;
  font-weight: 620;
}
.settings-preset-apply small {
  min-width: 0;
  overflow: hidden;
  color: var(--pm-text-subtle);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.settings-preset-save {
  width: 28px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--pm-text-subtle);
  cursor: pointer;
}
.settings-preset-apply:hover,
.settings-preset-apply.active,
.settings-preset-save:hover,
.settings-reset-btn:hover {
  background: var(--pm-row-hover);
  color: var(--pm-text);
}
.settings-reset-btn {
  width: 100%;
  height: 28px;
  margin-bottom: 11px;
  border-radius: 7px;
  font-size: 12px;
}
.settings-row {
  color: var(--pm-text-muted);
  font-size: 11px;
}
.settings-row-spaced {
  margin-top: 10px;
}
.settings-value {
  color: var(--pm-text);
  font-variant-numeric: tabular-nums;
}
.settings-range {
  width: 100%;
  margin: 7px 0 9px;
  accent-color: var(--pm-accent);
}
.sidebar-settings-pop-enter-active,
.sidebar-settings-pop-leave-active {
  transition:
    opacity 0.14s ease,
    transform 0.14s ease;
}
.sidebar-settings-pop-enter-from,
.sidebar-settings-pop-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
.sidebar-chat-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  height: 100%;
  overflow-y: auto;
}
.sidebar-chat-item {
  width: 100%;
  min-height: 32px;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 4px 0 0;
  border-radius: 8px;
  background: transparent;
  color: var(--pm-text-muted);
  font-size: 12px;
  font-weight: 520;
  transition:
    background 0.12s ease,
    color 0.12s ease;
}
.sidebar-chat-item:hover,
.sidebar-chat-item.active {
  background: var(--pm-row-active);
  color: var(--pm-text);
}
.sidebar-chat-select {
  min-width: 0;
  height: 32px;
  flex: 1;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 6px 6px 9px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.sidebar-chat-select span {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sidebar-chat-close {
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
  opacity: 0;
}
.sidebar-chat-item:hover .sidebar-chat-close,
.sidebar-chat-item.active .sidebar-chat-close {
  opacity: 1;
}
.sidebar-chat-close:hover {
  background: var(--pm-row-hover);
  color: var(--pm-text);
}
</style>
