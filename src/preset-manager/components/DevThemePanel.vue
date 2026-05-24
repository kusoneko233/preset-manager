<template>
  <div class="dev-theme-panel" :style="panelStyle" @paste="onPaste">
    <div class="dev-theme-head" @mousedown.stop.prevent="onDragStart">
      <div>
        <strong>开发者背景面板</strong>
        <small>实时预览 · 手动保存</small>
      </div>
      <div class="dev-theme-head-actions">
        <label class="dev-theme-switch">
          <input type="checkbox" :checked="store.enabled" @change="store.setEnabled(($event.target as HTMLInputElement).checked)" />
          <span>启用</span>
        </label>
        <button class="dev-theme-icon-btn" title="回屏内" @click="snapInside">回屏内</button>
        <button class="dev-theme-icon-btn" title="关闭" @click="store.panelOpen = false">×</button>
      </div>
    </div>

    <div class="dev-theme-body">
      <section class="dev-theme-section">
        <h3>预设</h3>
        <div class="dev-theme-row">
          <select :value="store.activePresetId ?? ''" @change="selectPreset(($event.target as HTMLSelectElement).value)">
            <option value="">未保存草稿</option>
            <option v-for="preset in store.presets" :key="preset.id" :value="preset.id">{{ preset.name }}</option>
          </select>
          <button @click="saveNew">另存为</button>
          <button :disabled="!store.activePresetId" @click="saveCurrent">保存</button>
        </div>
        <div class="dev-theme-row">
          <button :disabled="!store.activePresetId" @click="renameCurrent">重命名</button>
          <button :disabled="!store.activePresetId" @click="deleteCurrent">删除</button>
          <button @click="resetDraft">重置当前编辑</button>
        </div>
      </section>

      <section class="dev-theme-section">
        <h3>应用区域</h3>
        <label v-for="target in targetOptions" :key="target.key" class="dev-theme-check">
          <input type="checkbox" :checked="store.currentTargets[target.key]" @change="store.toggleTarget(target.key)" />
          <span>{{ target.label }}</span>
        </label>
      </section>

      <section class="dev-theme-section">
        <h3>背景图</h3>
        <div class="dev-theme-drop" @click="fileInput?.click()" @dragover.prevent @drop.prevent="onDrop">
          <input ref="fileInput" class="dev-theme-file" type="file" accept="image/*" @change="onFileChange" />
          <img v-if="store.currentDraft.imageDataUrl" :src="store.currentDraft.imageDataUrl" alt="背景预览" />
          <span v-else>点击 / 拖拽 / Ctrl+V 粘贴图片</span>
        </div>
        <div class="dev-theme-row">
          <select v-model="store.currentDraft.imageFit">
            <option value="cover">cover 铺满</option>
            <option value="contain">contain 完整显示</option>
            <option value="center">center 居中</option>
            <option value="repeat">repeat 平铺</option>
          </select>
          <button @click="store.currentDraft.imageDataUrl = null">清除图片</button>
        </div>
      </section>

      <section class="dev-theme-section">
        <h3>基础质感</h3>
        <RangeControl label="缩放" css-name="background-size" suffix="%" :min="50" :max="200" :step="1" :model-value="store.currentDraft.imageScale * 100" @update:model-value="store.currentDraft.imageScale = $event / 100" />
        <RangeControl label="不透明度" css-name="opacity" suffix="%" :min="0" :max="100" :step="1" :model-value="store.currentDraft.opacity * 100" @update:model-value="store.currentDraft.opacity = $event / 100" />
        <RangeControl label="毛玻璃模糊" css-name="backdrop-filter: blur" suffix="px" :min="0" :max="64" :step="1" :model-value="store.currentDraft.blur" @update:model-value="store.currentDraft.blur = $event" />
        <RangeControl label="饱和度" css-name="filter: saturate" suffix="%" :min="0" :max="200" :step="1" :model-value="store.currentDraft.saturate * 100" @update:model-value="store.currentDraft.saturate = $event / 100" />
        <RangeControl label="亮度" css-name="filter: brightness" suffix="%" :min="50" :max="150" :step="1" :model-value="store.currentDraft.brightness * 100" @update:model-value="store.currentDraft.brightness = $event / 100" />
        <RangeControl label="对比度" css-name="filter: contrast" suffix="%" :min="50" :max="150" :step="1" :model-value="store.currentDraft.contrast * 100" @update:model-value="store.currentDraft.contrast = $event / 100" />
        <label class="dev-theme-field">
          <span>遮罩颜色 <code>background-color</code></span>
          <input v-model="store.currentDraft.maskColor" type="color" />
        </label>
        <RangeControl label="遮罩透明度" css-name="rgba alpha" suffix="%" :min="0" :max="100" :step="1" :model-value="store.currentDraft.maskOpacity * 100" @update:model-value="store.currentDraft.maskOpacity = $event / 100" />
      </section>

      <section class="dev-theme-section">
        <h3>高级效果</h3>
        <label class="dev-theme-check"><input v-model="store.currentDraft.gradientEnabled" type="checkbox" />渐变叠加</label>
        <textarea v-model="store.currentDraft.gradientCss" rows="2" />
        <label class="dev-theme-check"><input v-model="store.currentDraft.noiseEnabled" type="checkbox" />噪点纹理</label>
        <RangeControl label="噪点强度" css-name="noise opacity" suffix="%" :min="0" :max="40" :step="1" :model-value="store.currentDraft.noiseOpacity * 100" @update:model-value="store.currentDraft.noiseOpacity = $event / 100" />
        <label class="dev-theme-check"><input v-model="store.currentDraft.innerShadowEnabled" type="checkbox" />内阴影</label>
        <input v-model="store.currentDraft.innerShadowCss" />
        <label class="dev-theme-check"><input v-model="store.currentDraft.edgeHighlightEnabled" type="checkbox" />边缘高光</label>
      </section>

      <section class="dev-theme-section">
        <h3>实时 CSS</h3>
        <button @click="copyCss">复制 CSS</button>
        <pre>{{ currentCss }}</pre>
      </section>

      <section class="dev-theme-section">
        <h3>导入 / 导出</h3>
        <button @click="exportCurrent">导出当前预设</button>
        <button @click="importConfig">导入预设 JSON</button>
      </section>
    </div>

    <div v-for="handle in resizeHandles" :key="handle" :class="['dev-theme-resize', `dev-theme-resize-${handle}`]" @mousedown.stop.prevent="onResizeStart($event, handle)" />
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, inject, ref } from 'vue';
import { useDevThemeStore } from '../stores/devTheme';
import { buildDevThemeCss, type DevThemeTarget } from '../utils/devThemeCss';
import { parseDevThemeConfig, readFileAsDataUrl, sanitizePresetFileName, serializeDevThemeConfig } from '../utils/devThemeIO';
import { startParentDrag } from '../utils/drag';

