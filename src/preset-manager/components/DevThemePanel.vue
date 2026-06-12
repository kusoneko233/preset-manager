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
              <span>{{ stabilityLabel(store.selectedElement?.stability) }} · {{ store.selectedElement?.matchedCount ?? 1 }} 个命中</span>
            </div>
            <div v-else class="dev-theme-empty-box">
              <b>Alt + Shift</b>
              <span>开启检查器后点击元素。无源码定位的元素也能调样式。</span>
            </div>
            <div class="dev-theme-button-row">
              <button type="button" :disabled="!hasSelected" @click="store.pinSelectedElementStyle()">固定当前样式</button>
              <button type="button" :disabled="!store.pinnedStyles.length" @click="store.clearPinnedStyles()">清空固定</button>
            </div>
            <div v-if="store.pinnedStyles.length" class="dev-theme-pinned-list">
              <div v-for="pinned in store.pinnedStyles" :key="pinned.id" class="dev-theme-pinned-item">
                <span>{{ pinned.label }}</span>
                <small class="dev-theme-pinned-meta">{{ stabilityLabel(pinned.stability) }} · {{ pinned.matchedCount }} 个命中</small>
                <button type="button" title="删除固定样式" @click="store.removePinnedStyle(pinned.id)">×</button>
              </div>
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
              <div v-if="backgroundPreviewSource" class="dev-theme-drop-preview" :style="backgroundPreviewStyle" aria-label="背景预览" />
              <span v-else>点击 / 拖拽 / 粘贴图片</span>
            </button>
            <div class="dev-theme-button-row">
              <select v-model="store.currentDraft.imageFit">
                <option value="cover">铺满</option>
                <option value="contain">完整</option>
                <option value="center">居中</option>
                <option value="repeat">平铺</option>
              </select>
              <button type="button" :disabled="!cropSource" @click="openImageCropper">编辑图片</button>
              <button type="button" @click="clearBackgroundImage">清除</button>
            </div>
          </section>
        </aside>

        <main class="dev-theme-main">
          <section class="dev-theme-card dev-theme-live-grid">
            <RangeControl label="透明度" suffix="%" :min="0" :max="100" :step="1" :model-value="Math.round(store.currentDraft.opacity * 100)" :effect-info="controlInfo('opacity')" @update:model-value="store.currentDraft.opacity = $event / 100" />
            <RangeControl label="毛玻璃" suffix="px" :min="0" :max="64" :step="1" :model-value="store.currentDraft.blur" :effect-info="controlInfo('blur')" @update:model-value="store.currentDraft.blur = $event" />
            <RangeControl label="暗化" suffix="%" :min="0" :max="100" :step="1" :model-value="Math.round(store.currentDraft.maskOpacity * 100)" :effect-info="controlInfo('mask')" @update:model-value="store.currentDraft.maskOpacity = $event / 100" />
            <RangeControl label="底部压黑" suffix="%" :min="0" :max="100" :step="1" :model-value="Math.round(store.currentDraft.bottomFadeOpacity * 100)" :effect-info="controlInfo('bottomFade')" @update:model-value="store.currentDraft.bottomFadeOpacity = $event / 100" />
            <RangeControl label="纯黑起点" suffix="%" :min="0" :max="100" :step="1" :model-value="Math.round(store.currentDraft.bottomFadeSolidStart)" :effect-info="controlInfo('bottomFade')" @update:model-value="store.currentDraft.bottomFadeSolidStart = $event" />
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

      <div v-if="cropState.open" class="dev-theme-image-editor">
        <div class="dev-theme-image-editor-head">
          <div>
            <strong>编辑图片</strong>
            <span>不会改动图片文件，参考框只用于查看目标区域比例</span>
          </div>
          <button type="button" class="dev-theme-icon-btn" title="关闭参考框" @click="closeCropReference">×</button>
        </div>
        <div class="dev-theme-image-stage-wrap">
          <div
            class="dev-theme-image-stage"
            :style="cropStageStyle"
            @wheel.stop.prevent="onCropWheel"
          >
            <img
              v-if="cropSource"
              :src="cropSource"
              alt="图片预览"
              draggable="false"
            />
            <div class="dev-theme-image-dim" />
            <div class="dev-theme-image-frame" :style="cropFrameStyle" @pointerdown.stop.prevent="onCropDragStart">
              <span>{{ cropAspect.label }} {{ cropAspect.width }}:{{ cropAspect.height }}</span>
            </div>
          </div>
        </div>
        <div class="dev-theme-image-editor-foot">
          <div class="dev-theme-image-actions">
            <button type="button" @click="applyCropPreset('left')">左半边</button>
            <button type="button" @click="applyCropPreset('right')">右半边</button>
            <button type="button" @click="applyCropPreset('center')">居中</button>
            <button type="button" @click="applyCropPreset('cover')">铺满</button>
            <button type="button" class="dev-theme-primary-action" @click="confirmSelectionAsBackground">确认选择为背景</button>
          </div>
          <RangeControl label="参考框大小" suffix="%" :min="20" :max="100" :step="1" :model-value="Math.round(cropState.scale * 100)" :effect-info="controlInfo('imageScale')" @update:model-value="cropState.scale = $event / 100" />
          <div class="dev-theme-image-ratio">
            <span>参考比例</span>
            <code>{{ cropAspect.label }} {{ cropAspect.width }}:{{ cropAspect.height }}</code>
          </div>
        </div>
      </div>

      <div v-for="handle in resizeHandles" :key="handle" :class="['dev-theme-resize', `dev-theme-resize-${handle}`]" @pointerdown.stop.prevent="onResizeStart($event, handle)" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, inject, onBeforeUnmount, onMounted, reactive, ref, type PropType } from 'vue';
