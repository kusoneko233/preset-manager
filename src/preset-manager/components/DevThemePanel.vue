<template>
  <Teleport :to="parentFloatingRoot ?? 'body'" :disabled="!parentFloatingRoot">
    <div class="dev-theme-panel" :style="panelStyle" data-preset-manager-floating-panel="dev-theme" data-dev-theme-panel-v2 @paste="onPaste">
      <div class="dev-theme-toolbar" @pointerdown.stop.prevent="onDragStart">
        <div class="dev-theme-title">
          <strong>开发者背景</strong>
          <span>{{ store.enabled ? '实时生效' : '已暂停' }}</span>
        </div>
        <div class="dev-theme-head-actions">
          <label class="dev-theme-switch">
            <input type="checkbox" :checked="store.enabled" @change="store.setEnabled(($event.target as HTMLInputElement).checked)" />
            <span>启用</span>
          </label>
          <button type="button" class="dev-theme-icon-btn" title="复制 CSS" @click="copyCss">CSS</button>
          <button type="button" class="dev-theme-icon-btn" title="关闭" @click="store.panelOpen = false">×</button>
        </div>
      </div>

      <div class="dev-theme-shell">
        <aside class="dev-theme-sidebar">
          <section class="dev-theme-card">
            <div class="dev-theme-section-head">
              <span>当前元素</span>
              <button type="button" :disabled="!hasSelected" @click="clearSelected">清除</button>
            </div>
            <div v-if="hasSelected" class="dev-theme-selected-box">
              <code>&lt;{{ store.selectedElement?.tag }}&gt;</code>
              <b>{{ store.selectedElement?.label }}</b>
              <span>{{ store.selectedElement?.matchedCount ?? 1 }} 个命中</span>
            </div>
            <div v-else class="dev-theme-empty-box">
              <b>Alt + Shift</b>
              <span>开启检查器后点击元素。无源码定位的元素也能调样式。</span>
            </div>
          </section>

          <section class="dev-theme-card">
            <div class="dev-theme-section-head">
              <span>作用范围</span>
            </div>
            <div class="dev-theme-target-grid">
              <label v-for="target in targetOptions" :key="target.key" :class="{ active: store.currentTargets[target.key], disabled: target.key === 'selected' && !hasSelected }">
                <input type="checkbox" :checked="store.currentTargets[target.key]" :disabled="target.key === 'selected' && !hasSelected" @change="store.toggleTarget(target.key)" />
                <span>{{ target.label }}</span>
              </label>
            </div>
          </section>

          <section class="dev-theme-card">
            <div class="dev-theme-section-head">
              <span>预设</span>
            </div>
            <select :value="store.activePresetId ?? ''" @change="selectPreset(($event.target as HTMLSelectElement).value)">
              <option value="">未保存草稿</option>
              <option v-for="preset in store.presets" :key="preset.id" :value="preset.id">{{ preset.builtin ? `★ ${preset.name}` : preset.name }}</option>
            </select>
            <div class="dev-theme-button-row">
              <button type="button" @click="saveNew">另存</button>
              <button type="button" :disabled="!store.activePresetId || isBuiltinPreset" @click="saveCurrent">保存</button>
              <button type="button" :disabled="!store.activePresetId" @click="resetDraft">重置</button>
            </div>
            <div class="dev-theme-button-row">
              <button type="button" :disabled="!store.activePresetId || isBuiltinPreset" @click="renameCurrent">改名</button>
              <button type="button" :disabled="!store.activePresetId || isBuiltinPreset" @click="deleteCurrent">删除</button>
              <button type="button" @click="exportCurrent">导出</button>
              <button type="button" @click="importConfig">导入</button>
            </div>
            <p v-if="isBuiltinPreset" class="dev-theme-builtin-hint">内置基线不可改名/删除/覆盖；想保存调整请用「另存」。</p>
          </section>

          <section class="dev-theme-card">
            <div class="dev-theme-section-head">
              <span>背景图</span>
            </div>
            <button type="button" class="dev-theme-drop" @dragover.prevent @drop.prevent="onDrop" @click="fileInput?.click()">
              <input ref="fileInput" class="dev-theme-file" type="file" accept="image/*" @change="onFileChange" />
              <img v-if="store.currentDraft.imageDataUrl" :src="store.currentDraft.imageDataUrl" alt="背景预览" />
              <span v-else>点击 / 拖拽 / 粘贴图片</span>
            </button>
            <div v-if="cropState.open" class="dev-theme-cropper">
              <div class="dev-theme-crop-meta">
                <span>裁剪比例</span>
                <code>{{ cropAspect.label }} {{ cropAspect.width }}:{{ cropAspect.height }}</code>
              </div>
              <div
                class="dev-theme-crop-stage"
                :style="cropStageStyle"
                @pointerdown.stop.prevent="onCropDragStart"
                @wheel.stop.prevent="onCropWheel"
              >
                <img
                  v-if="cropSource"
                  :src="cropSource"
                  alt="裁剪预览"
                  :style="cropImageStyle"
                  draggable="false"
                />
                <div class="dev-theme-crop-frame" />
              </div>
              <div class="dev-theme-button-row">
                <button type="button" @click="applyCropPreset('left')">左半边</button>
                <button type="button" @click="applyCropPreset('right')">右半边</button>
                <button type="button" @click="applyCropPreset('center')">居中</button>
                <button type="button" @click="applyCropPreset('cover')">铺满</button>
              </div>
              <RangeControl label="取景缩放" suffix="%" :min="50" :max="260" :step="1" :model-value="Math.round(cropState.scale * 100)" :effect-info="controlInfo('imageScale')" @update:model-value="cropState.scale = $event / 100" />
              <div class="dev-theme-button-row">
                <button type="button" @click="applyImageCrop">应用裁剪</button>
                <button type="button" @click="cropState.open = false">取消</button>
              </div>
            </div>
            <div class="dev-theme-button-row">
              <select v-model="store.currentDraft.imageFit">
                <option value="cover">铺满</option>
                <option value="contain">完整</option>
                <option value="center">居中</option>
                <option value="repeat">平铺</option>
              </select>
              <button type="button" :disabled="!cropSource" @click="openImageCropper">裁剪</button>
              <button type="button" @click="clearBackgroundImage">清除</button>
            </div>
          </section>
        </aside>

        <main class="dev-theme-main">
          <section class="dev-theme-card dev-theme-live-grid">
            <RangeControl label="透明度" suffix="%" :min="0" :max="100" :step="1" :model-value="Math.round(store.currentDraft.opacity * 100)" :effect-info="controlInfo('opacity')" @update:model-value="store.currentDraft.opacity = $event / 100" />
            <RangeControl label="毛玻璃" suffix="px" :min="0" :max="64" :step="1" :model-value="store.currentDraft.blur" :effect-info="controlInfo('blur')" @update:model-value="store.currentDraft.blur = $event" />
            <RangeControl label="暗化" suffix="%" :min="0" :max="100" :step="1" :model-value="Math.round(store.currentDraft.maskOpacity * 100)" :effect-info="controlInfo('mask')" @update:model-value="store.currentDraft.maskOpacity = $event / 100" />
            <RangeControl label="图片缩放" suffix="%" :min="50" :max="200" :step="1" :model-value="Math.round(store.currentDraft.imageScale * 100)" :effect-info="controlInfo('imageScale')" @update:model-value="store.currentDraft.imageScale = $event / 100" />
            <RangeControl label="饱和度" suffix="%" :min="0" :max="200" :step="1" :model-value="Math.round(store.currentDraft.saturate * 100)" :effect-info="controlInfo('saturate')" @update:model-value="store.currentDraft.saturate = $event / 100" />
            <RangeControl label="亮度" suffix="%" :min="50" :max="150" :step="1" :model-value="Math.round(store.currentDraft.brightness * 100)" :effect-info="controlInfo('brightness')" @update:model-value="store.currentDraft.brightness = $event / 100" />
            <RangeControl label="对比度" suffix="%" :min="50" :max="150" :step="1" :model-value="Math.round(store.currentDraft.contrast * 100)" :effect-info="controlInfo('contrast')" @update:model-value="store.currentDraft.contrast = $event / 100" />
            <label class="dev-theme-color">
              <span>遮罩色</span>
              <input v-model="store.currentDraft.maskColor" type="color" />
            </label>
          </section>

          <section class="dev-theme-card dev-theme-live-grid">
            <ToggleControl label="文字颜色" v-model="store.currentDraft.textColorEnabled">
              <input v-model="store.currentDraft.textColor" type="color" />
            </ToggleControl>
            <ToggleRange label="字号" suffix="px" v-model:enabled="store.currentDraft.fontSizeEnabled" :min="8" :max="48" :step="1" v-model:value="store.currentDraft.fontSizePx" />
            <ToggleRange label="字重" v-model:enabled="store.currentDraft.fontWeightEnabled" :min="100" :max="900" :step="100" v-model:value="store.currentDraft.fontWeight" />
            <ToggleRange label="行高" v-model:enabled="store.currentDraft.lineHeightEnabled" :min="1" :max="3" :step="0.05" v-model:value="store.currentDraft.lineHeight" />
            <ToggleRange label="内边距" suffix="px" v-model:enabled="store.currentDraft.paddingEnabled" :min="0" :max="64" :step="1" v-model:value="store.currentDraft.paddingPx" />
            <ToggleRange label="外边距" suffix="px" v-model:enabled="store.currentDraft.marginEnabled" :min="0" :max="64" :step="1" v-model:value="store.currentDraft.marginPx" />
            <ToggleRange label="宽度" suffix="px" v-model:enabled="store.currentDraft.widthEnabled" :min="20" :max="800" :step="1" v-model:value="store.currentDraft.widthPx" />
            <ToggleRange label="高度" suffix="px" v-model:enabled="store.currentDraft.heightEnabled" :min="20" :max="800" :step="1" v-model:value="store.currentDraft.heightPx" />
            <ToggleRange label="圆角" suffix="px" v-model:enabled="store.currentDraft.borderRadiusEnabled" :min="0" :max="64" :step="1" v-model:value="store.currentDraft.borderRadiusPx" />
          </section>

          <section class="dev-theme-card">
            <div class="dev-theme-section-head">
              <span>装饰</span>
            </div>
            <div class="dev-theme-toggle-row">
              <label><input v-model="store.currentDraft.gradientEnabled" type="checkbox" />渐变</label>
              <label><input v-model="store.currentDraft.noiseEnabled" type="checkbox" />噪点</label>
              <label><input v-model="store.currentDraft.innerShadowEnabled" type="checkbox" />内阴影</label>
              <label><input v-model="store.currentDraft.edgeHighlightEnabled" type="checkbox" />边缘高光</label>
            </div>
            <textarea v-if="store.currentDraft.gradientEnabled" v-model="store.currentDraft.gradientCss" rows="2" spellcheck="false" />
            <textarea v-if="store.currentDraft.innerShadowEnabled" v-model="store.currentDraft.innerShadowCss" rows="2" spellcheck="false" />
            <RangeControl v-if="store.currentDraft.noiseEnabled" label="噪点强度" suffix="%" :min="0" :max="40" :step="1" :model-value="Math.round(store.currentDraft.noiseOpacity * 100)" :effect-info="controlInfo('noise')" @update:model-value="store.currentDraft.noiseOpacity = $event / 100" />
          </section>

          <section class="dev-theme-card dev-theme-css-preview">
            <div class="dev-theme-section-head">
              <span>生成 CSS</span>
              <span>{{ activeTargetLabel }}</span>
            </div>
            <pre>{{ currentCss }}</pre>
          </section>
        </main>
      </div>

      <div v-for="handle in resizeHandles" :key="handle" :class="['dev-theme-resize', `dev-theme-resize-${handle}`]" @pointerdown.stop.prevent="onResizeStart($event, handle)" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, inject, onBeforeUnmount, onMounted, ref, type PropType } from 'vue';
