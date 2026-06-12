<template>
  <div
    class="ai-assistant"
    :class="[
      variant === 'dock' ? 'mode-drawer' : `mode-${variant}`,
    ]"
  >
    <template v-if="variant === 'side' || variant === 'main'">
      <div :class="variant === 'main' ? 'main-chat-workspace' : 'side-chat-panel'">
        <div ref="messagesRef" class="messages-area" :class="variant === 'main' ? 'main-messages' : 'side-messages'">
          <div v-if="!activeMessages.length" class="empty-ai text-xs text-slate-600">
            {{ variant === 'main' ? '像 Codex 一样在主区域开始一段新聊天。' : 'AI 对话会显示在这里' }}
          </div>
          <div v-for="msg in activeMessages" :key="msg.id" class="ai-message" :class="msg.role">
            <div class="msg-content">{{ msg.content }}</div>
            <div
              v-if="msg.actionPlan && activePendingActionPlan?.messageId === msg.id"
              class="action-preview-card"
            >
              <div class="action-preview-head">
                <span>待确认操作</span>
                <small>{{ msg.actionPlan.actions.length }} 项</small>
              </div>
              <div class="action-preview-summary">{{ msg.actionPlan.summary }}</div>
              <ul class="action-preview-list">
                <li
                  v-for="(item, index) in buildPreviewItems(msg.actionPlan.actions)"
                  :key="`${msg.id}-${index}`"
                  :class="{ skipped: item.skipped }"
                >
                  {{ item.summary }}
                </li>
              </ul>
              <div class="action-preview-actions">
                <button
                  class="action-btn-secondary"
                  :disabled="ai.isExecutingAction"
                  @click="ai.rejectActionPlan(msg.id, activeSessionId)"
                >
                  取消
                </button>
                <button
                  class="action-btn-primary"
                  :disabled="ai.isExecutingAction"
                  @click="ai.confirmActionPlan(msg.id, activeSessionId)"
                >
                  {{ ai.isExecutingAction ? '执行中' : '确认执行' }}
                </button>
              </div>
            </div>
          </div>
          <div v-if="activeGenerating" class="ai-message assistant">
            <div class="msg-content typing"><span class="dot" /><span class="dot" /><span class="dot" /></div>
          </div>
        </div>

        <div v-if="variant === 'main'" class="main-chat-composer-shell" :style="mainComposerStyle">
          <button
            class="main-chat-reset-btn"
            type="button"
            title="恢复默认大小"
            @mousedown.stop
            @click="resetMainComposerLayout"
          >
            <Icon name="refresh-cw" :size="12" />
          </button>
          <button
            class="composer-resize-edge composer-resize-top"
            type="button"
            title="调整聊天框高度"
            @mousedown.stop.prevent="onMainComposerResize($event, 'top')"
          />
          <button
            class="composer-resize-edge composer-resize-left"
            type="button"
            title="调整聊天框宽度"
            @mousedown.stop.prevent="onMainComposerResize($event, 'left')"
          />
          <button
            class="main-chat-resize-handle"
            type="button"
            title="调整聊天框比例"
            @mousedown.stop.prevent="onMainComposerResize($event, 'corner')"
          >
            <span class="composer-resize-corner" />
          </button>
          <div class="input-dock main-chat-dock">
            <div class="input-row">
              <input v-model="inputText" class="ai-input" placeholder="Ask Codex anything" @keydown.enter="send" />
            </div>

            <div class="input-tool-row">
              <div class="model-picker">
                <button class="model-pill" title="选择模型" @click.stop="toggleModelMenu">
                  <span class="model-pill-name">{{ modelLabel }}</span>
                  <small v-if="modelGroupLabel" class="model-pill-group">{{ modelGroupLabel }}</small>
                  <Icon name="chevron-down" :size="12" />
                </button>
                <Transition name="model-menu-pop">
                  <div v-if="modelMenuOpen" class="model-menu" @pointerdown.stop @mousedown.stop>
                    <button
                      v-for="option in ai.modelOptions"
                      :key="modelOptionKey(option)"
                      class="model-option"
                      :class="{ active: isModelOptionActive(option) }"
                      type="button"
                      @click="selectModelOption(option)"
                    >
                      <span class="model-option-name">{{ option.name }}</span>
                      <small class="model-option-group">{{ option.profileName }}</small>
                    </button>
                    <div v-if="!ai.modelOptions.length" class="model-menu-empty">先在设置里获取模型</div>
                  </div>
                </Transition>
              </div>
              <button class="send-btn" :disabled="!inputText.trim() || activeGenerating" @click="send">
                <Icon name="arrow-up" :size="14" :stroke-width="2" />
              </button>
            </div>
          </div>
        </div>
        <div v-else class="side-chat-composer">
          <input v-model="inputText" class="ai-input" placeholder="Ask Codex anything" @keydown.enter="send" />
          <button class="send-btn" :disabled="!inputText.trim() || activeGenerating" @click="send">
            <Icon name="arrow-up" :size="14" :stroke-width="2" />
          </button>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="overlay-shell" :class="{ expanded: ai.drawerExpanded }" :style="dockShellStyle">
        <div
          class="overlay-panel"
          :class="{ expanded: ai.drawerExpanded, compact: isDrawerCompact, empty: isDrawerEmpty }"
          :style="drawerStyle"
        >
          <button
            class="dock-resize-edge dock-resize-top"
            type="button"
            title="调整聊天框高度"
            @mousedown.stop.prevent="onDockResize($event, 'top')"
          />
          <button
            class="dock-resize-edge dock-resize-left"
            type="button"
            title="调整聊天框宽度"
            @mousedown.stop.prevent="onDockResize($event, 'left')"
          />
          <button
            class="dock-resize-edge dock-resize-right"
            type="button"
            title="调整聊天框宽度"
            @mousedown.stop.prevent="onDockResize($event, 'right')"
          />
          <button
            class="dock-resize-corner"
            type="button"
            title="调整聊天框大小"
            @mousedown.stop.prevent="onDockResize($event, 'corner')"
          >
            <span />
          </button>
          <template v-if="ai.drawerExpanded">
            <div class="drawer-handle" @mousedown.stop.prevent="onDrawerResize">
              <div class="handle-bar" />
            </div>

            <div class="overlay-topline" @mousedown.stop.prevent="onDockMove">
              <button class="ai-btn" title="恢复默认位置大小" @click="resetDockLayout">
                <Icon name="refresh-cw" :size="13" />
              </button>
              <button class="ai-btn" title="收起 AI 助手" @click="collapseDrawer">
                <Icon name="chevron-down" :size="13" />
              </button>
              <button class="ai-btn" title="设置" @click="openConfig">
                <Icon name="settings-2" :size="13" />
              </button>
            </div>

            <div ref="messagesRef" class="messages-area">
              <div v-if="!activeMessages.length" class="empty-ai text-xs text-slate-600">
                询问预设结构、条目顺序或提示词问题。
              </div>
              <div v-for="msg in activeMessages" :key="msg.id" class="ai-message" :class="msg.role">
                <div class="msg-content">{{ msg.content }}</div>
                <div
                  v-if="msg.actionPlan && activePendingActionPlan?.messageId === msg.id"
                  class="action-preview-card"
                >
                  <div class="action-preview-head">
                    <span>待确认操作</span>
                    <small>{{ msg.actionPlan.actions.length }} 项</small>
                  </div>
                  <div class="action-preview-summary">{{ msg.actionPlan.summary }}</div>
                  <ul class="action-preview-list">
                    <li
                      v-for="(item, index) in buildPreviewItems(msg.actionPlan.actions)"
                      :key="`${msg.id}-${index}`"
                      :class="{ skipped: item.skipped }"
                    >
                      {{ item.summary }}
                    </li>
                  </ul>
                  <div class="action-preview-actions">
                    <button
                      class="action-btn-secondary"
                      :disabled="ai.isExecutingAction"
                      @click="ai.rejectActionPlan(msg.id, activeSessionId)"
                    >
                      取消
                    </button>
                    <button
                      class="action-btn-primary"
                      :disabled="ai.isExecutingAction"
                      @click="ai.confirmActionPlan(msg.id, activeSessionId)"
                    >
                      {{ ai.isExecutingAction ? '执行中' : '确认执行' }}
                    </button>
                  </div>
                </div>
              </div>
              <div v-if="activeGenerating" class="ai-message assistant">
                <div class="msg-content typing"><span class="dot" /><span class="dot" /><span class="dot" /></div>
              </div>
            </div>
          </template>

          <div class="input-dock">
            <div class="input-row">
              <input v-model="inputText" class="ai-input" placeholder="Ask Codex anything" @keydown.enter="send" />
            </div>

            <div class="input-tool-row">
              <div class="dock-tool-group">
                <button
                  class="tool-pill icon-only dock-move-handle"
                  type="button"
                  title="移动聊天框"
                  @mousedown.stop.prevent="onDockMove"
                >
                  <Icon name="grip-vertical" :size="13" />
                </button>
                <button
                  class="tool-pill icon-only dock-reset-btn"
                  type="button"
                  title="恢复默认位置大小"
                  @mousedown.stop
                  @click="resetDockLayout"
                >
                  <Icon name="refresh-cw" :size="12" />
                </button>
              </div>
              <button
                class="tool-pill icon-only settings-trigger"
                title="AI 设置"
                @click="openConfig"
              >
                <Icon name="settings-2" :size="13" />
              </button>
              <div class="model-picker">
                <button class="model-pill" title="选择模型" @click.stop="toggleModelMenu">
                  <span class="model-pill-name">{{ modelLabel }}</span>
                  <small v-if="modelGroupLabel" class="model-pill-group">{{ modelGroupLabel }}</small>
                  <Icon name="chevron-down" :size="12" />
                </button>
                <Transition name="model-menu-pop">
                  <div v-if="modelMenuOpen" class="model-menu" @pointerdown.stop @mousedown.stop>
                    <button
                      v-for="option in ai.modelOptions"
                      :key="modelOptionKey(option)"
                      class="model-option"
                      :class="{ active: isModelOptionActive(option) }"
                      type="button"
                      @click="selectModelOption(option)"
                    >
                      <span class="model-option-name">{{ option.name }}</span>
                      <small class="model-option-group">{{ option.profileName }}</small>
                    </button>
                    <div v-if="!ai.modelOptions.length" class="model-menu-empty">先在设置里获取模型</div>
                  </div>
                </Transition>
              </div>
              <button class="send-btn" :disabled="!inputText.trim() || activeGenerating" @click="send">
                <Icon name="arrow-up" :size="14" :stroke-width="2" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import Icon from './Icon.vue';
