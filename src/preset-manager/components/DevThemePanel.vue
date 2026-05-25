<template>
  <Teleport :to="parentFloatingRoot ?? 'body'" :disabled="!parentFloatingRoot">
  <div class="dev-theme-panel" :style="panelStyle" data-preset-manager-floating-panel="dev-theme" @paste="onPaste">
    <div class="dev-theme-head" @pointerdown.stop.prevent="onDragStart">
      <div>
        <strong>界面装扮 · 开发者背景面板</strong>
        <small>实时预览 · 手动保存（改动随时显示，要点「保存」才会留下来）</small>
      </div>
      <div class="dev-theme-head-actions">
        <label class="dev-theme-switch" title="关闭后所有效果暂时取消，但你的设置不会丢">
          <input type="checkbox" :checked="store.enabled" @change="store.setEnabled(($event.target as HTMLInputElement).checked)" />
          <span>启用</span>
        </label>
        <button class="dev-theme-icon-btn" title="关闭面板" @click="store.panelOpen = false">×</button>
      </div>
    </div>

    <div class="dev-theme-body">
      <section class="dev-theme-section dev-theme-selected-card" :class="{ 'is-active': hasSelected, 'is-recommended': hasSelected }">
        <h3>
          <span>选中的元素</span>
          <b v-if="hasSelected" class="dev-theme-recommend-badge">已选中</b>
          <small v-if="hasSelected" class="dev-theme-section-hint">下面调的样式会作用到这一类元素</small>
          <small v-else class="dev-theme-section-hint">还没选元素</small>
        </h3>
        <div v-if="!hasSelected" class="dev-theme-empty-selected">
          <p class="dev-theme-empty-title">怎么选元素？</p>
          <ol class="dev-theme-empty-steps">
            <li>按住键盘上的 <code>Alt</code> + <code>Shift</code></li>
            <li>把鼠标移到你想改的元素上（会出现蓝框）</li>
            <li>在想要的元素上点一下，就选中了</li>
          </ol>
          <p class="dev-theme-empty-note">选中后，所有"同款"元素会自动一起被选中（比如你点中一条提示词，列表里所有提示词都会一起改样式）</p>
        </div>
        <div v-else class="dev-theme-selected-info">
          <div class="dev-theme-selected-line">
            <span class="dev-theme-selected-tag">&lt;{{ store.selectedElement?.tag }}&gt;</span>
            <span class="dev-theme-selected-count">同类共 {{ store.selectedElement?.matchedCount ?? 1 }} 个</span>
          </div>
          <div class="dev-theme-selected-path" :title="store.selectedElement?.label">{{ store.selectedElement?.label }}</div>
          <div class="dev-theme-selected-actions">
            <div class="dev-theme-effective-guide">
              <strong>现在这里会显示“控件 → CSS → 代码位置”：</strong>
              <span>每个选项下方都有对应 CSS</span>
              <span>启用后会显示实际生成代码</span>
              <span>会标明影响同类元素数量</span>
            </div>
            <label class="dev-theme-check" title="锁定后鼠标随便移动框框不变；要换目标，再按 Alt+Shift+点击别的元素就行">
              <input type="checkbox" :checked="store.locked" @change="store.toggleLocked()" />
              <span>锁定选中</span>
            </label>
            <button class="dev-theme-text-btn" @click="clearSelected">清除选中</button>
          </div>
        </div>
      </section>

      <section class="dev-theme-section" :class="{ 'is-recommended': hasSelected }">
        <h3>
          <span>样式作用范围</span>
          <b v-if="hasSelected" class="dev-theme-recommend-badge">先确认这里</b>
          <small class="dev-theme-section-hint">勾上的区域会被下面的样式影响</small>
        </h3>
        <label v-for="target in targetOptions" :key="target.key" class="dev-theme-check dev-theme-target-row" :class="{ 'is-disabled': target.key === 'selected' && !hasSelected, 'is-recommended': target.key === 'selected' && hasSelected }">
          <input type="checkbox" :checked="store.currentTargets[target.key]" :disabled="target.key === 'selected' && !hasSelected" @pointerdown="store.setLivePreviewActive(true)" @pointerup="store.setLivePreviewActive(false)" @pointercancel="store.setLivePreviewActive(false)" @change="store.toggleTarget(target.key); store.setLivePreviewActive(false)" />
          <span class="dev-theme-target-label">{{ target.label }}</span>
          <small v-if="target.hint" class="dev-theme-target-hint">{{ target.hint }}</small>
        </label>
      </section>

      <section class="dev-theme-section">
        <h3>
          <span>预设</span>
          <small class="dev-theme-section-hint">把当前调好的样式存起来，下次直接选</small>
        </h3>
        <div class="dev-theme-row">
          <select :value="store.activePresetId ?? ''" @change="selectPreset(($event.target as HTMLSelectElement).value)">
            <option value="">未保存草稿</option>
            <option v-for="preset in store.presets" :key="preset.id" :value="preset.id">{{ preset.name }}</option>
          </select>
          <button title="把当前所有设置存成一个新预设" @click="saveNew">另存为</button>
          <button :disabled="!store.activePresetId" title="把当前设置覆盖到选中的预设上" @click="saveCurrent">保存</button>
        </div>
        <div class="dev-theme-row">
          <button :disabled="!store.activePresetId" @click="renameCurrent">重命名</button>
          <button :disabled="!store.activePresetId" @click="deleteCurrent">删除</button>
          <button title="放弃当前未保存的修改，回到上次保存的状态" @click="resetDraft">重置当前编辑</button>
        </div>
      </section>

      <section class="dev-theme-section">
        <h3>
          <span>背景图</span>
          <small class="dev-theme-section-hint">给作用范围加一张背景图片</small>
        </h3>
        <div class="dev-theme-drop" @dragover.prevent @drop.prevent="onDrop" @click="fileInput?.click()">
          <input ref="fileInput" class="dev-theme-file" type="file" accept="image/*" @change="onFileChange" />
          <img v-if="store.currentDraft.imageDataUrl" :src="store.currentDraft.imageDataUrl" alt="背景预览" />
          <span v-else>点击 / 拖拽 / Ctrl+V 粘贴图片</span>
        </div>
        <div class="dev-theme-row">
          <select v-model="store.currentDraft.imageFit" title="图片怎么填充背景">
            <option value="cover">铺满（可能裁剪）</option>
            <option value="contain">完整显示（可能留白）</option>
            <option value="center">居中</option>
            <option value="repeat">平铺</option>
          </select>
          <button @click="store.currentDraft.imageDataUrl = null">清除图片</button>
        </div>
      </section>

      <section class="dev-theme-section" :class="{ 'is-recommended': hasSelected }">
        <h3>
          <span class="dev-theme-section-title">透明和模糊</span>
          <b v-if="hasSelected" class="dev-theme-recommend-badge">选中元素后这里有效</b>
          <small class="dev-theme-section-hint">调整背景的清晰度、亮度、暗化程度等基础质感</small>
        </h3>
        <RangeControl label="图片缩放" hint="放大或缩小背景图片本身" suffix="%" :min="50" :max="200" :step="1" :model-value="store.currentDraft.imageScale * 100" :effect-info="controlInfo('imageScale')" @preview-start="store.setLivePreviewActive(true)" @preview-end="store.setLivePreviewActive(false)" @update:model-value="store.currentDraft.imageScale = $event / 100" />
        <RangeControl label="整体不透明度" hint="整个背景的透明度，0% 完全看不见" suffix="%" :min="0" :max="100" :step="1" :model-value="store.currentDraft.opacity * 100" :effect-info="controlInfo('opacity')" @preview-start="store.setLivePreviewActive(true)" @preview-end="store.setLivePreviewActive(false)" @update:model-value="store.currentDraft.opacity = $event / 100" />
        <RangeControl label="毛玻璃模糊" hint="像磨砂玻璃一样让后面变模糊" suffix="px" :min="0" :max="64" :step="1" :model-value="store.currentDraft.blur" :effect-info="controlInfo('blur')" @preview-start="store.setLivePreviewActive(true)" @preview-end="store.setLivePreviewActive(false)" @update:model-value="store.currentDraft.blur = $event" />
        <RangeControl label="饱和度（彩度）" hint="100% 是原色，越高越鲜艳，越低越灰" suffix="%" :min="0" :max="200" :step="1" :model-value="store.currentDraft.saturate * 100" :effect-info="controlInfo('saturate')" @preview-start="store.setLivePreviewActive(true)" @preview-end="store.setLivePreviewActive(false)" @update:model-value="store.currentDraft.saturate = $event / 100" />
        <RangeControl label="亮度" hint="100% 是原色，越高越亮" suffix="%" :min="50" :max="150" :step="1" :model-value="store.currentDraft.brightness * 100" :effect-info="controlInfo('brightness')" @preview-start="store.setLivePreviewActive(true)" @preview-end="store.setLivePreviewActive(false)" @update:model-value="store.currentDraft.brightness = $event / 100" />
        <RangeControl label="对比度" hint="100% 是原色，越高色差越强烈" suffix="%" :min="50" :max="150" :step="1" :model-value="store.currentDraft.contrast * 100" :effect-info="controlInfo('contrast')" @preview-start="store.setLivePreviewActive(true)" @preview-end="store.setLivePreviewActive(false)" @update:model-value="store.currentDraft.contrast = $event / 100" />
        <label class="dev-theme-field">
          <span>
            遮罩颜色
            <small>盖在背景上的一层颜色</small>
            <code>background-image: linear-gradient</code>
          </span>
          <input v-model="store.currentDraft.maskColor" type="color" @input="store.setLivePreviewActive(true)" @change="store.setLivePreviewActive(false)" @blur="store.setLivePreviewActive(false)" />
        </label>
        <RangeControl label="暗化程度（遮罩浓度）" hint="遮罩颜色的浓度，越高背景越偏向遮罩色" suffix="%" :min="0" :max="100" :step="1" :model-value="store.currentDraft.maskOpacity * 100" :effect-info="controlInfo('mask')" @preview-start="store.setLivePreviewActive(true)" @preview-end="store.setLivePreviewActive(false)" @update:model-value="store.currentDraft.maskOpacity = $event / 100" />
      </section>

      <section v-if="showElementOnlyHint" class="dev-theme-section dev-theme-section-elemonly">
        <p class="dev-theme-elemonly-tip">下面这两组只在「样式作用范围」勾上了「Alt+Shift 选中的元素」时才生效。</p>
      </section>

      <section class="dev-theme-section" :class="{ 'is-faded': !store.currentTargets.selected, 'is-recommended': selectedTargetActive }">
        <h3>
          <span class="dev-theme-section-title">颜色和文字</span>
          <b v-if="selectedTargetActive" class="dev-theme-recommend-badge">选中元素后这里有效</b>
          <small class="dev-theme-section-hint">改文字颜色、字号、粗细——仅作用在选中元素上</small>
        </h3>
        <label class="dev-theme-check">
          <input type="checkbox" v-model="store.currentDraft.textColorEnabled" />
          <span>启用</span>
          <span class="dev-theme-field-name">文字颜色</span>
        </label>
        <input v-if="store.currentDraft.textColorEnabled" v-model="store.currentDraft.textColor" type="color" @input="store.setLivePreviewActive(true)" @change="store.setLivePreviewActive(false)" @blur="store.setLivePreviewActive(false)" />
        <ControlCodeMap :info="controlInfo('textColor')" />

        <label class="dev-theme-check">
          <input type="checkbox" v-model="store.currentDraft.fontSizeEnabled" />
          <span>启用</span>
          <span class="dev-theme-field-name">字号</span>
        </label>
        <RangeControl v-if="store.currentDraft.fontSizeEnabled" label="字号" hint="文字大小，单位像素" suffix="px" :min="8" :max="48" :step="1" :model-value="store.currentDraft.fontSizePx" :effect-info="controlInfo('fontSize')" @preview-start="store.setLivePreviewActive(true)" @preview-end="store.setLivePreviewActive(false)" @update:model-value="store.currentDraft.fontSizePx = $event" />
        <ControlCodeMap v-else :info="controlInfo('fontSize')" />

        <label class="dev-theme-check">
          <input type="checkbox" v-model="store.currentDraft.fontWeightEnabled" />
          <span>启用</span>
          <span class="dev-theme-field-name">字体粗细</span>
        </label>
        <RangeControl v-if="store.currentDraft.fontWeightEnabled" label="字体粗细" hint="400 是正常粗细，700 是加粗" suffix="" :min="100" :max="900" :step="100" :model-value="store.currentDraft.fontWeight" :effect-info="controlInfo('fontWeight')" @preview-start="store.setLivePreviewActive(true)" @preview-end="store.setLivePreviewActive(false)" @update:model-value="store.currentDraft.fontWeight = $event" />
        <ControlCodeMap v-else :info="controlInfo('fontWeight')" />

        <label class="dev-theme-check">
          <input type="checkbox" v-model="store.currentDraft.lineHeightEnabled" />
          <span>启用</span>
          <span class="dev-theme-field-name">行间距</span>
        </label>
        <RangeControl v-if="store.currentDraft.lineHeightEnabled" label="行间距" hint="行与行之间的距离，1.5 表示每行高度是字号的 1.5 倍" suffix="" :min="1" :max="3" :step="0.05" :model-value="store.currentDraft.lineHeight" :effect-info="controlInfo('lineHeight')" @preview-start="store.setLivePreviewActive(true)" @preview-end="store.setLivePreviewActive(false)" @update:model-value="store.currentDraft.lineHeight = $event" />
        <ControlCodeMap v-else :info="controlInfo('lineHeight')" />
      </section>

      <section class="dev-theme-section" :class="{ 'is-faded': !store.currentTargets.selected, 'is-recommended': selectedTargetActive }">
        <h3>
          <span class="dev-theme-section-title">间距和尺寸</span>
          <b v-if="selectedTargetActive" class="dev-theme-recommend-badge">选中元素后这里有效</b>
          <small class="dev-theme-section-hint">改宽高、内外边距、圆角——仅作用在选中元素上</small>
        </h3>

        <label class="dev-theme-check">
          <input type="checkbox" v-model="store.currentDraft.paddingEnabled" />
          <span>启用</span>
          <span class="dev-theme-field-name">内边距</span>
          <small>元素内容到边框的距离</small>
        </label>
        <RangeControl v-if="store.currentDraft.paddingEnabled" label="内边距" hint="元素内容到自己边框的距离" suffix="px" :min="0" :max="64" :step="1" :model-value="store.currentDraft.paddingPx" :effect-info="controlInfo('padding')" @preview-start="store.setLivePreviewActive(true)" @preview-end="store.setLivePreviewActive(false)" @update:model-value="store.currentDraft.paddingPx = $event" />
        <ControlCodeMap v-else :info="controlInfo('padding')" />

        <label class="dev-theme-check">
          <input type="checkbox" v-model="store.currentDraft.marginEnabled" />
          <span>启用</span>
          <span class="dev-theme-field-name">外边距</span>
          <small>元素和周围元素的距离</small>
        </label>
        <RangeControl v-if="store.currentDraft.marginEnabled" label="外边距" hint="元素和其他元素之间的距离" suffix="px" :min="0" :max="64" :step="1" :model-value="store.currentDraft.marginPx" :effect-info="controlInfo('margin')" @preview-start="store.setLivePreviewActive(true)" @preview-end="store.setLivePreviewActive(false)" @update:model-value="store.currentDraft.marginPx = $event" />
        <ControlCodeMap v-else :info="controlInfo('margin')" />

        <label class="dev-theme-check">
          <input type="checkbox" v-model="store.currentDraft.widthEnabled" />
          <span>启用</span>
          <span class="dev-theme-field-name">宽度</span>
        </label>
        <RangeControl v-if="store.currentDraft.widthEnabled" label="宽度" hint="元素的宽度，单位像素" suffix="px" :min="20" :max="800" :step="1" :model-value="store.currentDraft.widthPx" :effect-info="controlInfo('width')" @preview-start="store.setLivePreviewActive(true)" @preview-end="store.setLivePreviewActive(false)" @update:model-value="store.currentDraft.widthPx = $event" />
        <ControlCodeMap v-else :info="controlInfo('width')" />

        <label class="dev-theme-check">
          <input type="checkbox" v-model="store.currentDraft.heightEnabled" />
          <span>启用</span>
          <span class="dev-theme-field-name">高度</span>
        </label>
        <RangeControl v-if="store.currentDraft.heightEnabled" label="高度" hint="元素的高度，单位像素" suffix="px" :min="20" :max="800" :step="1" :model-value="store.currentDraft.heightPx" :effect-info="controlInfo('height')" @preview-start="store.setLivePreviewActive(true)" @preview-end="store.setLivePreviewActive(false)" @update:model-value="store.currentDraft.heightPx = $event" />
        <ControlCodeMap v-else :info="controlInfo('height')" />

        <label class="dev-theme-check">
          <input type="checkbox" v-model="store.currentDraft.borderRadiusEnabled" />
          <span>启用</span>
          <span class="dev-theme-field-name">圆角</span>
          <small>越大越圆，最大就是圆形</small>
        </label>
        <RangeControl v-if="store.currentDraft.borderRadiusEnabled" label="圆角" hint="边角的圆滑程度，0 是直角" suffix="px" :min="0" :max="64" :step="1" :model-value="store.currentDraft.borderRadiusPx" :effect-info="controlInfo('borderRadius')" @preview-start="store.setLivePreviewActive(true)" @preview-end="store.setLivePreviewActive(false)" @update:model-value="store.currentDraft.borderRadiusPx = $event" />
        <ControlCodeMap v-else :info="controlInfo('borderRadius')" />
      </section>

      <section class="dev-theme-section" :class="{ 'is-recommended': hasSelected }">
        <h3>
          <span class="dev-theme-section-title">花纹和装饰</span>
          <b v-if="hasSelected" class="dev-theme-recommend-badge">选中元素后这里有效</b>
          <small class="dev-theme-section-hint">渐变、噪点、阴影、高光等额外细节</small>
        </h3>
        <label class="dev-theme-check"><input v-model="store.currentDraft.gradientEnabled" type="checkbox" /><span>渐变叠加（在背景上叠一层颜色过渡）</span></label>
        <textarea v-model="store.currentDraft.gradientCss" rows="2" title="CSS 渐变写法，看不懂可以不动" />
        <label class="dev-theme-check"><input v-model="store.currentDraft.noiseEnabled" type="checkbox" /><span>噪点纹理（让背景看起来有颗粒感）</span></label>
        <RangeControl label="噪点强度" hint="颗粒感的强度" suffix="%" :min="0" :max="40" :step="1" :model-value="store.currentDraft.noiseOpacity * 100" :effect-info="controlInfo('noise')" @preview-start="store.setLivePreviewActive(true)" @preview-end="store.setLivePreviewActive(false)" @update:model-value="store.currentDraft.noiseOpacity = $event / 100" />
        <label class="dev-theme-check"><input v-model="store.currentDraft.innerShadowEnabled" type="checkbox" /><span>内阴影（边缘内部的阴影）</span></label>
        <input v-model="store.currentDraft.innerShadowCss" title="CSS box-shadow 写法，看不懂可以不动" />
        <ControlCodeMap :info="controlInfo('innerShadow')" />
        <label class="dev-theme-check"><input v-model="store.currentDraft.edgeHighlightEnabled" type="checkbox" /><span>边缘高光（边缘有反光的感觉）</span></label>
        <ControlCodeMap :info="controlInfo('edgeHighlight')" />
      </section>

      <section class="dev-theme-section">
        <h3>
          <span>实时 CSS</span>
          <small class="dev-theme-section-hint">看不懂这块可以直接忽略，下面就是上面所有控件生成出来的真正 CSS 代码</small>
        </h3>
        <button @click="copyCss">复制 CSS</button>
        <pre>{{ currentCss }}</pre>
      </section>

      <section class="dev-theme-section">
        <h3>
          <span>导入 / 导出</span>
          <small class="dev-theme-section-hint">把预设保存成文件，发给别人或者带到其他电脑</small>
        </h3>
        <button @click="exportCurrent">导出当前预设</button>
        <button @click="importConfig">导入预设 JSON</button>
      </section>
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