import { useDevThemeStore, type DevThemeSelectedElement } from '../stores/devTheme';
import { buildDevThemeCss, type DevThemePinnedStyle, type DevThemeTarget } from '../utils/devThemeCss';
import { getDevThemeControlTraces, type DevThemeControlTrace } from '../utils/devThemeControls';
import { getDevThemeContainedImageRect, getDevThemeCropAspect, getDevThemeCropFrameRect, getDevThemeCropStageSize, getDevThemeSelectionCanvasSize } from '../utils/devThemeCrop';
import { parseDevThemeConfig, readFileAsDataUrl, sanitizePresetFileName, serializeDevThemeConfig } from '../utils/devThemeIO';
import { clampFloatingPanelRect } from '../utils/panelLayout';
import { useConfirmStore } from '../stores/confirm';
import { useTextPromptStore } from '../stores/textPrompt';

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
  centerX: number;
  centerY: number;
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
const confirmDialog = useConfirmStore();
const textPrompt = useTextPromptStore();
const parentDoc = inject<Document | null>('parentDocument', null);
const parentFloatingRoot = inject<HTMLElement | null>('presetManagerParentFloatingRoot', null);
const fileInput = ref<HTMLInputElement>();
const cropState = reactive<ImageCropState>({
  open: false,
  scale: 1,
  centerX: 120,
  centerY: 80,
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
const backgroundPreviewSource = computed(() => store.currentDraft.imageDataUrl || store.currentDraft.originalImageDataUrl || '');
const backgroundPreviewStyle = computed(() => {
  if (!backgroundPreviewSource.value) return {};
  const imageScale = Math.round(Math.max(0.5, Math.min(store.currentDraft.imageScale, 2)) * 100);
  const backgroundSize = store.currentDraft.imageFit === 'repeat' || store.currentDraft.imageFit === 'center'
    ? `${imageScale}% auto`
    : store.currentDraft.imageFit;
  return {
    backgroundImage: `url("${backgroundPreviewSource.value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}")`,
    backgroundSize,
    backgroundPosition: 'center center',
    backgroundRepeat: store.currentDraft.imageFit === 'repeat' ? 'repeat' : 'no-repeat',
  };
});
const cropAspect = computed(() => getDevThemeCropAspect({
  targets: store.currentTargets,
  selectedRect: store.selectedElement?.rect ?? null,
}));
const cropStageSize = computed(() => getDevThemeCropStageSize());
const cropStageStyle = computed(() => ({
  aspectRatio: `${cropStageSize.value.width} / ${cropStageSize.value.height}`,
  width: `${cropStageSize.value.width}px`,
  height: `${cropStageSize.value.height}px`,
}));
const cropFrameRect = computed(() => getDevThemeCropFrameRect(cropAspect.value, cropStageSize.value, cropState));
const cropFrameStyle = computed(() => ({
  left: `${cropFrameRect.value.left}px`,
  top: `${cropFrameRect.value.top}px`,
  width: `${cropFrameRect.value.width}px`,
  height: `${cropFrameRect.value.height}px`,
}));

const currentCss = computed(() => buildDevThemeCss({
  enabled: store.enabled,
  targets: store.currentTargets,
  background: store.currentDraft,
  selectedPaths: store.currentTargets.selected && store.selectedElement?.path ? [store.selectedElement.path] : [],
  pinnedStyles: store.pinnedStyles,
}));

const activeTargetLabel = computed(() => targetOptions.filter(target => store.currentTargets[target.key]).map(target => target.label).join(' / ') || '未选择范围');

function controlInfo(id: string): ControlEffectInfo {
  const trace = controlTraces.value.find(item => item.id === id) ?? controlTraces.value[0];
  const selectedOnly = trace.scope === 'selected-text' || trace.scope === 'selected-box';
  const activeForSelection = selectedOnly ? selectedTargetActive.value && trace.enabled : trace.enabled;
  const targetText = selectedOnly ? '选中元素' : '背景范围';
  return { ...trace, activeForSelection, targetText };
}

function stabilityLabel(stability: DevThemePinnedStyle['stability'] | DevThemeSelectedElement['stability'] | undefined) {
  if (stability === 'source') return '源码定位';
  if (stability === 'stable') return '稳定';
  return '低稳定性';
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
  applyCropPreset('center');
}

function applyCropPreset(preset: CropPreset) {
  cropState.open = true;
  if (preset === 'left') {
    cropState.scale = 0.5;
    cropState.centerX = cropStageSize.value.width * 0.25;
    cropState.centerY = cropStageSize.value.height / 2;
    return;
  }
  if (preset === 'right') {
    cropState.scale = 0.5;
    cropState.centerX = cropStageSize.value.width * 0.75;
    cropState.centerY = cropStageSize.value.height / 2;
    return;
  }
  if (preset === 'center') {
    cropState.scale = 0.62;
    cropState.centerX = cropStageSize.value.width / 2;
    cropState.centerY = cropStageSize.value.height / 2;
    return;
  }
  cropState.scale = 1;
  cropState.centerX = cropStageSize.value.width / 2;
  cropState.centerY = cropStageSize.value.height / 2;
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
  const start = { x: cropState.centerX, y: cropState.centerY };
  startCropPointerDrag({
    startEvent: event,
    cursor: 'move',
    onMove: ev => {
      cropState.centerX = start.x + ev.clientX - startPoint.x;
      cropState.centerY = start.y + ev.clientY - startPoint.y;
    },
  });
}

function onCropWheel(event: WheelEvent) {
  const next = cropState.scale + (event.deltaY > 0 ? -0.05 : 0.05);
  cropState.scale = Math.max(0.2, Math.min(1, Math.round(next * 100) / 100));
}

function closeCropReference() {
  cropState.open = false;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片读取失败'));
    image.src = src;
  });
}