import { useAiStore } from '../stores/ai';
import { useManagerStore } from '../stores/manager';
import { startParentDrag } from '../utils/drag';
import { buildAiPresetActionPreviewItems, type AiPresetAction } from '../utils/aiPresetActions';
import type { AiModelFlatOption } from '../utils/aiApiConfig';

const ai = useAiStore();
const manager = useManagerStore();
const parentDoc = inject<Document>('parentDocument')!;
const props = withDefaults(defineProps<{ variant?: 'dock' | 'side' | 'main'; sessionId?: string; title?: string }>(), {
  variant: 'dock',
  sessionId: '',
  title: '新聊天',
});
const emit = defineEmits<{
  'open-config': [];
  'session-title': [payload: { sessionId: string; title: string }];
}>();
const variant = computed(() => props.variant);
const activeSessionId = computed(() => props.sessionId || undefined);
const activeMessages = computed(() => ai.getMessages(activeSessionId.value));
const activeGenerating = computed(() => ai.isSessionGenerating(activeSessionId.value));
const activePendingActionPlan = computed(() => ai.getPendingActionPlan(activeSessionId.value));

const inputText = ref('');
const modelMenuOpen = ref(false);
const messagesRef = ref<HTMLElement>();
const isDrawerCompact = computed(() => ai.dockComposerHeight < 148);
const isDrawerEmpty = computed(() => ai.drawerExpanded && !activeMessages.value.length);
const activeModelOption = computed(() => {
  return (
    ai.modelOptions.find(item => item.name === ai.config.model && item.profileId === ai.config.activeProfileId) ??
    ai.modelOptions.find(item => item.name === ai.config.model) ??
    null
  );
});
const modelLabel = computed(() => activeModelOption.value?.name || ai.config.model || ai.config.proxyPreset || 'AI 模型');
const modelGroupLabel = computed(() => activeModelOption.value?.profileName || '');
const drawerStyle = computed(() => ({
  height: ai.drawerExpanded ? (isDrawerEmpty.value ? 'auto' : `${ai.dockComposerHeight}px`) : `${ai.dockComposerHeight}px`,
}));
const dockShellStyle = computed(() => ({
  width: `min(${ai.dockComposerWidth}px, calc(100% - var(--pm-ai-dock-side-gap, 96px)))`,
  transform: `translate(calc(-50% + ${ai.dockComposerOffsetX}px), ${ai.dockComposerOffsetY}px)`,
}));
const mainComposerStyle = computed(() => ({
  width: `min(${ai.mainComposerWidth}px, calc(100% - 48px))`,
  height: `${ai.mainComposerHeight}px`,
}));