import { useDevThemeStore, type DevThemeSelectedElement } from '../stores/devTheme';
import { buildDevThemeCss, type DevThemeTarget } from '../utils/devThemeCss';
import { getDevThemeControlTraces, type DevThemeControlTrace } from '../utils/devThemeControls';
import { getDevThemeCropAspect, getDevThemeCropCanvasSize, getDevThemeCropPreviewSize } from '../utils/devThemeCrop';
import { parseDevThemeConfig, readFileAsDataUrl, sanitizePresetFileName, serializeDevThemeConfig } from '../utils/devThemeIO';
import { clampFloatingPanelRect } from '../utils/panelLayout';

type PanelPointerDragSession = {
  startEvent: PointerEvent;
  cursor: string;
  onMove: (event: PointerEvent) => void;
  onEnd?: () => void;
};

type ControlEffectInfo = DevThemeControlTrace & {
  activeForSelection: boolean;
  targetText: string;
};

type CropPreset = 'left' | 'right' | 'center' | 'cover';

type ImageCropState = {
  open: boolean;
  scale: number;
  offsetX: number;
  offsetY: number;
};

const RangeControl = defineComponent({
  props: {
    label: { type: String, required: true },
    suffix: { type: String, default: '' },
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    step: { type: Number, default: 1 },
    modelValue: { type: Number, required: true },
    effectInfo: { type: Object as PropType<ControlEffectInfo>, required: true },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('label', { class: 'dev-theme-range', title: `${props.effectInfo.cssProperties.join(' / ')}\n${props.effectInfo.declarations.join('\n')}` }, [
      h('span', [
        h('b', props.label),
        h('code', `${props.modelValue}${props.suffix}`),
      ]),
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

const ToggleControl = defineComponent({
  props: {
    label: { type: String, required: true },
    modelValue: { type: Boolean, required: true },
  },
  emits: ['update:modelValue'],
  setup(props, { emit, slots }) {
    return () => h('div', { class: ['dev-theme-toggle-control', { active: props.modelValue }] }, [
      h('label', [
        h('input', {
          type: 'checkbox',
          checked: props.modelValue,
          onChange: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).checked),
        }),
        h('span', props.label),
      ]),
      props.modelValue ? slots.default?.() : null,
    ]);
  },
});

const ToggleRange = defineComponent({
  props: {
    label: { type: String, required: true },
    suffix: { type: String, default: '' },
    enabled: { type: Boolean, required: true },
    value: { type: Number, required: true },
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    step: { type: Number, default: 1 },
  },
  emits: ['update:enabled', 'update:value'],
  setup(props, { emit }) {
    return () => h('div', { class: ['dev-theme-toggle-control', { active: props.enabled }] }, [
      h('label', [
        h('input', {
          type: 'checkbox',
          checked: props.enabled,
          onChange: (event: Event) => emit('update:enabled', (event.target as HTMLInputElement).checked),
        }),
        h('span', props.label),
        h('code', `${props.value}${props.suffix}`),
      ]),
      props.enabled
        ? h('input', {
          type: 'range',
          min: props.min,
          max: props.max,
          step: props.step,
          value: props.value,
          onInput: (event: Event) => emit('update:value', Number((event.target as HTMLInputElement).value)),
        })
        : null,
    ]);
  },
});

const store = useDevThemeStore();
const parentDoc = inject<Document | null>('parentDocument', null);
const parentFloatingRoot = inject<HTMLElement | null>('presetManagerParentFloatingRoot', null);
const fileInput = ref<HTMLInputElement>();
const cropState = reactive<ImageCropState>({
  open: false,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
});
const resizeHandles = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
let parentStyleEl: HTMLStyleElement | null = null;

const targetOptions: { key: DevThemeTarget; label: string }[] = [
  { key: 'sidebar', label: '侧栏' },
  { key: 'workspace', label: '工作区' },
  { key: 'panel', label: '弹窗' },
  { key: 'selected', label: '选中元素' },
];

const hasSelected = computed(() => Boolean(store.selectedElement));
const controlTraces = computed(() => getDevThemeControlTraces(store.currentDraft));
const selectedTargetActive = computed(() => hasSelected.value && store.currentTargets.selected);
const activePreset = computed(() => store.presets.find(item => item.id === store.activePresetId));
const isBuiltinPreset = computed(() => Boolean(activePreset.value?.builtin));
const cropSource = computed(() => store.currentDraft.originalImageDataUrl || store.currentDraft.imageDataUrl || '');
const cropAspect = computed(() => getDevThemeCropAspect({
  targets: store.currentTargets,
  selectedRect: store.selectedElement?.rect ?? null,
}));
const cropCanvasSize = computed(() => getDevThemeCropCanvasSize(cropAspect.value));
const cropPreviewSize = computed(() => getDevThemeCropPreviewSize(cropAspect.value));
const cropStageStyle = computed(() => ({
  aspectRatio: `${cropAspect.value.width} / ${cropAspect.value.height}`,
  width: `${cropPreviewSize.value.width}px`,
  height: `${cropPreviewSize.value.height}px`,
}));
const cropImageStyle = computed(() => ({
  transform: `translate(-50%, -50%) translate(${cropState.offsetX}px, ${cropState.offsetY}px) scale(${cropState.scale})`,
}));

const currentCss = computed(() => buildDevThemeCss({
  enabled: store.enabled,
  targets: store.currentTargets,
  background: store.currentDraft,
  selectedPaths: store.currentTargets.selected && store.selectedElement?.path ? [store.selectedElement.path] : [],
}));

const activeTargetLabel = computed(() => targetOptions.filter(target => store.currentTargets[target.key]).map(target => target.label).join(' / ') || '未选择范围');

function controlInfo(id: string): ControlEffectInfo {
  const trace = controlTraces.value.find(item => item.id === id) ?? controlTraces.value[0];
  const selectedOnly = trace.scope === 'selected-text' || trace.scope === 'selected-box';
  const activeForSelection = selectedOnly ? selectedTargetActive.value && trace.enabled : trace.enabled;
  const targetText = selectedOnly ? '选中元素' : '背景范围';
  return { ...trace, activeForSelection, targetText };
}

function onSelected(event: Event) {
  const detail = (event as CustomEvent<DevThemeSelectedElement>).detail;
  if (!detail?.path) return;
  store.setSelectedElement(detail);
}

function clearSelected() {
  store.clearSelectedElement();
}

const panelStyle = computed(() => ({
  position: 'fixed',
  top: `${store.panelRect.top}px`,
  left: `${store.panelRect.left}px`,
  width: `${store.panelRect.width}px`,
  height: `${store.panelRect.height}px`,
}));

function getPanelDocument() {
  return parentDoc ?? document;
}

function getPanelViewportSize() {
  const activeDocument = getPanelDocument();
  const activeWindow = activeDocument.defaultView ?? window;
  const doc = activeDocument.documentElement;
  return {
    width: Math.max(320, Math.round(activeWindow.innerWidth || doc.clientWidth || window.innerWidth || 1375)),
    height: Math.max(360, Math.round(activeWindow.innerHeight || doc.clientHeight || window.innerHeight || 875)),
  };
}

function clampPanelRect(rect = store.panelRect) {
  const viewport = getPanelViewportSize();
  return clampFloatingPanelRect(rect, viewport.width, viewport.height, 320, 360, 12);
}

function startPanelPointerDrag(session: PanelPointerDragSession) {
  const activeDocument = getPanelDocument();
  const activeWindow = activeDocument.defaultView ?? window;
  const previousUserSelect = activeDocument.body.style.userSelect;
  const previousCursor = activeDocument.body.style.cursor;
  const previousRootPointerEvents = parentFloatingRoot?.style.pointerEvents ?? '';
  let active = true;

  const finish = () => {
    if (!active) return;
    active = false;
    activeDocument.body.style.userSelect = previousUserSelect;
    activeDocument.body.style.cursor = previousCursor;
    if (parentFloatingRoot) parentFloatingRoot.style.pointerEvents = previousRootPointerEvents;
    activeDocument.removeEventListener('pointermove', onMove, true);
    activeDocument.removeEventListener('pointerup', finish, true);
    activeDocument.removeEventListener('pointercancel', finish, true);
    activeWindow.removeEventListener('blur', finish, true);
    session.onEnd?.();
  };

  const onMove = (event: PointerEvent) => {
    if (!active) return;
    event.preventDefault();
    if ((event.buttons & 1) !== 1) {
      finish();
      return;
    }
    session.onMove(event);
  };

  session.startEvent.preventDefault();
  activeDocument.body.style.userSelect = 'none';
  activeDocument.body.style.cursor = session.cursor;
  if (parentFloatingRoot) parentFloatingRoot.style.pointerEvents = 'auto';
  activeDocument.addEventListener('pointermove', onMove, true);
  activeDocument.addEventListener('pointerup', finish, true);
  activeDocument.addEventListener('pointercancel', finish, true);
  activeWindow.addEventListener('blur', finish, true);
}

function onDragStart(event: PointerEvent) {
  if (event.button !== 0) return;
  const startPoint = { x: event.clientX, y: event.clientY };
  const start = clampPanelRect(store.panelRect);
  store.panelRect = start;
  startPanelPointerDrag({
    startEvent: event,
    cursor: 'move',
    onMove: ev => {
      store.panelRect = clampPanelRect({ ...start, left: start.left + ev.clientX - startPoint.x, top: start.top + ev.clientY - startPoint.y });
    },
    onEnd: () => store.setPanelRect(clampPanelRect(store.panelRect)),
  });
}

function onResizeStart(event: PointerEvent, handle: typeof resizeHandles[number]) {
  if (event.button !== 0) return;
  const startPoint = { x: event.clientX, y: event.clientY };
  const start = clampPanelRect(store.panelRect);
  store.panelRect = start;
  startPanelPointerDrag({
    startEvent: event,
    cursor: handle.includes('top') === handle.includes('left') ? 'nwse-resize' : 'nesw-resize',
    onMove: ev => {
      const dx = ev.clientX - startPoint.x;
      const dy = ev.clientY - startPoint.y;
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
    onEnd: () => store.setPanelRect(clampPanelRect(store.panelRect)),
  });
}

function openImageCropper() {
  if (!cropSource.value) return;
  cropState.open = true;
  applyCropPreset('cover');
}

function applyCropPreset(preset: CropPreset) {
  cropState.open = true;
  if (preset === 'left') {
    cropState.scale = 1;
    cropState.offsetX = 72;
    cropState.offsetY = 0;
    return;
  }
  if (preset === 'right') {
    cropState.scale = 1;
    cropState.offsetX = -72;
    cropState.offsetY = 0;
    return;
  }
  if (preset === 'center') {
    cropState.scale = 1;
    cropState.offsetX = 0;
    cropState.offsetY = 0;
    return;
  }
  cropState.scale = 1.15;
  cropState.offsetX = 0;
  cropState.offsetY = 0;
}

function clearBackgroundImage() {
  store.currentDraft.imageDataUrl = null;
  store.currentDraft.originalImageDataUrl = null;
  cropState.open = false;
}

function startCropPointerDrag(session: PanelPointerDragSession) {
  const activeDocument = getPanelDocument();
  const activeWindow = activeDocument.defaultView ?? window;
  const previousUserSelect = activeDocument.body.style.userSelect;
  let active = true;

  const finish = () => {
    if (!active) return;
    active = false;
    activeDocument.body.style.userSelect = previousUserSelect;
    activeDocument.removeEventListener('pointermove', onMove, true);
    activeDocument.removeEventListener('pointerup', finish, true);
    activeDocument.removeEventListener('pointercancel', finish, true);
    activeWindow.removeEventListener('blur', finish, true);
    session.onEnd?.();
  };

  const onMove = (event: PointerEvent) => {
    if (!active) return;
    event.preventDefault();
    if ((event.buttons & 1) !== 1) {
      finish();
      return;
    }
    session.onMove(event);
  };

  session.startEvent.preventDefault();
  activeDocument.body.style.userSelect = 'none';
  activeDocument.addEventListener('pointermove', onMove, true);
  activeDocument.addEventListener('pointerup', finish, true);
  activeDocument.addEventListener('pointercancel', finish, true);
  activeWindow.addEventListener('blur', finish, true);
}

function onCropDragStart(event: PointerEvent) {
  if (event.button !== 0) return;
  const startPoint = { x: event.clientX, y: event.clientY };
  const start = { x: cropState.offsetX, y: cropState.offsetY };
  startCropPointerDrag({
    startEvent: event,
    cursor: 'move',
    onMove: ev => {
      cropState.offsetX = start.x + ev.clientX - startPoint.x;
      cropState.offsetY = start.y + ev.clientY - startPoint.y;
    },
  });
}

function onCropWheel(event: WheelEvent) {
  const next = cropState.scale + (event.deltaY > 0 ? -0.06 : 0.06);
  cropState.scale = Math.max(0.5, Math.min(2.6, Math.round(next * 100) / 100));
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片裁剪失败'));
    image.src = src;
  });
}

async function applyImageCrop() {
  if (!cropSource.value) return;
  try {
    const image = await loadImage(cropSource.value);
    const canvas = document.createElement('canvas');
    const size = cropCanvasSize.value;
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('图片裁剪失败');

    const baseScale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
    const drawScale = baseScale * cropState.scale;
    const drawWidth = image.naturalWidth * drawScale;
    const drawHeight = image.naturalHeight * drawScale;
    const drawX = (canvas.width - drawWidth) / 2 + cropState.offsetX;
    const drawY = (canvas.height - drawHeight) / 2 + cropState.offsetY;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    store.currentDraft.imageDataUrl = canvas.toDataURL('image/png');
    if (!store.currentDraft.originalImageDataUrl) store.currentDraft.originalImageDataUrl = cropSource.value;
    store.currentDraft.imageFit = 'cover';
    cropState.open = false;
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '图片裁剪失败');
  }
}

async function useImageFile(file: File) {
  try {
    const dataUrl = await readFileAsDataUrl(file);
    store.currentDraft.originalImageDataUrl = dataUrl;
    store.currentDraft.imageDataUrl = dataUrl;
    openImageCropper();
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '图片读取失败');
  }
}