async function confirmSelectionAsBackground() {
  if (!cropSource.value) return;
  try {
    const image = await loadImage(cropSource.value);
    const stage = cropStageSize.value;
    const imageRect = getDevThemeContainedImageRect(stage, { width: image.naturalWidth, height: image.naturalHeight });
    const frame = cropFrameRect.value;
    const sourceLeft = (frame.left - imageRect.left) / imageRect.width * image.naturalWidth;
    const sourceTop = (frame.top - imageRect.top) / imageRect.height * image.naturalHeight;
    const sourceWidth = frame.width / imageRect.width * image.naturalWidth;
    const sourceHeight = frame.height / imageRect.height * image.naturalHeight;
    const canvasSize = getDevThemeSelectionCanvasSize(cropAspect.value);
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法创建图片画布');
    ctx.drawImage(
      image,
      Math.max(0, sourceLeft),
      Math.max(0, sourceTop),
      Math.min(image.naturalWidth, sourceWidth),
      Math.min(image.naturalHeight, sourceHeight),
      0,
      0,
      canvas.width,
      canvas.height,
    );
    store.currentDraft.imageDataUrl = canvas.toDataURL('image/webp', 0.82);
    store.currentDraft.originalImageDataUrl = null;
    store.currentDraft.imageFit = 'cover';
    store.currentDraft.imageScale = 1;
    store.currentDraft.imagePositionX = 50;
    store.currentDraft.imagePositionY = 50;
    cropState.open = false;
    toastr.success('已确认选择为背景');
  } catch (error) {
    toastr.error(error instanceof Error ? error.message : '背景生成失败');
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

async function saveNew() {
  const name = await textPrompt.prompt({
    title: '另存背景预设',
    label: '预设名称',
    defaultValue: '背景预设',
    confirmLabel: '保存',
  });
  if (name?.trim()) store.saveAsNewPreset(name.trim());
}

async function saveCurrent() {
  if (await confirmDialog.confirm({
    title: '覆盖背景预设',
    message: '覆盖当前预设？',
    confirmLabel: '覆盖',
  })) store.overwriteCurrentPreset();
}

async function renameCurrent() {
  const current = store.presets.find(item => item.id === store.activePresetId);
  if (!current) return;
  const name = await textPrompt.prompt({
    title: '重命名背景预设',
    label: '新名称',
    defaultValue: current.name,
    confirmLabel: '重命名',
  });
  if (name?.trim()) store.renamePreset(current.id, name.trim());
}

async function deleteCurrent() {
  const current = store.presets.find(item => item.id === store.activePresetId);
  if (current && await confirmDialog.confirm({
    title: '删除背景预设',
    message: `删除「${current.name}」？`,
    confirmLabel: '删除',
    tone: 'danger',
  })) store.deletePreset(current.id);
}

async function resetDraft() {
  if (await confirmDialog.confirm({
    title: '放弃修改',
    message: '放弃未保存修改？',
    confirmLabel: '放弃',
    tone: 'danger',
  })) store.resetDraft();
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

function exportCurrent() {
  const current = store.presets.find(item => item.id === store.activePresetId);
  const name = current?.name ?? '未保存背景预设';
  const baseName = sanitizePresetFileName(name);
  const imageDataUrl = store.currentDraft.imageDataUrl || store.currentDraft.originalImageDataUrl;
  const imageFileName = imageDataUrl ? `${baseName}.json 内嵌图片` : null;
  downloadText(`${baseName}.json`, serializeDevThemeConfig({
    name,
    imageFileName,
      targets: store.currentTargets,
      pinnedStyles: store.pinnedStyles,
      background: store.currentDraft,
  }), 'application/json');
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
      store.importPreset(config.name, config.background, config.targets, config.pinnedStyles);
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
    ${root} .dev-theme-pinned-list,
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
    ${root} .dev-theme-pinned-list {
      max-height: 116px;
      overflow: auto;
    }
    ${root} .dev-theme-pinned-item {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.04);
      color: rgba(255, 255, 255, 0.72);
      font-size: 11px;
    }
    ${root} .dev-theme-pinned-item span {
      grid-row: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    ${root} .dev-theme-pinned-meta {
      grid-row: 2;
      color: rgba(255, 255, 255, 0.48);
      font-size: 10px;
    }
    ${root} .dev-theme-pinned-item button {
      grid-row: 1 / span 2;
      min-width: 24px;
      padding: 3px 6px !important;
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
    ${root} .dev-theme-primary-action {
      border-color: rgba(255, 255, 255, 0.28) !important;
      background: rgba(255, 255, 255, 0.86) !important;
      color: rgba(15, 16, 19, 0.94) !important;
      font-weight: 650 !important;
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
    ${root} .dev-theme-drop-preview {
      width: 100%;
      height: 112px;
      border-radius: 9px;
      background-color: rgba(0, 0, 0, 0.28);
    }
    ${root} .dev-theme-file {
      display: none;
    }
    ${root} .dev-theme-image-editor {
      position: absolute;
      inset: 54px 12px 12px;
      z-index: 3;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      gap: 12px;
      padding: 12px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 14px;
      background: rgba(12, 13, 16, 0.88);
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.42);
      backdrop-filter: blur(22px) saturate(130%);
      -webkit-backdrop-filter: blur(22px) saturate(130%);
    }
    ${root} .dev-theme-image-editor-head,
    ${root} .dev-theme-image-editor-foot,
    ${root} .dev-theme-image-actions,
    ${root} .dev-theme-image-ratio {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    ${root} .dev-theme-image-editor-head {
      justify-content: space-between;
    }
    ${root} .dev-theme-image-editor-head > div {
      display: grid;
      gap: 3px;
    }
    ${root} .dev-theme-image-editor-head strong {
      font-size: 13px;
    }
    ${root} .dev-theme-image-editor-head span,
    ${root} .dev-theme-image-ratio span {
      color: rgba(255, 255, 255, 0.58);
      font-size: 11px;
    }
    ${root} .dev-theme-image-stage-wrap {
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: 12px;
      background:
        linear-gradient(45deg, rgba(255, 255, 255, 0.035) 25%, transparent 25%),
        linear-gradient(-45deg, rgba(255, 255, 255, 0.035) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.035) 75%),
        linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.035) 75%),
        rgba(0, 0, 0, 0.22);
      background-position: 0 0, 0 8px, 8px -8px, -8px 0;
      background-size: 16px 16px;
    }
    ${root} .dev-theme-image-stage {
      position: relative;
      max-width: 100%;
      max-height: 100%;
      margin: 0 auto;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      background: rgba(0, 0, 0, 0.32);
      touch-action: none;
    }
    ${root} .dev-theme-image-stage img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
      user-select: none;
      pointer-events: none;
    }
    ${root} .dev-theme-image-dim {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.20);
      pointer-events: none;
    }
    ${root} .dev-theme-image-frame {
      position: absolute;
      border: 1px solid rgba(255, 255, 255, 0.72);
      border-radius: 8px;
      box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.30), inset 0 0 0 1px rgba(0, 0, 0, 0.32);
      cursor: move;
      pointer-events: auto;
    }
    ${root} .dev-theme-image-frame span {
      position: absolute;
      top: 6px;
      left: 6px;
      padding: 3px 6px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.48);
      color: rgba(255, 255, 255, 0.86);
      font: 11px/1.2 ui-monospace, SFMono-Regular, Consolas, monospace;
      pointer-events: none;
    }
    ${root} .dev-theme-image-editor-foot {
      display: grid;
      grid-template-columns: minmax(0, auto) minmax(180px, 1fr) auto;
      gap: 10px;
    }
    ${root} .dev-theme-image-editor-foot .dev-theme-range {
      margin: 0;
    }
    ${root} .dev-theme-image-ratio code {
      color: #79c0ff;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 11px;
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
      ${root} .dev-theme-image-editor-foot {
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
.dev-theme-empty-box,
.dev-theme-pinned-list {
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
.dev-theme-pinned-list {
  max-height: 116px;
  overflow: auto;
}
.dev-theme-pinned-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.72);
  font-size: 11px;
}
.dev-theme-pinned-item span {
  grid-row: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dev-theme-pinned-meta {
  grid-row: 2;
  color: rgba(255, 255, 255, 0.48);
  font-size: 10px;
}
.dev-theme-pinned-item button {
  grid-row: 1 / span 2;
  min-width: 24px;
  padding: 3px 6px !important;
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
.dev-theme-primary-action {
  border-color: rgba(255, 255, 255, 0.28) !important;
  background: rgba(255, 255, 255, 0.86) !important;
  color: rgba(15, 16, 19, 0.94) !important;
  font-weight: 650 !important;
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
.dev-theme-drop-preview {
  width: 100%;
  height: 112px;
  border-radius: 9px;
  background-color: rgba(0, 0, 0, 0.28);
}
.dev-theme-file {
  display: none;
}
.dev-theme-image-editor {
  position: absolute;
  inset: 54px 12px 12px;
  z-index: 3;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 12px;
  padding: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  background: rgba(12, 13, 16, 0.88);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(22px) saturate(130%);
  -webkit-backdrop-filter: blur(22px) saturate(130%);
}
.dev-theme-image-editor-head,
.dev-theme-image-editor-foot,
.dev-theme-image-actions,
.dev-theme-image-ratio {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dev-theme-image-editor-head {
  justify-content: space-between;
}
.dev-theme-image-editor-head > div {
  display: grid;
  gap: 3px;
}
.dev-theme-image-editor-head strong {
  font-size: 13px;
}
.dev-theme-image-editor-head span,
.dev-theme-image-ratio span {
  color: rgba(255, 255, 255, 0.58);
  font-size: 11px;
}
.dev-theme-image-stage-wrap {
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 12px;
  background:
    linear-gradient(45deg, rgba(255, 255, 255, 0.035) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255, 255, 255, 0.035) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.035) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.035) 75%),
    rgba(0, 0, 0, 0.22);
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  background-size: 16px 16px;
}
.dev-theme-image-stage {
  position: relative;
  max-width: 100%;
  max-height: 100%;
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.32);
  touch-action: none;
}
.dev-theme-image-stage img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
  pointer-events: none;
}
.dev-theme-image-dim {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.20);
  pointer-events: none;
}
.dev-theme-image-frame {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 8px;
  box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.30), inset 0 0 0 1px rgba(0, 0, 0, 0.32);
  cursor: move;
  pointer-events: auto;
}
.dev-theme-image-frame span {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 3px 6px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.48);
  color: rgba(255, 255, 255, 0.86);
  font: 11px/1.2 ui-monospace, SFMono-Regular, Consolas, monospace;
  pointer-events: none;
}
.dev-theme-image-editor-foot {
  display: grid;
  grid-template-columns: minmax(0, auto) minmax(180px, 1fr) auto;
  gap: 10px;
}
.dev-theme-image-editor-foot .dev-theme-range {
  margin: 0;
}
.dev-theme-image-ratio code {
  color: #79c0ff;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 11px;
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
  .dev-theme-image-editor-foot {
    grid-template-columns: 1fr;
  }
}
</style>