function buildPreviewItems(actions: AiPresetAction[]) {
  return buildAiPresetActionPreviewItems(actions, {
    isPromptLocked: ({ targetPreset, promptId, promptName, fromIndex }) => {
      const prompts = targetPreset === 'main' ? manager.mainPrompts : manager.secondPrompts;
      const prompt = promptId || promptName
        ? prompts.find(item => String((item as any).identifier ?? item.id ?? '') === promptId || item.name === promptName)
        : fromIndex !== undefined
          ? prompts[fromIndex]
          : undefined;
      const key = String((prompt as any)?.identifier ?? prompt?.id ?? '');
      return Boolean(key && manager.isPromptLocked(key, targetPreset));
    },
  });
}

function openConfig() {
  ai.showConfig = true;
  emit('open-config');
}

function toggleModelMenu() {
  modelMenuOpen.value = !modelMenuOpen.value;
}

function modelOptionKey(option: AiModelFlatOption) {
  return `${option.profileId}:${option.name}:${option.group}`;
}

function isModelOptionActive(option: AiModelFlatOption) {
  return option.name === ai.config.model && option.profileId === ai.config.activeProfileId;
}

function selectModelOption(option: AiModelFlatOption) {
  ai.config.activeProfileId = option.profileId;
  ai.config.model = option.name;
  ai.config.useProxyPreset = false;
  ai.saveConfig();
  modelMenuOpen.value = false;
}