function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) useImageFile(file);
}

function onDrop(event: DragEvent) {
  const file = Array.from(event.dataTransfer?.files ?? []).find(item => item.type.startsWith('image/'));
  if (file) useImageFile(file);
}

function onPaste(event: ClipboardEvent) {
  const file = Array.from(event.clipboardData?.files ?? []).find(item => item.type.startsWith('image/'));
  if (file) useImageFile(file);
}

function selectPreset(id: string) {
  if (id) store.applyPreset(id);
}

function saveNew() {
  const name = prompt('新预设名称', '背景预设');
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
  if (current && confirm(`删除「${current.name}」？`)) store.deletePreset(current.id);
}

function resetDraft() {
  if (confirm('放弃未保存修改？')) store.resetDraft();
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
  if (imageFileName && store.currentDraft.imageDataUrl) downloadDataUrl(imageFileName, store.currentDraft.imageDataUrl);
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
      store.importPreset(config.name, config.background, config.targets);
      if (config.imageFileName) toastr.info(`已导入配置，请再手动选择图片文件：${config.imageFileName}`, '', { timeOut: 3200 });
    } catch (error) {
      toastr.error(error instanceof Error ? error.message : '导入失败');
    }
  };
  input.click();
}

function buildParentPanelStyle(rootKey: string) {
  const root = `[data-preset-manager-floating-root="${rootKey}"]`;
  return `
    ${root} .dev-theme-panel {
      min-width: 320px;
      min-height: 360px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 14px;
      background: rgba(15, 16, 19, 0.82);
      color: #f7f7f7;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(26px) saturate(130%);
      -webkit-backdrop-filter: blur(26px) saturate(130%);
    }
    ${root} .dev-theme-toolbar {
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 10px 8px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.10);
      cursor: move;
    }
    ${root} .dev-theme-title,
    ${root} .dev-theme-head-actions,
    ${root} .dev-theme-button-row,
    ${root} .dev-theme-toggle-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    ${root} .dev-theme-title {
      align-items: baseline;
      gap: 8px;
    }
    ${root} .dev-theme-title strong {
      font-size: 13px;
    }
    ${root} .dev-theme-title span,
    ${root} .dev-theme-selected-box span,
    ${root} .dev-theme-empty-box span {
      color: rgba(255, 255, 255, 0.56);
      font-size: 11px;
    }
    ${root} .dev-theme-shell {
      flex: 1;
      min-height: 0;
      display: grid;
      grid-template-columns: 248px minmax(0, 1fr);
      gap: 10px;
      padding: 10px;
      overflow: hidden;
    }
    ${root} .dev-theme-sidebar,
    ${root} .dev-theme-main {
      min-height: 0;
      display: grid;
      align-content: start;
      gap: 10px;
      overflow: auto;
    }
    ${root} .dev-theme-card {
      display: grid;
      gap: 8px;
      padding: 10px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.04);
    }
    ${root} .dev-theme-section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      color: rgba(255, 255, 255, 0.76);
      font-size: 12px;
      font-weight: 650;
    }
    ${root} .dev-theme-selected-box,
    ${root} .dev-theme-empty-box,
    ${root} .dev-theme-target-grid,
    ${root} .dev-theme-live-grid {
      display: grid;
      gap: 8px;
    }
    ${root} .dev-theme-target-grid,
    ${root} .dev-theme-live-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    ${root} .dev-theme-selected-box code,
    ${root} .dev-theme-range code,
    ${root} .dev-theme-toggle-control code {
      color: #79c0ff;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 11px;
    }
    ${root} .dev-theme-selected-box b {
      overflow: hidden;
      color: rgba(255, 255, 255, 0.78);
      font-size: 11px;
      font-weight: 500;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    ${root} .dev-theme-target-grid label,
    ${root} .dev-theme-toggle-control,
    ${root} .dev-theme-color,
    ${root} .dev-theme-range {
      display: grid;
      gap: 6px;
      padding: 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.14);
      color: rgba(255, 255, 255, 0.72);
      font-size: 12px;
    }
    ${root} .dev-theme-target-grid label.active,
    ${root} .dev-theme-toggle-control.active {
      border-color: rgba(121, 192, 255, 0.48);
      background: rgba(121, 192, 255, 0.10);
    }
    ${root} .dev-theme-target-grid label.disabled {
      opacity: 0.45;
    }
    ${root} .dev-theme-range span,
    ${root} .dev-theme-toggle-control label,
    ${root} .dev-theme-color {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    ${root} .dev-theme-panel button,
    ${root} .dev-theme-panel select,
    ${root} .dev-theme-panel textarea,
    ${root} .dev-theme-panel input[type='color'] {
      min-height: 28px;
      border: 1px solid rgba(255, 255, 255, 0.10);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      color: inherit;
      font: inherit;
    }
    ${root} .dev-theme-panel button {
      padding: 0 9px;
      cursor: pointer;
    }
    ${root} .dev-theme-panel button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    ${root} .dev-theme-icon-btn {
      min-width: 30px;
    }
    ${root} .dev-theme-switch {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
    }
    ${root} .dev-theme-drop {
      min-height: 104px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-style: dashed !important;
      color: rgba(255, 255, 255, 0.56);
    }
    ${root} .dev-theme-drop img {
      width: 100%;
      height: 112px;
      object-fit: cover;
    }
    ${root} .dev-theme-file {
      display: none;
    }
    ${root} .dev-theme-cropper {
      display: grid;
      gap: 8px;
    }
    ${root} .dev-theme-crop-stage {
      position: relative;
      max-width: 100%;
      margin: 0 auto;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      background: rgba(0, 0, 0, 0.28);
      cursor: move;
      touch-action: none;
    }
    ${root} .dev-theme-crop-stage img {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 100%;
      height: 100%;
      object-fit: cover;
      user-select: none;
      pointer-events: none;
      transform-origin: center center;
    }
    ${root} .dev-theme-crop-frame {
      position: absolute;
      inset: 10px;
      border: 1px solid rgba(255, 255, 255, 0.72);
      border-radius: 8px;
      box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.28);
      pointer-events: none;
    }
    ${root} .dev-theme-toggle-control input[type='range'],
    ${root} .dev-theme-range input[type='range'] {
      width: 100%;
    }
    ${root} .dev-theme-css-preview pre {
      max-height: 220px;
      margin: 0;
      padding: 10px;
      overflow: auto;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.28);
      color: rgba(255, 255, 255, 0.72);
      font: 11px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace;
      white-space: pre-wrap;
    }
    ${root} .dev-theme-builtin-hint {
      margin: 0;
      padding: 6px 8px;
      border: 1px solid rgba(255, 209, 102, 0.25);
      border-radius: 6px;
      background: rgba(255, 209, 102, 0.08);
      color: rgba(255, 220, 150, 0.86);
      font-size: 11px;
      line-height: 1.4;
    }
    @media (max-width: 760px) {
      ${root} .dev-theme-shell,
      ${root} .dev-theme-live-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
}

function mountParentPanelStyle() {
  if (!parentDoc || !parentFloatingRoot) return;
  const rootKey = parentFloatingRoot.getAttribute('data-preset-manager-floating-root');
  if (!rootKey) return;
  parentDoc.querySelector(`[data-preset-manager-dev-theme-panel-style="${rootKey}"]`)?.remove();
  parentStyleEl = parentDoc.createElement('style');
  parentStyleEl.setAttribute('data-preset-manager-dev-theme-panel-style', rootKey);
  parentStyleEl.textContent = buildParentPanelStyle(rootKey);
  parentDoc.head.appendChild(parentStyleEl);
}

onMounted(() => {
  mountParentPanelStyle();
  document.addEventListener('preset-manager-code-inspector-select', onSelected);
});

onBeforeUnmount(() => {
  parentStyleEl?.remove();
  parentStyleEl = null;
  document.removeEventListener('preset-manager-code-inspector-select', onSelected);
});
</script>

<style scoped>
.dev-theme-panel {
  min-width: 320px;
  min-height: 360px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 14px;
  background: rgba(15, 16, 19, 0.82);
  color: #f7f7f7;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(26px) saturate(130%);
  -webkit-backdrop-filter: blur(26px) saturate(130%);
}
.dev-theme-toolbar {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.10);
  cursor: move;
}
.dev-theme-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.dev-theme-title strong {
  font-size: 13px;
}
.dev-theme-title span,
.dev-theme-selected-box span,
.dev-theme-empty-box span {
  color: rgba(255, 255, 255, 0.56);
  font-size: 11px;
}
.dev-theme-head-actions,
.dev-theme-button-row,
.dev-theme-toggle-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.dev-theme-shell {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  gap: 10px;
  padding: 10px;
  overflow: hidden;
}
.dev-theme-sidebar,
.dev-theme-main {
  min-height: 0;
  display: grid;
  align-content: start;
  gap: 10px;
  overflow: auto;
}
.dev-theme-card {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
}
.dev-theme-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: rgba(255, 255, 255, 0.76);
  font-size: 12px;
  font-weight: 650;
}
.dev-theme-selected-box,
.dev-theme-empty-box {
  display: grid;
  gap: 5px;
}
.dev-theme-selected-box code {
  color: #79c0ff;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}
.dev-theme-selected-box b {
  overflow: hidden;
  color: rgba(255, 255, 255, 0.78);
  font-size: 11px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dev-theme-target-grid,
.dev-theme-live-grid {
  display: grid;
  gap: 8px;
}
.dev-theme-target-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.dev-theme-live-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.dev-theme-target-grid label,
.dev-theme-toggle-control,
.dev-theme-color,
.dev-theme-range {
  display: grid;
  gap: 6px;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.14);
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
}
.dev-theme-target-grid label.active,
.dev-theme-toggle-control.active {
  border-color: rgba(121, 192, 255, 0.48);
  background: rgba(121, 192, 255, 0.10);
}
.dev-theme-target-grid label.disabled {
  opacity: 0.45;
}
.dev-theme-range span,
.dev-theme-toggle-control label,
.dev-theme-color {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.dev-theme-range code,
.dev-theme-toggle-control code {
  color: #79c0ff;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 11px;
}
.dev-theme-panel button,
.dev-theme-panel select,
.dev-theme-panel textarea,
.dev-theme-panel input[type='color'] {
  min-height: 28px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font: inherit;
}
.dev-theme-panel button {
  padding: 0 9px;
  cursor: pointer;
}
.dev-theme-panel button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.dev-theme-icon-btn {
  min-width: 30px;
}
.dev-theme-switch {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
}
.dev-theme-drop {
  min-height: 104px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-style: dashed !important;
  color: rgba(255, 255, 255, 0.56);
}
.dev-theme-drop img {
  width: 100%;
  height: 112px;
  object-fit: cover;
}
.dev-theme-file {
  display: none;
}
.dev-theme-cropper {
  display: grid;
  gap: 8px;
}
.dev-theme-crop-stage {
  position: relative;
  max-width: 100%;
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.28);
  cursor: move;
  touch-action: none;
}
.dev-theme-crop-stage img {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
  pointer-events: none;
  transform-origin: center center;
}
.dev-theme-crop-frame {
  position: absolute;
  inset: 10px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 8px;
  box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.28);
  pointer-events: none;
}
.dev-theme-toggle-control input[type='range'],
.dev-theme-range input[type='range'] {
  width: 100%;
}
.dev-theme-toggle-row label {
  display: flex;
  align-items: center;
  gap: 5px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
}
.dev-theme-builtin-hint {
  margin: 0;
  padding: 6px 8px;
  border: 1px solid rgba(255, 209, 102, 0.25);
  border-radius: 6px;
  background: rgba(255, 209, 102, 0.08);
  color: rgba(255, 220, 150, 0.86);
  font-size: 11px;
  line-height: 1.4;
}
.dev-theme-css-preview pre {
  max-height: 220px;
  margin: 0;
  padding: 10px;
  overflow: auto;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.28);
  color: rgba(255, 255, 255, 0.72);
  font: 11px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace;
  white-space: pre-wrap;
}
.dev-theme-resize {
  position: absolute;
  z-index: 2;
  width: 16px;
  height: 16px;
}
.dev-theme-resize-top-left { top: 0; left: 0; cursor: nwse-resize; }
.dev-theme-resize-top-right { top: 0; right: 0; cursor: nesw-resize; }
.dev-theme-resize-bottom-left { bottom: 0; left: 0; cursor: nesw-resize; }
.dev-theme-resize-bottom-right { right: 0; bottom: 0; cursor: nwse-resize; }
@media (max-width: 760px) {
  .dev-theme-shell,
  .dev-theme-live-grid {
    grid-template-columns: 1fr;
  }
}
</style>
