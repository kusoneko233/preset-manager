<template>
  <div
    class="ai-assistant"
    :class="[ai.mode, { snapped: !!ai.snappedEdge, [`snap-${ai.snappedEdge}`]: !!ai.snappedEdge }]"
  >
    <template v-if="ai.mode === 'drawer'">
      <div class="overlay-shell" :class="{ expanded: ai.drawerExpanded }">
        <div
          class="overlay-panel"
          :class="{ expanded: ai.drawerExpanded, compact: isDrawerCompact, empty: isDrawerEmpty }"
          :style="drawerStyle"
        >
          <template v-if="ai.drawerExpanded">
            <div class="drawer-handle" @mousedown.stop.prevent="onDrawerResize">
              <div class="handle-bar" />
            </div>

            <div class="overlay-topline">
              <button class="ai-btn" title="收起 AI 助手" @click="collapseDrawer">
                <i class="fas fa-chevron-down text-xs" />
              </button>
              <button class="ai-btn" title="脱出为独立窗口" @click="detach">
                <i class="fas fa-external-link-alt text-xs" />
              </button>
              <button class="ai-btn" title="设置" @click="ai.showConfig = !ai.showConfig">
                <i class="fas fa-cog text-xs" />
              </button>
            </div>

            <AiConfig v-if="ai.showConfig && !isDrawerCompact" />

            <div ref="messagesRef" class="messages-area">
              <div v-if="!ai.messages.length" class="empty-ai text-slate-600 text-xs">
                询问预设结构、条目顺序或提示词问题。
              </div>
              <div v-for="msg in ai.messages" :key="msg.id" class="ai-message" :class="msg.role">
                <div class="msg-content">{{ msg.content }}</div>
              </div>
              <div v-if="ai.isGenerating" class="ai-message assistant">
                <div class="msg-content typing">
                  <span class="dot" /><span class="dot" /><span class="dot" />
                </div>
              </div>
            </div>
          </template>

          <div class="input-dock">
            <div class="input-row">
              <input
                v-model="inputText"
                class="ai-input"
                placeholder="询问预设、结构或条目"
                @keydown.enter="send"
              />
              <button class="tool-pill icon-only detach-trigger" title="独立小窗" @click="detach">
                <i class="fas fa-external-link-alt text-xs" />
              </button>
            </div>

            <div class="input-tool-row">
              <button class="tool-pill icon-only settings-trigger" title="AI 设置" @click="ai.showConfig = !ai.showConfig">
                <i class="fas fa-cog text-xs" />
              </button>
              <button class="model-pill" title="AI 模型设置" @click="ai.showConfig = !ai.showConfig">
                <span>{{ modelLabel }}</span>
                <i class="fas fa-chevron-down text-xs" />
              </button>
              <button class="send-btn" :disabled="!inputText.trim() || ai.isGenerating" @click="send">
                <i class="fas fa-arrow-up text-xs" />
              </button>
            </div>
          </div>

          <div v-if="ai.showConfig && !ai.drawerExpanded" class="capsule-config">
            <AiConfig />
          </div>
        </div>
      </div>
    </template>

    <template v-if="ai.mode === 'detached'">
      <div
        ref="detachedRef"
        class="detached-window"
        :class="{ 'snap-collapsed': !!ai.snappedEdge && !isHovering }"
        :style="detachedStyle"
        @mouseenter="isHovering = true"
        @mouseleave="isHovering = false"
      >
        <div class="ai-header" @mousedown.prevent="onDetachedDrag">
          <span class="detached-title">
            <i class="fas fa-sparkles text-xs" /> AI
          </span>
          <div class="ai-actions">
            <button class="ai-btn" title="收回到底部" @click="dock">
              <i class="fas fa-compress-arrows-alt text-xs" />
            </button>
            <button class="ai-btn" title="设置" @click="ai.showConfig = !ai.showConfig">
              <i class="fas fa-cog text-xs" />
            </button>
          </div>
        </div>

        <AiConfig v-if="ai.showConfig" />

        <div ref="detachedMsgRef" class="messages-area">
          <div v-if="!ai.messages.length" class="empty-ai text-slate-600 text-xs">
            输入消息开始对话。
          </div>
          <div v-for="msg in ai.messages" :key="msg.id" class="ai-message" :class="msg.role">
            <div class="msg-content">{{ msg.content }}</div>
          </div>
          <div v-if="ai.isGenerating" class="ai-message assistant">
            <div class="msg-content typing">
              <span class="dot" /><span class="dot" /><span class="dot" />
            </div>
          </div>
        </div>

        <div class="input-dock detached-input">
          <input
            v-model="inputText"
            class="ai-input"
            placeholder="输入消息..."
            @keydown.enter="send"
          />
          <button class="send-btn" :disabled="!inputText.trim() || ai.isGenerating" @click="send">
            <i class="fas fa-arrow-up text-xs" />
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useAiStore } from '../stores/ai';
import { useManagerStore } from '../stores/manager';
import AiConfig from './AiConfig.vue';
import { startParentDrag } from '../utils/drag';