function buildChatTitle(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return '新聊天';
  return normalized.length > 18 ? `${normalized.slice(0, 18)}…` : normalized;
}

function send() {
  const sentText = inputText.value.trim();
  if (!sentText) return;

  let context = '';
  if (manager.preset) {
    context = `预设名: ${manager.presetName}\n条目数: ${manager.preset.prompts.length}\n条目列表:\n`;
    manager.preset.prompts.forEach((p, i) => {
      context += `${i + 1}. [${p.role}] ${p.name} (${p.enabled ? '启用' : '禁用'})\n`;
    });
  }

  if (props.sessionId && variant.value !== 'dock') {
    emit('session-title', { sessionId: props.sessionId, title: buildChatTitle(sentText) });
  }

  ai.sendMessage(sentText, context, activeSessionId.value);
  if (variant.value === 'dock') expandDrawer();
  inputText.value = '';
  nextTick(() => {
    messagesRef.value?.scrollTo(0, messagesRef.value.scrollHeight);
  });
}

function expandDrawer() {
  ai.setDrawerExpanded(true);
}

function collapseDrawer() {
  ai.setDrawerExpanded(false);
}

let drawerStartY = 0;
let drawerStartH = 0;
let dockStartX = 0;
let dockStartY = 0;
let dockStartW = 0;
let dockStartH = 0;
let dockStartOffsetX = 0;
let dockStartOffsetY = 0;
let mainComposerStartX = 0;
let mainComposerStartY = 0;
let mainComposerStartW = 0;
let mainComposerStartH = 0;

function onDrawerResize(e: MouseEvent) {
  if (e.button !== 0) return;

  drawerStartY = e.screenY;
  drawerStartH = ai.dockComposerHeight;

  startParentDrag(parentDoc, {
    startEvent: e,
    cursor: 'row-resize',
    onMove: ev => {
      ai.dockComposerHeight = Math.max(210, Math.min(drawerStartH - (ev.screenY - drawerStartY), 560));
    },
  });
}

function onDockResize(e: MouseEvent, direction: 'top' | 'left' | 'right' | 'corner') {
  if (e.button !== 0) return;

  dockStartX = e.screenX;
  dockStartY = e.screenY;
  dockStartW = ai.dockComposerWidth;
  dockStartH = ai.dockComposerHeight;

  startParentDrag(parentDoc, {
    startEvent: e,
    cursor: direction === 'corner' ? 'nwse-resize' : direction === 'top' ? 'ns-resize' : 'ew-resize',
    onMove: ev => {
      if (direction === 'left') {
        ai.dockComposerWidth = Math.max(300, Math.min(dockStartW + (dockStartX - ev.screenX) * 2, 760));
      }
      if (direction === 'right' || direction === 'corner') {
        ai.dockComposerWidth = Math.max(300, Math.min(dockStartW + (ev.screenX - dockStartX) * 2, 760));
      }
      if (direction === 'top' || direction === 'corner') {
        ai.dockComposerHeight = Math.max(74, Math.min(dockStartH - (ev.screenY - dockStartY), 560));
      }
    },
  });
}