const ControlCodeMap = defineComponent({
  props: {
    info: { type: Object as PropType<ControlEffectInfo>, required: true },
  },
  setup(props) {
    return () => h('div', { class: ['dev-theme-code-map', { 'is-live': props.info.activeForSelection, 'is-muted': !props.info.enabled }] }, [
      h('div', { class: 'dev-theme-code-map-head' }, [
        h('strong', props.info.activeForSelection ? '正在影响选中元素' : props.info.enabled ? '会生成 CSS' : '还没生成 CSS'),
        h('span', props.info.targetText),
      ]),
      h('div', { class: 'dev-theme-code-map-line' }, [
        h('span', '改的是'),
        h('code', props.info.cssProperties.join(' / ')),
      ]),
      h('div', { class: 'dev-theme-code-map-line' }, [
        h('span', '代码在'),
        h('code', props.info.sourceLocation),
      ]),
      props.info.declarations.length
        ? h('pre', props.info.declarations.join('\n'))
        : h('p', '先打开这个控件的“启用”，这里才会出现真正写进页面的 CSS。'),
    ]);
  },
});

const RangeControl = defineComponent({
  props: {
    label: { type: String, required: true },
    hint: { type: String, default: '' },
    suffix: { type: String, default: '' },
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    step: { type: Number, default: 1 },
    modelValue: { type: Number, required: true },
    effectInfo: { type: Object as PropType<ControlEffectInfo>, required: true },
  },
  emits: ['update:modelValue', 'preview-start', 'preview-end'],
  setup(props, { emit }) {
    return () => h('label', { class: ['dev-theme-field', { 'is-effective-control': props.effectInfo.activeForSelection }] }, [
      h('span', [
        h('strong', { class: 'dev-theme-field-name' }, props.label),
        props.hint ? h('small', { class: 'dev-theme-field-hint' }, props.hint) : null,
        h('b', `${props.modelValue}${props.suffix}`),
      ]),
      h('input', {
        type: 'range',
        min: props.min,
        max: props.max,
        step: props.step,
        value: props.modelValue,
        onPointerdown: () => emit('preview-start'),
        onPointerup: () => emit('preview-end'),
        onPointercancel: () => emit('preview-end'),
        onChange: () => emit('preview-end'),
        onInput: (event: Event) => emit('update:modelValue', Number((event.target as HTMLInputElement).value)),
      }),
      h(ControlCodeMap, { info: props.effectInfo }),
    ]);
  },
});