const ai = useAiStore();
const manager = useManagerStore();
const parentDoc = inject<Document>('parentDocument')!;

const inputText = ref('');
const messagesRef = ref<HTMLElement>();
const detachedMsgRef = ref<HTMLElement>();
const detachedRef = ref<HTMLElement>();
const isHovering = ref(false);
const isDrawerCompact = computed(() => ai.drawerHeight < 148);
const isDrawerEmpty = computed(() => ai.drawerExpanded && !ai.messages.length && !ai.showConfig);
const modelLabel = computed(() => ai.config.model || ai.config.proxyPreset || 'AI 模型');
const drawerStyle = computed(() => ({
  height: ai.drawerExpanded ? (isDrawerEmpty.value ? 'auto' : `${ai.drawerHeight}px`) : 'auto',
}));

const detachedStyle = computed(() => {
  if (ai.snappedEdge && !isHovering.value) {
    const styles: Record<string, string> = { position: 'fixed' };
    switch (ai.snappedEdge) {
      case 'right': Object.assign(styles, { right: '0', top: '50%', transform: 'translateY(-50%)', width: '32px', height: '120px' }); break;
      case 'left': Object.assign(styles, { left: '0', top: '50%', transform: 'translateY(-50%)', width: '32px', height: '120px' }); break;
      case 'bottom': Object.assign(styles, { bottom: '0', left: '50%', transform: 'translateX(-50%)', width: '120px', height: '32px' }); break;
      case 'top': Object.assign(styles, { top: '0', left: '50%', transform: 'translateX(-50%)', width: '120px', height: '32px' }); break;
    }
    return styles;
  }

  if (ai.snappedEdge && isHovering.value) {
    const styles: Record<string, string> = { position: 'fixed' };
    switch (ai.snappedEdge) {
      case 'right': Object.assign(styles, { right: '0', top: '10%', width: '320px', height: '80%' }); break;
      case 'left': Object.assign(styles, { left: '0', top: '10%', width: '320px', height: '80%' }); break;
      case 'bottom': Object.assign(styles, { bottom: '0', left: '10%', width: '80%', height: '300px' }); break;
      case 'top': Object.assign(styles, { top: '0', left: '10%', width: '80%', height: '300px' }); break;
    }
    return styles;
  }

  return {
    position: 'fixed',
    left: `${ai.detachedPosition.x}px`,
    top: `${ai.detachedPosition.y}px`,
    width: '320px',
    height: '400px',
  } as Record<string, string>;
});

function send() {
  if (!inputText.value.trim()) return;

  let context = '';
  if (manager.preset) {
    context = `预设名: ${manager.presetName}\n条目数: ${manager.preset.prompts.length}\n条目列表:\n`;
    manager.preset.prompts.forEach((p, i) => {
      context += `${i + 1}. [${p.role}] ${p.name} (${p.enabled ? '启用' : '禁用'})\n`;
    });
  }

  ai.sendMessage(inputText.value, context);
  expandDrawer();
  inputText.value = '';
  nextTick(() => {
    messagesRef.value?.scrollTo(0, messagesRef.value.scrollHeight);
    detachedMsgRef.value?.scrollTo(0, detachedMsgRef.value.scrollHeight);
  });
}

function detach() {
  ai.setMode('detached');
  ai.setDrawerExpanded(true);
  ai.snapToEdge(null);
}

function dock() {
  ai.setMode('drawer');
  ai.setDrawerExpanded(true);
  ai.snapToEdge(null);
}

function expandDrawer() {
  ai.setDrawerExpanded(true);
}

function collapseDrawer() {
  ai.setDrawerExpanded(false);
}

let dragStartX = 0;
let dragStartY = 0;
let dragStartPosX = 0;
let dragStartPosY = 0;
let velocityX = 0;
let velocityY = 0;
let lastMoveX = 0;
let lastMoveY = 0;
let lastMoveTime = 0;

