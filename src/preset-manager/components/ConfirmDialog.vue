<template>
  <Transition name="confirm-pop">
    <div
      v-if="confirmDialog.visible"
      class="confirm-layer"
      data-preset-manager-floating-panel="confirm"
      @keydown.esc.stop.prevent="confirmDialog.cancel"
    >
      <div
        class="confirm-backdrop"
        :class="{ anchored: confirmDialog.options?.anchor }"
        @click.self="confirmDialog.cancel"
      >
        <section
          ref="confirmCardRef"
          class="confirm-card"
          :class="{ danger: confirmDialog.options?.tone === 'danger', anchored: confirmDialog.options?.anchor }"
          :style="confirmCardStyle"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preset-manager-confirm-title"
        >
          <header class="confirm-head">
            <div>
              <h3 id="preset-manager-confirm-title">{{ confirmDialog.options?.title }}</h3>
              <p>{{ confirmDialog.options?.message }}</p>
            </div>
            <button class="confirm-icon-btn" title="关闭" @click="confirmDialog.cancel">
              <Icon name="x" :size="13" />
            </button>
          </header>

          <div v-if="confirmDialog.options?.details" class="confirm-details">
            {{ confirmDialog.options.details }}
          </div>

          <footer class="confirm-actions">
            <button class="confirm-btn secondary" @click="confirmDialog.cancel">
              {{ confirmDialog.options?.cancelLabel ?? '取消' }}
            </button>
            <button class="confirm-btn primary" :class="{ danger: confirmDialog.options?.tone === 'danger' }" @click="confirmDialog.confirmAction">
              {{ confirmDialog.options?.confirmLabel ?? '确认' }}
            </button>
          </footer>
        </section>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import Icon from './Icon.vue';
import { useConfirmStore } from '../stores/confirm';

const confirmDialog = useConfirmStore();
const confirmCardRef = ref<HTMLElement | null>(null);

const confirmCardStyle = computed(() => {
  const anchor = confirmDialog.options?.anchor;
  if (!anchor) return {};

  const cardWidth = 340;
  const cardHeight = confirmCardRef.value?.offsetHeight ?? 156;
  const margin = 10;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const preferredLeft = anchor.x + (anchor.width ?? 0) + 8;
  const fallbackLeft = anchor.x - cardWidth - 8;
  const left = preferredLeft + cardWidth + margin <= viewportWidth
    ? preferredLeft
    : fallbackLeft >= margin
      ? fallbackLeft
      : Math.max(margin, viewportWidth - cardWidth - margin);
  const top = Math.max(margin, Math.min(anchor.y - 8, viewportHeight - cardHeight - margin));

  return {
    '--confirm-left': `${left}px`,
    '--confirm-top': `${top}px`,
  };
});
</script>

<style scoped>
.confirm-layer {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
}
.confirm-backdrop {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: color-mix(in srgb, var(--pm-bg) 54%, rgba(0, 0, 0, 0.34));
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.confirm-backdrop.anchored {
  display: block;
  padding: 0;
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.confirm-card {
  width: min(340px, 100%);
  border: 1px solid var(--pm-border-strong);
  border-radius: 10px;
  background: color-mix(in srgb, var(--pm-bg-panel) 94%, transparent);
  color: var(--pm-text);
  box-shadow: var(--pm-shadow);
  overflow: hidden;
}
.confirm-card.anchored {
  position: absolute;
  left: var(--confirm-left);
  top: var(--confirm-top);
  width: min(340px, calc(100vw - 20px));
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.38);
}
.confirm-card.danger {
  border-color: color-mix(in srgb, var(--pm-danger) 46%, var(--pm-border-strong));
}
.confirm-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px;
  gap: 10px;
  padding: 12px 12px 9px;
}
.confirm-head h3 {
  margin: 0;
  color: var(--pm-text);
  font-size: 14px;
  font-weight: 650;
  line-height: 1.25;
}
.confirm-head p {
  margin: 6px 0 0;
  color: var(--pm-text-muted);
  font-size: 12px;
  line-height: 1.45;
  white-space: pre-wrap;
}
.confirm-icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: var(--pm-btn-radius, 8px);
  background: transparent;
  color: var(--pm-text-subtle);
  cursor: pointer;
}
.confirm-icon-btn:hover {
  background: var(--pm-bg-hover);
  color: var(--pm-text);
}
.confirm-details {
  margin: 0 12px 1px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--pm-text-subtle);
  font-size: 11.5px;
  line-height: 1.45;
  white-space: pre-wrap;
}
.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  padding: 11px 12px 12px;
}
.confirm-btn {
  min-width: 62px;
  height: 28px;
  padding: 0 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 620;
  cursor: pointer;
}
.confirm-btn.secondary {
  border: 1px solid var(--pm-border);
  background: transparent;
  color: var(--pm-text-muted);
}
.confirm-btn.secondary:hover {
  border-color: var(--pm-border-strong);
  background: var(--pm-bg-hover);
  color: var(--pm-text);
}
.confirm-btn.primary {
  border: 1px solid var(--pm-accent);
  background: var(--pm-accent);
  color: var(--pm-accent-text);
}
.confirm-btn.primary.danger {
  border-color: var(--pm-danger);
  background: var(--pm-danger);
  color: #ffffff;
}
.confirm-pop-enter-active,
.confirm-pop-leave-active {
  transition: opacity 0.14s ease;
}
.confirm-pop-enter-from,
.confirm-pop-leave-to {
  opacity: 0;
}
.confirm-pop-enter-active .confirm-card,
.confirm-pop-leave-active .confirm-card {
  transition: transform 0.14s ease;
}
.confirm-pop-enter-from .confirm-card,
.confirm-pop-leave-to .confirm-card {
  transform: translateY(6px) scale(0.985);
}
</style>