function resetDockLayout() {
  ai.dockComposerWidth = 400;
  ai.dockComposerHeight = 93;
  ai.dockComposerOffsetX = 0;
  ai.dockComposerOffsetY = 0;
}

function resetMainComposerLayout() {
  ai.mainComposerWidth = 620;
  ai.mainComposerHeight = 93;
}

function onDockMove(e: MouseEvent) {
  if (e.button !== 0) return;
  const target = e.target as HTMLElement | null;
  const fromMoveHandle = Boolean(target?.closest?.('.dock-move-handle'));
  if (!fromMoveHandle && target?.closest?.('button,input,select,textarea,.model-picker')) return;

  dockStartX = e.screenX;
  dockStartY = e.screenY;
  dockStartOffsetX = ai.dockComposerOffsetX;
  dockStartOffsetY = ai.dockComposerOffsetY;

  startParentDrag(parentDoc, {
    startEvent: e,
    cursor: 'move',
    onMove: ev => {
      ai.dockComposerOffsetX = Math.max(-360, Math.min(dockStartOffsetX + (ev.screenX - dockStartX), 360));
      ai.dockComposerOffsetY = Math.max(-420, Math.min(dockStartOffsetY + (ev.screenY - dockStartY), 220));
    },
  });
}

function onMainComposerResize(e: MouseEvent, direction: 'corner' | 'top' | 'left') {
  if (e.button !== 0) return;

  mainComposerStartX = e.screenX;
  mainComposerStartY = e.screenY;
  mainComposerStartW = ai.mainComposerWidth;
  mainComposerStartH = ai.mainComposerHeight;

  startParentDrag(parentDoc, {
    startEvent: e,
    cursor: direction === 'corner' ? 'nwse-resize' : direction === 'top' ? 'ns-resize' : 'ew-resize',
    onMove: ev => {
      if (direction === 'corner' || direction === 'left') {
        const widthDelta = direction === 'left'
          ? (mainComposerStartX - ev.screenX) * 2
          : (ev.screenX - mainComposerStartX) * 2;
        ai.mainComposerWidth = Math.max(380, Math.min(mainComposerStartW + widthDelta, 900));
      }
      if (direction === 'corner' || direction === 'top') {
        ai.mainComposerHeight = Math.max(74, Math.min(mainComposerStartH - (ev.screenY - mainComposerStartY), 180));
      }
    },
  });
}

function closeModelMenuFromPointer(event: Event) {
  if (!modelMenuOpen.value) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest?.('.model-picker')) return;
  modelMenuOpen.value = false;
}

function closeModelMenuFromKey(event: KeyboardEvent) {
  if (event.key === 'Escape') modelMenuOpen.value = false;
}

onMounted(() => {
  document.addEventListener('pointerdown', closeModelMenuFromPointer, true);
  parentDoc?.addEventListener('pointerdown', closeModelMenuFromPointer, true);
  window.addEventListener('keydown', closeModelMenuFromKey, true);
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', closeModelMenuFromPointer, true);
  parentDoc?.removeEventListener('pointerdown', closeModelMenuFromPointer, true);
  window.removeEventListener('keydown', closeModelMenuFromKey, true);
});
</script>