function onDetachedDrag(e: MouseEvent) {
  if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
  ai.snapToEdge(null);

  dragStartX = e.screenX;
  dragStartY = e.screenY;
  dragStartPosX = ai.detachedPosition.x;
  dragStartPosY = ai.detachedPosition.y;
  lastMoveX = e.screenX;
  lastMoveY = e.screenY;
  lastMoveTime = Date.now();

  startParentDrag(parentDoc, {
    startEvent: e,
    cursor: 'move',
    onMove: ev => {
      const now = Date.now();
      const dt = Math.max(now - lastMoveTime, 1);
      velocityX = (ev.screenX - lastMoveX) / dt;
      velocityY = (ev.screenY - lastMoveY) / dt;
      lastMoveX = ev.screenX;
      lastMoveY = ev.screenY;
      lastMoveTime = now;

      ai.detachedPosition.x = dragStartPosX + (ev.screenX - dragStartX);
      ai.detachedPosition.y = dragStartPosY + (ev.screenY - dragStartY);
    },
    onEnd: () => {
      const speed = Math.sqrt(velocityX ** 2 + velocityY ** 2);
      if (speed > 0.5) {
        const el = document.documentElement;
        const w = el.clientWidth;
        const h = el.clientHeight;
        const finalX = ai.detachedPosition.x + velocityX * 200;
        const finalY = ai.detachedPosition.y + velocityY * 200;

        if (finalX < 0) ai.snapToEdge('left');
        else if (finalX > w - 320) ai.snapToEdge('right');
        else if (finalY < 0) ai.snapToEdge('top');
        else if (finalY > h - 200) ai.snapToEdge('bottom');
      }

      const x = ai.detachedPosition.x;
      const y = ai.detachedPosition.y;
      const el = document.documentElement;
      if (x < 10) ai.snapToEdge('left');
      else if (x > el.clientWidth - 340) ai.snapToEdge('right');
      if (y < 10) ai.snapToEdge('top');
      else if (y > el.clientHeight - 210) ai.snapToEdge('bottom');
    },
  });
}

let drawerStartY = 0;
let drawerStartH = 0;

function onDrawerResize(e: MouseEvent) {
  if (e.button !== 0) return;

  drawerStartY = e.screenY;
  drawerStartH = ai.drawerHeight;

  startParentDrag(parentDoc, {
    startEvent: e,
    cursor: 'row-resize',
    onMove: ev => {
      ai.drawerHeight = Math.max(210, Math.min(drawerStartH - (ev.screenY - drawerStartY), 560));
    },
  });
}
</script>

<style scoped>
.ai-assistant.drawer {
  position: absolute;
  inset: 0;
  z-index: 100;
  pointer-events: none;
}
.overlay-shell {
  position: absolute;
  left: 50%;
  bottom: var(--pm-ai-dock-bottom, 26px);
  width: min(var(--pm-ai-dock-width, 634px), calc(100% - var(--pm-ai-dock-side-gap, 96px)));
  transform: translateX(-50%);
  pointer-events: none;
  transition: width 0.2s cubic-bezier(0, 0, 0.2, 1), transform 0.2s cubic-bezier(0, 0, 0.2, 1);
}
.overlay-shell.expanded {
  width: min(var(--pm-ai-dock-width, 634px), calc(100% - var(--pm-ai-dock-side-gap, 96px)));
}
.overlay-panel {
  display: flex;
  flex-direction: column;
  overflow: visible;
  border: 1px solid color-mix(in srgb, var(--pm-border-strong) 46%, transparent);
  border-radius: 24px;
  background: color-mix(in srgb, var(--pm-ai-capsule) 72%, transparent);
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.16);
  pointer-events: auto;
  backdrop-filter: blur(26px) saturate(116%);
  -webkit-backdrop-filter: blur(26px) saturate(116%);
}
.overlay-panel.expanded {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  overflow: visible;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.overlay-panel.expanded.empty {
  box-shadow: none;
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
.overlay-topline,
.ai-header {
  min-height: 26px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 1px 12px 3px;
  color: var(--pm-text);
  flex: 0 0 auto;
}
.overlay-panel.expanded .overlay-topline {
  min-height: 28px;
  width: max-content;
  max-width: calc(100% - 24px);
  align-self: flex-end;
  gap: 3px;
  margin: 0 12px 7px 0;
  padding: 2px 4px;
  border: 1px solid color-mix(in srgb, var(--pm-border) 42%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--pm-ai-capsule) 20%, transparent);
  box-shadow: none;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}
.overlay-panel.empty .overlay-topline {
  display: none;
}
.ai-title,
.detached-title {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 0;
  background: transparent;
  color: var(--pm-text);
  font-weight: 600;
}
.ai-title {
  cursor: pointer;
}
.ai-title i:last-child {
  color: var(--pm-text-subtle);
}
.ai-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}
.ai-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--pm-border) 28%, transparent);
  background: var(--pm-control-highlight);
  color: var(--pm-text-muted);
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.ai-btn:hover {
  color: var(--pm-text);
  background: var(--pm-control-highlight-hover);
  border-color: color-mix(in srgb, var(--pm-border-strong) 72%, transparent);
}
.messages-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 3px 18px 7px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  background: transparent;
}
.overlay-panel.expanded .messages-area {
  flex: 1;
  margin: 0 12px 8px;
  padding: 0 2px;
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
}
.msg-content {
  padding: 7px 10px;
  border-radius: 13px;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  border: 1px solid transparent;
  box-shadow: none;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}
