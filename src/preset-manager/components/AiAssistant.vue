<template>
  <div
    v-if="ai.visible"
    class="ai-assistant"
    :class="[ai.mode, { snapped: !!ai.snappedEdge, [`snap-${ai.snappedEdge}`]: !!ai.snappedEdge }]"
  >
    <template v-if="ai.mode === 'drawer'">
      <div class="drawer-shell" :class="{ expanded: ai.drawerExpanded }">
        <div class="drawer-container" :class="{ expanded: ai.drawerExpanded, compact: isDrawerCompact }" :style="drawerStyle">
          <template v-if="ai.drawerExpanded">
            <div class="drawer-handle" @mousedown.stop.prevent="onDrawerResize">
              <div class="handle-bar" />
            </div>

            <div class="ai-header">
              <button class="ai-title" title="收起 AI 助手" @click="collapseDrawer">
                <i class="fas fa-sparkles text-xs" />
                <span>AI 助手</span>
                <i class="fas fa-chevron-down text-xs" />
              </button>
              <div class="ai-actions">
                <button class="ai-btn" title="脱出为独立窗口" @click="detach">
                  <i class="fas fa-external-link-alt text-xs" />
                </button>
                <button class="ai-btn" title="设置" @click="ai.showConfig = !ai.showConfig">
                  <i class="fas fa-cog text-xs" />
                </button>
                <button class="ai-btn" title="关闭" @click="ai.toggleVisible()">
                  <i class="fas fa-times text-xs" />
                </button>
              </div>
            </div>

            <AiConfig v-if="ai.showConfig && !isDrawerCompact" />

            <div ref="messagesRef" class="messages-area">
              <div v-if="!ai.messages.length" class="empty-ai text-slate-600 text-xs">
                描述你的需求，AI 会帮你分析和优化预设。
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
            <button class="dock-toggle" :title="ai.drawerExpanded ? '收起 AI 助手' : '展开 AI 助手'" @click="toggleDrawer">
              <i :class="['fas text-xs', ai.drawerExpanded ? 'fa-chevron-down' : 'fa-sparkles']" />
            </button>
            <input
              v-model="inputText"
              class="ai-input"
              placeholder="向 AI 助手描述你想调整的预设..."
              @focus="expandDrawer"
              @keydown.enter="send"
            />
            <button class="ai-btn dock-config" title="设置" @click="ai.showConfig = !ai.showConfig; expandDrawer()">
              <i class="fas fa-cog text-xs" />
            </button>
            <button class="send-btn" :disabled="!inputText.trim() || ai.isGenerating" @click="send">
              <i class="fas fa-paper-plane text-xs" />
            </button>
            <button class="ai-btn dock-close" title="关闭" @click="ai.toggleVisible()">
              <i class="fas fa-times text-xs" />
            </button>
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
            <button class="ai-btn" title="关闭" @click="ai.toggleVisible()">
              <i class="fas fa-times text-xs" />
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
            <i class="fas fa-paper-plane text-xs" />
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
const drawerStyle = computed(() => ({
  height: ai.drawerExpanded ? `${ai.drawerHeight}px` : '46px',
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

function toggleDrawer() {
  ai.setDrawerExpanded(!ai.drawerExpanded);
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
      ai.drawerHeight = Math.max(150, Math.min(drawerStartH - (ev.screenY - drawerStartY), 520));
    },
  });
}
</script>