const RangeControl = defineComponent({
  props: {
    label: { type: String, required: true },
    cssName: { type: String, required: true },
    suffix: { type: String, default: '' },
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    step: { type: Number, default: 1 },
    modelValue: { type: Number, required: true },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('label', { class: 'dev-theme-field' }, [
      h('span', [props.label, ' ', h('code', props.cssName), h('b', `${props.modelValue}${props.suffix}`)]),
      h('input', {
        type: 'range',
        min: props.min,
        max: props.max,
        step: props.step,
        value: props.modelValue,
        onInput: (event: Event) => emit('update:modelValue', Number((event.target as HTMLInputElement).value)),
      }),
    ]);
  },
});

const store = useDevThemeStore();
const parentDoc = inject<Document>('parentDocument')!;
const fileInput = ref<HTMLInputElement>();
const resizeHandles = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
const targetOptions: { key: DevThemeTarget; label: string }[] = [
  { key: 'sidebar', label: '左侧栏' },
  { key: 'workspace', label: '主工作区' },
  { key: 'panel', label: '弹窗面板' },
];

const panelStyle = computed(() => ({
  top: `${store.panelRect.top}px`,
  left: `${store.panelRect.left}px`,
  width: `${store.panelRect.width}px`,
  height: `${store.panelRect.height}px`,
}));

const currentCss = computed(() => buildDevThemeCss({
  enabled: store.enabled,
  targets: store.currentTargets,
  background: store.currentDraft,
}));