const store = useDevThemeStore();
const parentDoc = inject<Document | null>('parentDocument', null);
const parentFloatingRoot = inject<HTMLElement | null>('presetManagerParentFloatingRoot', null);
const fileInput = ref<HTMLInputElement>();
const resizeHandles = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;

const targetOptions: { key: DevThemeTarget; label: string; hint?: string }[] = [
  { key: 'sidebar', label: '左侧栏', hint: '装提示词列表和草稿的那一栏' },
  { key: 'workspace', label: '主工作区', hint: '中间显示提示词条目的大块区域' },
  { key: 'panel', label: '弹窗面板', hint: '弹出来的各种设置窗口' },
  { key: 'selected', label: 'Alt+Shift 选中的元素', hint: '上方选中的元素以及它的所有同类' },
];

const hasSelected = computed(() => Boolean(store.selectedElement));
const selectedTargetActive = computed(() => hasSelected.value && (store.currentTargets.selected || store.livePreviewActive));
const showElementOnlyHint = computed(() => !store.currentTargets.selected && hasSelected.value);
const controlTraces = computed(() => getDevThemeControlTraces(store.currentDraft));

function controlInfo(id: string): ControlEffectInfo {
  const trace = controlTraces.value.find(item => item.id === id) ?? controlTraces.value[0];
  const selectedOnly = trace.scope === 'selected-text' || trace.scope === 'selected-box';
  const activeForSelection = selectedTargetActive.value && trace.enabled;
  const selectedCount = store.selectedElement?.matchedCount ?? 1;
  const targetText = selectedTargetActive.value
    ? `作用到当前选中元素和同类元素，共 ${selectedCount} 个`
    : hasSelected.value
      ? '已选元素，但还没勾选“Alt+Shift 选中的元素”'
      : selectedOnly
        ? '先 Alt+Shift 点选元素，才能看到作用目标'
        : '作用到已勾选的背景范围';
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

onMounted(() => {
  document.addEventListener('preset-manager-code-inspector-select', onSelected);
});
onBeforeUnmount(() => {
  document.removeEventListener('preset-manager-code-inspector-select', onSelected);
});

const panelStyle = computed(() => ({
  position: 'fixed',
  top: `${store.panelRect.top}px`,
  left: `${store.panelRect.left}px`,
  width: `${store.panelRect.width}px`,
  height: `${store.panelRect.height}px`,
}));

const currentCss = computed(() => buildDevThemeCss({
  enabled: store.enabled,
  targets: store.currentTargets,
  background: store.currentDraft,
  selectedPaths: store.currentTargets.selected && store.selectedElement?.path ? [store.selectedElement.path] : [],
}));

function clampPanelRect(rect = store.panelRect) {
  const viewport = getPanelViewportSize();
  return clampFloatingPanelRect(rect, viewport.width, viewport.height, 320, 360, 12);
}

function getPanelDocument() {
  return parentDoc ?? document;
}

function getPanelViewportSize() {
  const activeDocument = getPanelDocument();
  const activeWindow = activeDocument.defaultView ?? window;
  const doc = activeDocument.documentElement;
  const width = activeWindow.innerWidth || doc.clientWidth || window.innerWidth || 1375;
  const height = activeWindow.innerHeight || doc.clientHeight || window.innerHeight || 875;
  return {
    width: Math.max(320, Math.round(width)),
    height: Math.max(360, Math.round(height)),
  };
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
  store.panelRect = clampPanelRect(start);
  startPanelPointerDrag({
    startEvent: event,
    cursor: 'move',
    onMove: ev => {
      const point = { x: ev.clientX, y: ev.clientY };
      store.panelRect = clampPanelRect({ ...start, left: start.left + point.x - startPoint.x, top: start.top + point.y - startPoint.y });
    },
    onEnd: () => store.setPanelRect(clampPanelRect(store.panelRect)),
  });
}

function onResizeStart(event: PointerEvent, handle: typeof resizeHandles[number]) {
  if (event.button !== 0) return;
  const startPoint = { x: event.clientX, y: event.clientY };
  const start = clampPanelRect(store.panelRect);
  store.panelRect = clampPanelRect(start);
  startPanelPointerDrag({
    startEvent: event,
    cursor: handle.includes('top') === handle.includes('left') ? 'nwse-resize' : 'nesw-resize',
    onMove: ev => {
      const point = { x: ev.clientX, y: ev.clientY };
      const dx = point.x - startPoint.x;
      const dy = point.y - startPoint.y;
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

async function useImageFile(file: File) {
  try {
    store.currentDraft.imageDataUrl = await readFileAsDataUrl(file);
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
      store.importPreset(config.name, config.background, config.targets);
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
  position: fixed;
  z-index: 1200;
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
.dev-theme-section.is-faded {
  opacity: 0.55;
}
.dev-theme-section.is-recommended {
  margin: 0 -6px;
  padding: 10px 6px;
  border-radius: 12px;
  border-bottom-color: rgba(46, 204, 113, 0.24);
  background: linear-gradient(90deg, rgba(46, 204, 113, 0.10), rgba(117, 196, 255, 0.05));
  box-shadow: inset 3px 0 0 rgba(46, 204, 113, 0.72);
}
.dev-theme-recommend-badge {
  justify-self: start;
  width: fit-content;
  padding: 2px 7px;
  border: 1px solid rgba(46, 204, 113, 0.42);
  border-radius: 999px;
  background: rgba(46, 204, 113, 0.12);
  color: #34d399;
  font-size: 10px;
  font-weight: 650;
}
.dev-theme-section h3 {
  display: grid;
  gap: 2px;
  margin: 0;
  color: var(--pm-text-muted);
  font-size: 12px;
  font-weight: 650;
}
.dev-theme-section-title.is-effective,
.dev-theme-section-title.is-effective *,
.dev-theme-field-name.is-effective,
.dev-theme-field-name.is-effective * {
  color: #34d399 !important;
}
.dev-theme-section-hint {
  color: var(--pm-text-subtle);
  font-size: 11px;
  font-weight: 400;
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
.dev-theme-text-btn {
  min-height: 24px;
  padding: 0 8px;
  font-size: 11px;
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
  flex-wrap: wrap;
}
.dev-theme-check.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.dev-theme-check.is-recommended {
  padding: 7px 8px;
  border: 1px solid rgba(117, 196, 255, 0.38);
  border-radius: 10px;
  background: rgba(117, 196, 255, 0.12);
}
.dev-theme-check small {
  color: var(--pm-text-subtle);
  font-size: 11px;
}
.dev-theme-target-row {
  align-items: flex-start;
}
.dev-theme-target-label {
  font-weight: 600;
  color: var(--pm-text);
}
.dev-theme-target-hint {
  flex-basis: 100%;
  margin-left: 22px;
  color: var(--pm-text-subtle);
  font-size: 11px;
}
.dev-theme-field {
  gap: 4px;
}
.dev-theme-field span {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
}
.dev-theme-field.is-effective-control,
.dev-theme-section.is-recommended {
  background: rgba(46, 204, 113, 0.16) !important;
  box-shadow: inset 4px 0 0 #34d399, 0 0 0 1px rgba(52, 211, 153, 0.34) !important;
}
.dev-theme-field.is-effective-control .dev-theme-field-name,
.dev-theme-section.is-recommended h3 > span:first-child,
.dev-theme-section.is-recommended .dev-theme-section-title {
  color: #34d399 !important;
  text-shadow: 0 0 10px rgba(52, 211, 153, 0.45);
}
.dev-theme-field-name.is-effective {
  width: fit-content;
  padding: 2px 7px;
  border-radius: 7px;
  background: rgba(46, 204, 113, 0.22) !important;
  color: #34d399 !important;
  box-shadow: inset 0 0 0 1px rgba(46, 204, 113, 0.55);
}
.dev-theme-field-name {
  font-weight: 600;
  color: var(--pm-text);
  font-size: 12px;
}
.dev-theme-field-hint {
  flex-basis: 100%;
  color: var(--pm-text-subtle);
  font-size: 11px;
}
.dev-theme-field code {
  color: var(--pm-text-subtle);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 10px;
  opacity: 0.65;
}
.dev-theme-field b {
  color: var(--pm-text);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.dev-theme-code-map {
  display: grid;
  gap: 5px;
  padding: 8px;
  border: 1px solid rgba(117, 196, 255, 0.22);
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(117, 196, 255, 0.10), rgba(52, 211, 153, 0.06));
  color: var(--pm-text-subtle);
  font-size: 11px;
}
.dev-theme-code-map.is-live {
  border-color: rgba(52, 211, 153, 0.52);
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.18), rgba(117, 196, 255, 0.08));
  box-shadow: inset 3px 0 0 #34d399;
}
.dev-theme-code-map.is-muted {
  opacity: 0.72;
}
.dev-theme-code-map-head,
.dev-theme-code-map-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
}
.dev-theme-code-map-head strong {
  color: #34d399;
  font-size: 11px;
}
.dev-theme-code-map code {
  color: #79c0ff;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 10px;
}
.dev-theme-code-map pre {
  max-height: 96px;
  margin: 0;
  padding: 7px;
  overflow: auto;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.20);
  color: var(--pm-text-muted);
  font-size: 10px;
  white-space: pre-wrap;
}
.dev-theme-code-map p {
  margin: 0;
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
.dev-theme-resize-top-left { top: 0; left: 0; cursor: nwse-resize; }
.dev-theme-resize-top-right { top: 0; right: 0; cursor: nesw-resize; }
.dev-theme-resize-bottom-left { bottom: 0; left: 0; cursor: nesw-resize; }
.dev-theme-resize-bottom-right { right: 0; bottom: 0; cursor: nwse-resize; }

.dev-theme-selected-card {
  padding: 12px;
  border: 1px solid var(--pm-border);
  border-radius: 12px;
  background: var(--pm-bg-soft);
}
.dev-theme-selected-card.is-active {
  border-color: rgba(117, 196, 255, 0.5);
  background: rgba(117, 196, 255, 0.08);
}
.dev-theme-empty-selected {
  display: grid;
  gap: 6px;
  color: var(--pm-text-subtle);
  font-size: 12px;
}
.dev-theme-empty-title {
  margin: 0;
  color: var(--pm-text-muted);
  font-weight: 600;
}
.dev-theme-empty-steps {
  margin: 0;
  padding-left: 20px;
  line-height: 1.7;
}
.dev-theme-empty-steps code {
  padding: 0 4px;
  border: 1px solid var(--pm-border);
  border-radius: 4px;
  background: var(--pm-input-bg);
  color: var(--pm-text);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 11px;
}
.dev-theme-empty-note {
  margin: 4px 0 0;
  color: var(--pm-text-subtle);
  font-size: 11px;
}
.dev-theme-selected-info {
  display: grid;
  gap: 6px;
}
.dev-theme-selected-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.dev-theme-selected-tag {
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(117, 196, 255, 0.2);
  color: #79c0ff;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
  font-weight: 600;
}
.dev-theme-selected-count {
  color: var(--pm-text-subtle);
  font-size: 11px;
}
.dev-theme-selected-path {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--pm-text-muted);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 11px;
}
.dev-theme-effective-guide {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  width: 100%;
  padding: 8px;
  border: 1px solid rgba(46, 204, 113, 0.35);
  border-radius: 10px;
  background: rgba(46, 204, 113, 0.10);
  color: #34d399;
  font-size: 11px;
}
.dev-theme-effective-guide strong {
  flex-basis: 100%;
  color: #a7f3d0;
}
.dev-theme-effective-guide span {
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(46, 204, 113, 0.16);
  box-shadow: inset 0 0 0 1px rgba(46, 204, 113, 0.22);
}
.dev-theme-selected-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.dev-theme-section-elemonly {
  padding: 6px 10px;
  border-radius: 8px;
  border-bottom: none;
  background: rgba(255, 200, 100, 0.08);
}
.dev-theme-elemonly-tip {
  margin: 0;
  color: var(--pm-text-subtle);
  font-size: 11px;
}
</style>