<style scoped>
.ai-assistant.drawer {
  position: absolute;
  bottom: 10px;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  justify-content: center;
  padding-inline: 18px;
  pointer-events: none;
}
.drawer-shell {
  width: min(820px, calc(100vw - 96px));
  pointer-events: none;
}
.drawer-shell.expanded {
  width: min(860px, calc(100vw - 110px));
}
.drawer-container {
  display: flex;
  flex-direction: column;
  background: transparent;
  overflow: visible;
  pointer-events: auto;
}
.drawer-container.expanded {
  background:
    radial-gradient(circle at 20% 0%, color-mix(in srgb, var(--pm-accent) 11%, transparent), transparent 36%),
    linear-gradient(180deg, color-mix(in srgb, var(--pm-bg-soft) 35%, transparent), transparent 140px),
    var(--pm-ai-surface);
  border: 1px solid var(--pm-border-strong);
  border-radius: 16px;
  box-shadow: 0 22px 70px rgba(0, 0, 0, 0.28);
  overflow: hidden;
  backdrop-filter: blur(18px);
}
.drawer-handle {
  height: 9px;
  flex: 0 0 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: row-resize;
}
.drawer-handle:hover .handle-bar {
  background: var(--pm-text-muted);
}
.handle-bar {
  width: 46px;
  height: 1px;
  border-radius: 999px;
  background: var(--pm-split-line);
  transition: background 0.12s;
}
.ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
  padding: 4px 10px 3px;
  border-bottom: 0;
  color: var(--pm-text);
  flex: 0 0 auto;
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
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--pm-text-subtle);
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.ai-btn:hover {
  color: var(--pm-text);
  background: var(--pm-bg-hover);
  border-color: var(--pm-border);
}
.messages-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: transparent;
}
.ai-message {
  max-width: 88%;
}
.ai-message.user {
  align-self: flex-end;
}
.ai-message.assistant {
  align-self: flex-start;
}
.msg-content {
  padding: 8px 11px;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  border: 1px solid var(--pm-border);
}
.ai-message.user .msg-content {
  background: var(--pm-accent);
  border-color: var(--pm-accent);
  color: var(--pm-accent-text);
}
.ai-message.assistant .msg-content {
  background: color-mix(in srgb, var(--pm-bg-elevated) 66%, transparent);
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
  align-items: center;
  gap: 6px;
  min-height: 46px;
  padding: 6px 8px 8px;
  border-top: 1px solid transparent;
  background: transparent;
  flex: 0 0 auto;
}
.drawer-container.expanded .input-dock {
  margin: 0 8px 8px;
  border: 1px solid var(--pm-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--pm-bg) 64%, transparent);
}
.drawer-container:not(.expanded) .input-dock {
  max-width: 100%;
  margin: 0 auto;
  border: 1px solid var(--pm-border);
  border-radius: 999px;
  background: var(--pm-ai-capsule);
  box-shadow: 0 16px 46px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(16px);
}
.dock-toggle {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid transparent;
  background: var(--pm-bg-hover);
  color: var(--pm-text);
  cursor: pointer;
}
.ai-input {
  flex: 1;
  height: 32px;
  min-width: 0;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--pm-text);
  font-size: 12px;
  outline: none;
}
.ai-input:focus {
  background: color-mix(in srgb, var(--pm-input-bg) 68%, transparent);
  border-color: var(--pm-border);
}
.send-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: none;
  background: var(--pm-accent);
  color: var(--pm-accent-text);
  cursor: pointer;
  transition: all 0.12s;
}
.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}
.send-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.capsule-config {
  position: absolute;
  right: 0;
  bottom: 54px;
  width: min(360px, 80vw);
  overflow: hidden;
  border: 1px solid var(--pm-border);
  border-radius: 12px;
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
.drawer-container.compact .messages-area {
  display: none;
}
.drawer-container.compact .ai-header {
  min-height: 29px;
  padding-block: 3px;
}
.drawer-container.compact .input-dock {
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
  padding: 18px;
  color: var(--pm-text-subtle);
}
.detached-input {
  border-top-color: var(--pm-divider);
  background: color-mix(in srgb, var(--pm-bg) 45%, transparent);
}

@media (max-width: 700px) {
  .ai-assistant.drawer {
    padding-inline: 10px;
  }
  .drawer-shell,
  .drawer-shell.expanded {
    width: calc(100vw - 28px);
  }
  .dock-close,
  .dock-config {
    display: none;
  }
}
</style>