function clampPanelRect(rect = store.panelRect) {
  const viewport = document.documentElement;
  const minVisible = 40;
  const width = Math.max(320, Math.min(rect.width, Math.max(320, viewport.clientWidth * 0.92)));
  const height = Math.max(360, Math.min(rect.height, Math.max(360, viewport.clientHeight * 0.88)));
  return {
    width,
    height,
    left: Math.max(-width * 0.9, Math.min(rect.left, viewport.clientWidth - minVisible)),
    top: Math.max(-height * 0.9, Math.min(rect.top, viewport.clientHeight - minVisible)),
  };
}

function snapInside() {
  const viewport = document.documentElement;
  store.setPanelRect({
    ...store.panelRect,
    left: Math.max(12, Math.min(store.panelRect.left, viewport.clientWidth - store.panelRect.width - 12)),
    top: Math.max(12, Math.min(store.panelRect.top, viewport.clientHeight - store.panelRect.height - 12)),
  });
}

function onDragStart(event: MouseEvent) {
  const startX = event.screenX;
  const startY = event.screenY;
  const start = { ...store.panelRect };
  startParentDrag(parentDoc, {
    startEvent: event,
    cursor: 'move',
    onMove: ev => {
      store.panelRect = clampPanelRect({ ...start, left: start.left + ev.screenX - startX, top: start.top + ev.screenY - startY });
    },
    onEnd: () => store.setPanelRect(store.panelRect),
  });
}

function onResizeStart(event: MouseEvent, handle: typeof resizeHandles[number]) {
  const startX = event.screenX;
  const startY = event.screenY;
  const start = { ...store.panelRect };
  startParentDrag(parentDoc, {
    startEvent: event,
    cursor: handle.includes('top') === handle.includes('left') ? 'nwse-resize' : 'nesw-resize',
    onMove: ev => {
      const dx = ev.screenX - startX;
      const dy = ev.screenY - startY;
      const next = { ...start };
      if (handle.includes('right')) next.width = start.width + dx;
      if (handle.includes('left')) {
        next.width = start.width - dx;
        next.left = start.left + dx;
      }
      if (handle.includes('bottom')) next.height = start.height + dy;
      if (handle.includes('top')) {
        next.height = start.height - dy;
        next.top = start.top + dy;
      }
      store.panelRect = clampPanelRect(next);
    },
    onEnd: () => store.setPanelRect(store.panelRect),
  });
}

async function useImageFile(file: File) {
  try {
    store.currentDraft.imageDataUrl = await readFileAsDataUrl(file);
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '图片读取失败');
  }
}

function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) void useImageFile(file);
}

function onDrop(event: DragEvent) {
  const file = Array.from(event.dataTransfer?.files ?? []).find(item => item.type.startsWith('image/'));
  if (file) void useImageFile(file);
}

function onPaste(event: ClipboardEvent) {
  const file = Array.from(event.clipboardData?.files ?? []).find(item => item.type.startsWith('image/'));
  if (file) void useImageFile(file);
}

function selectPreset(id: string) {
  if (id) store.applyPreset(id);
}

function saveNew() {
  const name = prompt('新预设名称', '深色亚克力');
  if (name) store.saveAsNewPreset(name);
}

function saveCurrent() {
  if (confirm('覆盖当前预设？')) store.overwriteCurrentPreset();
}

function renameCurrent() {
  const current = store.presets.find(item => item.id === store.activePresetId);
  if (!current) return;
  const name = prompt('新名称', current.name);
  if (name) store.renamePreset(current.id, name);
}

function deleteCurrent() {
  const current = store.presets.find(item => item.id === store.activePresetId);
  if (current && confirm(`删除《${current.name}》？此操作不可恢复。`)) store.deletePreset(current.id);
}

function resetDraft() {
  if (confirm('放弃未保存的修改？')) store.resetDraft();
}

async function copyCss() {
  await navigator.clipboard.writeText(currentCss.value);
  toastr.success('CSS 已复制');
}