<style scoped>
.ai-assistant.mode-drawer {
  position: absolute;
  inset: 0;
  z-index: 100;
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  pointer-events: none;
}
.ai-assistant.mode-side {
  position: relative;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.ai-assistant.mode-main {
  position: relative;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--pm-bg-workspace);
}
.main-chat-workspace {
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.side-chat-panel {
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.side-messages {
  flex: 1;
  padding: 14px 14px 96px;
}
.main-messages {
  flex: 1;
  width: min(760px, 100%);
  align-self: center;
  padding: 34px 24px 18px;
}
.overlay-shell {
  position: absolute;
  left: 50%;
  bottom: var(--pm-ai-dock-bottom, 26px);
  width: min(var(--pm-ai-dock-width, 400px), calc(100% - var(--pm-ai-dock-side-gap, 96px)));
  transform: translateX(-50%);
  pointer-events: none;
  transition:
    width 0.2s cubic-bezier(0, 0, 0.2, 1),
    transform 0.2s cubic-bezier(0, 0, 0.2, 1);
}
.overlay-shell.expanded {
  width: min(var(--pm-ai-dock-width, 400px), calc(100% - var(--pm-ai-dock-side-gap, 96px)));
}
.overlay-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: visible;
  border: 1px solid var(--pm-border);
  border-radius: 22px;
  background: var(--pm-ai-capsule);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
  pointer-events: auto;
  backdrop-filter: blur(32px) saturate(140%);
  -webkit-backdrop-filter: blur(32px) saturate(140%);
}
.overlay-panel.expanded {
  border-color: var(--pm-border);
  background: var(--pm-ai-surface);
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.26);
  overflow: hidden;
  backdrop-filter: blur(34px) saturate(140%);
  -webkit-backdrop-filter: blur(34px) saturate(140%);
}
.overlay-panel.expanded.empty {
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.2);
}
.dock-resize-edge {
  position: absolute;
  z-index: 4;
  border: 0;
  background: transparent;
  opacity: 0;
}
.dock-resize-edge::after {
  content: '';
  position: absolute;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pm-text) 18%, transparent);
  opacity: 0;
  transition: opacity 0.12s ease, background 0.12s ease;
}
.dock-resize-edge:hover::after,
.dock-resize-corner:hover span {
  opacity: 1;
}
.dock-resize-top {
  top: -7px;
  left: 24px;
  right: 24px;
  height: 14px;
  cursor: ns-resize;
}
.dock-resize-top::after {
  left: 50%;
  top: 6px;
  width: 46px;
  height: 1px;
  transform: translateX(-50%);
}
.dock-resize-left,
.dock-resize-right {
  top: 20px;
  bottom: 20px;
  width: 14px;
  cursor: ew-resize;
}
.dock-resize-left {
  left: -7px;
}
.dock-resize-right {
  right: -7px;
}
.dock-resize-left::after,
.dock-resize-right::after {
  top: 50%;
  width: 1px;
  height: 42px;
  transform: translateY(-50%);
}
.dock-resize-left::after {
  left: 6px;
}
.dock-resize-right::after {
  right: 6px;
}
.dock-resize-corner {
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: 5;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--pm-text-subtle);
  cursor: nwse-resize;
}
.dock-resize-corner span {
  width: 8px;
  height: 8px;
  border-top: 1px solid currentColor;
  border-right: 1px solid currentColor;
  opacity: 0.62;
  transform: rotate(-45deg);
  transition: opacity 0.12s ease, color 0.12s ease;
}
.drawer-handle {
  height: 9px;
  flex: 0 0 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: row-resize;
}
.handle-bar {
  width: 48px;
  height: 1px;
  border-radius: 999px;
  background: var(--pm-split-line);
  transition: background 0.12s;
}
.drawer-handle:hover .handle-bar {
  background: var(--pm-text-muted);
}
.overlay-topline {
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 4px 10px 0;
  color: var(--pm-text);
  flex: 0 0 auto;
  cursor: move;
}
.overlay-panel.expanded .overlay-topline {
  min-height: 30px;
  width: auto;
  max-width: 100%;
  align-self: stretch;
  gap: 2px;
  margin: 0;
  padding: 6px 10px 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.overlay-panel.empty .overlay-topline {
  display: none;
}
.ai-btn {
  width: var(--pm-btn-size-sm, 26px);
  height: var(--pm-btn-size-sm, 26px);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--pm-btn-radius, 8px);
  border: 1px solid transparent;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s;
}
.ai-btn:hover {
  color: var(--pm-text);
  background: var(--pm-btn-hover);
}
.ai-btn.ghost {
  border-radius: var(--pm-btn-radius-pill, 999px);
}
.messages-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 6px 18px 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: transparent;
}
.overlay-panel.expanded .messages-area {
  flex: 1;
  margin: 0;
  padding: 8px 16px 10px;
  mask-image: linear-gradient(180deg, transparent 0, #000 14px, #000 calc(100% - 12px), transparent);
}
.ai-message {
  max-width: 92%;
}
.ai-message.user {
  align-self: flex-end;
}
.ai-message.assistant {
  align-self: flex-start;
  max-width: 100%;
}
.msg-content {
  padding: 7px 12px;
  border-radius: 14px;
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid transparent;
  box-shadow: none;
}
.ai-message.user .msg-content {
  background: var(--pm-bg-elevated);
  border-color: var(--pm-border);
  color: var(--pm-text);
}
.ai-message.assistant .msg-content {
  padding: 0 2px;
  background: transparent;
  border: 0;
  border-radius: 0;
  color: var(--pm-text);
}
.action-preview-card {
  width: min(100%, 420px);
  margin-top: 9px;
  padding: 10px;
  border: 1px solid var(--pm-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--pm-bg-elevated) 72%, transparent);
  color: var(--pm-text);
}
.action-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  font-weight: 650;
}
.action-preview-head small {
  color: var(--pm-text-subtle);
  font-size: 11px;
  font-weight: 500;
}
.action-preview-summary {
  margin-top: 6px;
  color: var(--pm-text-muted);
  font-size: 12px;
  line-height: 1.45;
}
.action-preview-list {
  display: grid;
  gap: 5px;
  margin: 9px 0 0;
  padding: 0;
  list-style: none;
}
.action-preview-list li {
  padding-left: 10px;
  border-left: 2px solid var(--pm-border-strong);
  color: var(--pm-text);
  font-size: 12px;
  line-height: 1.45;
}
.action-preview-list li.skipped {
  color: var(--pm-text-subtle);
  border-left-color: var(--pm-warning);
}
.action-preview-actions {
  display: flex;
  justify-content: flex-end;
  gap: 7px;
  margin-top: 11px;
}
.action-btn-primary,
.action-btn-secondary {
  height: 28px;
  padding: 0 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    opacity 0.12s,
    background 0.12s,
    border-color 0.12s;
}
.action-btn-primary {
  border: 1px solid var(--pm-accent);
  background: var(--pm-accent);
  color: var(--pm-accent-text);
}
.action-btn-secondary {
  border: 1px solid var(--pm-border);
  background: transparent;
  color: var(--pm-text-muted);
}
.action-btn-primary:hover:not(:disabled) {
  background: var(--pm-pill-primary-bg-hover);
}
.action-btn-secondary:hover:not(:disabled) {
  border-color: var(--pm-border-strong);
  background: var(--pm-bg-hover);
  color: var(--pm-text);
}
.action-btn-primary:disabled,
.action-btn-secondary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.typing {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--pm-text-subtle);
  animation: bounce 1.2s infinite;
}
.dot:nth-child(2) {
  animation-delay: 0.2s;
}
.dot:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes bounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-6px);
  }
}
.input-dock {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: var(--pm-ai-dock-min-height, 93px);
  padding: 14px 16px 12px;
  background: transparent;
  flex: 0 0 auto;
}
.side-chat-composer {
  flex: 0 0 auto;
  min-height: 62px;
  margin: 0 14px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px 14px;
  border: 0;
  border-radius: 16px;
  background: var(--pm-ai-capsule);
}
.main-chat-composer-shell {
  position: relative;
  flex: 0 0 auto;
  margin: 0 auto 22px;
}
.main-chat-dock {
  height: 100%;
  min-height: 100%;
  padding: 14px 16px 12px;
  border: 0;
  border-radius: 18px;
  background: var(--pm-ai-capsule);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(32px) saturate(140%);
  -webkit-backdrop-filter: blur(32px) saturate(140%);
}
.main-chat-dock .input-row {
  flex: 1 1 auto;
  align-items: flex-start;
}
.main-chat-dock .ai-input {
  height: 100%;
}
.main-chat-resize-handle {
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: 2;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--pm-text-subtle);
  cursor: nwse-resize;
  opacity: 0.58;
  transition:
    background 0.12s ease,
    opacity 0.12s ease,
    color 0.12s ease;
}
.main-chat-resize-handle .composer-resize-corner {
  width: 8px;
  height: 8px;
  border-top: 1px solid currentColor;
  border-right: 1px solid currentColor;
  transform: rotate(-45deg);
}
.main-chat-reset-btn {
  position: absolute;
  top: -8px;
  left: -8px;
  z-index: 3;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--pm-text-subtle);
  cursor: pointer;
  opacity: 0.62;
  transition:
    background 0.12s ease,
    color 0.12s ease,
    opacity 0.12s ease;
}
.main-chat-reset-btn:hover {
  background: var(--pm-row-hover);
  color: var(--pm-text);
  opacity: 1;
}
.composer-resize-edge {
  position: absolute;
  z-index: 2;
  border: 0;
  background: transparent;
  opacity: 0;
}
.composer-resize-edge:hover {
  opacity: 1;
}
.composer-resize-edge::after {
  content: '';
  position: absolute;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pm-text) 18%, transparent);
}
.composer-resize-top {
  top: -6px;
  left: 20px;
  right: 20px;
  height: 12px;
  cursor: ns-resize;
}
.composer-resize-top::after {
  left: 50%;
  top: 5px;
  width: 42px;
  height: 1px;
  transform: translateX(-50%);
}
.composer-resize-left {
  top: 18px;
  bottom: 18px;
  left: -6px;
  width: 12px;
  cursor: ew-resize;
}
.composer-resize-left::after {
  left: 5px;
  top: 50%;
  width: 1px;
  height: 42px;
  transform: translateY(-50%);
}
.main-chat-resize-handle:hover {
  background: var(--pm-row-hover);
  color: var(--pm-text);
  opacity: 1;
}
.input-row,
.input-tool-row {
  width: 100%;
  display: flex;
  align-items: center;
}
.input-tool-row {
  gap: 8px;
  min-height: 30px;
  padding: 0;
}
.overlay-panel.expanded .input-dock {
  min-height: var(--pm-ai-dock-min-height, 93px);
  margin: 0;
  padding: 14px 16px 12px;
  border: 0;
  border-top: 1px solid var(--pm-divider);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.overlay-panel.empty .messages-area {
  display: none;
}
.tool-pill,
.model-pill {
  min-width: 0;
  height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border-radius: var(--pm-btn-radius-pill, 999px);
  border: 1px solid transparent;
  background: transparent;
  color: var(--pm-text-muted);
  font-size: 12px;
  transition:
    background 0.12s,
    border-color 0.12s,
    color 0.12s,
    opacity 0.12s;
}
.tool-pill {
  cursor: pointer;
}
.tool-pill.icon-only {
  width: 28px;
  flex: 0 0 28px;
  justify-content: center;
  padding: 0;
}
.tool-pill:hover,
.model-pill:hover {
  color: var(--pm-text);
  background: var(--pm-btn-hover);
  border-color: transparent;
}
.dock-tool-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
}
.dock-move-handle {
  cursor: move;
}
.dock-reset-btn {
  cursor: pointer;
}
.model-picker {
  position: relative;
  min-width: 0;
  margin-right: auto;
}
.model-pill {
  margin-right: auto;
  max-width: 260px;
  cursor: pointer;
}
.model-pill-name {
  min-width: 0;
  max-width: 158px;
  overflow: hidden;
  color: var(--pm-text);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 650;
}
.model-pill-group {
  min-width: 0;
  max-width: 82px;
  overflow: hidden;
  color: var(--pm-text-subtle);
  font-size: 11px;
  font-weight: 520;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.model-pill:hover .model-pill-name {
  color: var(--pm-text);
}
.model-menu {
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  z-index: 40;
  width: min(260px, calc(100vw - 56px));
  max-height: 280px;
  display: grid;
  gap: 3px;
  padding: 7px;
  overflow: auto;
  border: 0;
  border-radius: 10px;
  background: color-mix(in srgb, var(--pm-bg-elevated) 94%, #000);
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.34);
}
.model-option {
  min-height: 34px;
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 0 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
  text-align: left;
}
.model-option:hover,
.model-option.active {
  background: var(--pm-row-hover);
  color: var(--pm-text);
}
.model-option-name {
  min-width: 0;
  flex: 0 1 auto;
  overflow: hidden;
  color: var(--pm-text);
  font-size: 13px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.model-option-group {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  color: var(--pm-text-subtle);
  font-size: 11px;
  font-weight: 520;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.model-menu-empty {
  padding: 9px 10px;
  color: var(--pm-text-subtle);
  font-size: 12px;
}
.model-menu-pop-enter-active,
.model-menu-pop-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}
.model-menu-pop-enter-from,
.model-menu-pop-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
.ai-input {
  width: 100%;
  height: 32px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--pm-text);
  font-size: 14px;
  font-weight: 500;
  outline: none;
}
.ai-input::placeholder {
  color: var(--pm-text-subtle);
  font-weight: 400;
}
.send-btn {
  width: 32px;
  height: 32px;
  margin-left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 0;
  background: var(--pm-send-bg);
  color: var(--pm-send-fg);
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  transition:
    transform 0.12s,
    opacity 0.12s,
    box-shadow 0.12s;
}
.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.16);
}
.send-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.overlay-panel.compact .messages-area {
  display: none;
}
.overlay-panel.compact .overlay-topline {
  min-height: 29px;
  padding-block: 3px;
}
.overlay-panel.compact .input-dock {
  padding-top: 5px;
}
.empty-ai {
  align-self: center;
  margin: auto 0;
  padding: 4px 18px 8px;
  color: var(--pm-text-subtle);
  text-align: center;
}
@media (max-width: 700px) {
  .overlay-shell,
  .overlay-shell.expanded {
    width: calc(100% - 24px);
    bottom: 14px;
  }
  .dock-config {
    display: none;
  }
}
</style>