.ai-message.user .msg-content {
  background: color-mix(in srgb, var(--pm-accent) 92%, transparent);
  border-color: transparent;
  color: var(--pm-accent-text);
}
.ai-message.assistant .msg-content {
  background: color-mix(in srgb, var(--pm-bg-elevated) 15%, transparent);
  border-color: color-mix(in srgb, var(--pm-border) 42%, transparent);
  color: var(--pm-text);
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
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
}
.input-dock {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-height: var(--pm-ai-dock-min-height, 93px);
  padding: 10px 14px;
  background: transparent;
  flex: 0 0 auto;
}
.input-row,
.input-tool-row {
  width: 100%;
  display: flex;
  align-items: center;
}
.input-row {
  gap: 10px;
  min-height: 35px;
  align-items: flex-start;
}
.input-tool-row {
  gap: 8px;
  min-height: 30px;
  padding: 0;
}
.overlay-panel.expanded .input-dock {
  min-height: var(--pm-ai-dock-min-height, 93px);
  margin: 0;
  padding: 10px 14px;
  border: 1px solid color-mix(in srgb, var(--pm-border) 48%, transparent);
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.026), transparent),
    color-mix(in srgb, var(--pm-ai-capsule) 76%, transparent);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.045);
  backdrop-filter: blur(28px) saturate(118%);
  -webkit-backdrop-filter: blur(28px) saturate(118%);
}
.overlay-panel.empty .messages-area {
  display: none;
}
.tool-pill,
.model-pill {
  min-width: 0;
  height: 30px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--pm-border) 28%, transparent);
  background: var(--pm-control-highlight);
  color: var(--pm-text-muted);
  font-size: 12px;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.tool-pill {
  cursor: pointer;
}
.tool-pill.icon-only {
  width: 30px;
  flex: 0 0 30px;
  justify-content: center;
  padding: 0;
}
.tool-pill:hover,
.model-pill:hover {
  color: var(--pm-text);
  background: var(--pm-control-highlight-hover);
  border-color: color-mix(in srgb, var(--pm-border-strong) 72%, transparent);
}
.model-pill {
  margin-left: 0;
  max-width: 220px;
  cursor: pointer;
}
.model-pill span {
  min-width: 0;
  max-width: 190px;
  overflow: hidden;
  color: var(--pm-text-subtle);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.model-pill:hover span {
  color: var(--pm-text);
}
.ai-input {
  flex: 1;
  height: 32px;
  min-width: 0;
  padding: 0;
  border: 1px solid transparent;
  background: transparent;
  color: var(--pm-text);
  font-size: 13px;
  outline: none;
}
.ai-input::placeholder {
  color: var(--pm-text-subtle);
}
.send-btn {
  width: 34px;
  height: 34px;
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--pm-send-bg) 38%, transparent);
  background: var(--pm-send-bg);
  color: var(--pm-send-fg);
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.22);
  transition: transform 0.12s, opacity 0.12s, background 0.12s, box-shadow 0.12s;
}
.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.28);
}
.send-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.capsule-config {
  position: absolute;
  right: 0;
  bottom: 70px;
  width: min(360px, 80vw);
  overflow: hidden;
  border: 1px solid var(--pm-border);
  border-radius: 14px;
  background: var(--pm-bg-panel);
  box-shadow: var(--pm-shadow);
}
.detached-window {
  background: var(--pm-ai-surface);
  border: 1px solid var(--pm-border);
  border-radius: 12px;
  box-shadow: var(--pm-shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: opacity 0.15s ease;
  z-index: 200;
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
.detached-window .ai-header { cursor: move; }
.snap-collapsed {
  border-radius: 8px;
  overflow: hidden;
  opacity: 0.7;
  cursor: pointer;
}
.snap-collapsed:hover {
  opacity: 1;
}
.snap-collapsed .messages-area,
.snap-collapsed .input-dock,
.snap-collapsed .ai-header span {
  display: none;
}
.snap-collapsed .ai-header {
  justify-content: center;
  padding: 4px;
}
.empty-ai {
  align-self: center;
  margin: auto 0;
  padding: 4px 18px 8px;
  color: var(--pm-text-subtle);
  text-align: center;
}
.detached-input {
  min-height: 54px;
  flex-direction: row;
  align-items: center;
  gap: 7px;
  padding: 9px 10px;
  border-top-color: var(--pm-divider);
  background: color-mix(in srgb, var(--pm-bg) 45%, transparent);
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