function downloadText(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadDataUrl(fileName: string, dataUrl: string) {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = fileName;
  anchor.click();
}

function exportCurrent() {
  const current = store.presets.find(item => item.id === store.activePresetId);
  const name = current?.name ?? '未保存背景预设';
  const baseName = sanitizePresetFileName(name);
  const imageFileName = store.currentDraft.imageDataUrl ? `${baseName}.png` : null;
  downloadText(`${baseName}.json`, serializeDevThemeConfig({
    name,
    imageFileName,
    targets: store.currentTargets,
    background: store.currentDraft,
  }), 'application/json');
  if (imageFileName && store.currentDraft.imageDataUrl) {
    downloadDataUrl(imageFileName, store.currentDraft.imageDataUrl);
  }
}

function importConfig() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const config = parseDevThemeConfig(await file.text());
      store.currentDraft = config.background;
      store.currentTargets = config.targets;
      store.saveAsNewPreset(config.name);
      if (config.imageFileName) {
        toastr.info(`已导入配置，请再手动选择图片文件：${config.imageFileName}`, '', { timeOut: 3200 });
      }
    } catch (error) {
      toastr.error(error instanceof Error ? error.message : '导入失败');
    }
  };
  input.click();
}
</script>

<style scoped>
.dev-theme-panel {
  position: absolute;
  z-index: 950;
  min-width: 320px;
  min-height: 360px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--pm-border-strong);
  border-radius: 16px;
  background: color-mix(in srgb, var(--pm-bg-panel) 92%, transparent);
  color: var(--pm-text);
  box-shadow: var(--pm-shadow);
  backdrop-filter: blur(28px) saturate(135%);
  -webkit-backdrop-filter: blur(28px) saturate(135%);
}
.dev-theme-head {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px 8px 12px;
  border-bottom: 1px solid var(--pm-divider);
  cursor: move;
}
.dev-theme-head strong,
.dev-theme-head small {
  display: block;
}
.dev-theme-head small {
  margin-top: 2px;
  color: var(--pm-text-subtle);
  font-size: 11px;
}
.dev-theme-head-actions,
.dev-theme-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.dev-theme-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 10px;
}
.dev-theme-section {
  display: grid;
  gap: 8px;
  padding: 10px 0;
  border-bottom: 1px solid var(--pm-divider);
}
.dev-theme-section h3 {
  margin: 0;
  color: var(--pm-text-muted);
  font-size: 12px;
  font-weight: 650;
}
.dev-theme-panel button,
.dev-theme-panel select,
.dev-theme-panel input,
.dev-theme-panel textarea {
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-input-bg);
  color: var(--pm-text);
}
.dev-theme-panel button {
  min-height: 28px;
  padding: 0 9px;
  cursor: pointer;
}
.dev-theme-panel button:hover:not(:disabled) {
  border-color: var(--pm-border-strong);
  background: var(--pm-bg-hover);
}
.dev-theme-panel button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.dev-theme-switch,
.dev-theme-check,
.dev-theme-field {
  display: grid;
  gap: 5px;
  color: var(--pm-text-muted);
  font-size: 12px;
}
.dev-theme-check,
.dev-theme-switch {
  display: flex;
  align-items: center;
}
.dev-theme-field span {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.dev-theme-field code {
  color: var(--pm-text-subtle);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}
.dev-theme-field b {
  color: var(--pm-text);
  font-weight: 600;
}
.dev-theme-drop {
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px dashed var(--pm-border-strong);
  border-radius: 12px;
  background: var(--pm-bg-hover);
  color: var(--pm-text-subtle);
  cursor: pointer;
}
.dev-theme-drop img {
  width: 100%;
  height: 140px;
  object-fit: cover;
}
.dev-theme-file {
  display: none;
}
.dev-theme-section pre {
  max-height: 160px;
  margin: 0;
  padding: 8px;
  overflow: auto;
  border-radius: 10px;
  background: var(--pm-bg-soft);
  color: var(--pm-text-muted);
  font-size: 11px;
  white-space: pre-wrap;
}
.dev-theme-resize {
  position: absolute;
  width: 16px;
  height: 16px;
  z-index: 2;
}
.dev-theme-resize-top-left {
  top: 0;
  left: 0;
  cursor: nwse-resize;
}
.dev-theme-resize-top-right {
  top: 0;
  right: 0;
  cursor: nesw-resize;
}
.dev-theme-resize-bottom-left {
  bottom: 0;
  left: 0;
  cursor: nesw-resize;
}
.dev-theme-resize-bottom-right {
  right: 0;
  bottom: 0;
  cursor: nwse-resize;
}
</style>
