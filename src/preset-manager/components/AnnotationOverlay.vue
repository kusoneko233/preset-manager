<template>
  <div
    ref="overlayRef"
    class="annotation-overlay"
    :class="{ erasing: tool === 'eraser' }"
    @pointerdown.stop="onPointerDown"
    @pointermove.stop="onPointerMove"
    @pointerup.stop="onPointerUp"
    @pointercancel.stop="onPointerUp"
  >
    <div class="annotation-toolbar" :class="{ collapsed: toolbarCollapsed }" :style="toolbarStyle" @pointerdown.stop>
      <button class="anno-btn drag-handle" title="拖动工具栏" @pointerdown.prevent="onToolbarDragStart">
        <i class="fas fa-grip-lines text-xs" />
      </button>
      <template v-if="!toolbarCollapsed">
        <button v-for="option in toolOptions" :key="option.kind" class="anno-btn" :class="{ active: tool === option.kind }" :title="option.title" @click="tool = option.kind">
          <i :class="['fas', option.icon, 'text-xs']" />
        </button>
        <div class="anno-separator" />
        <button
          v-for="colorOption in ANNOTATION_COLORS"
          :key="colorOption.name"
          class="anno-color-btn"
          :class="{ active: currentColor.name === colorOption.name }"
          :title="colorOption.label"
          :aria-label="`选择${colorOption.label}`"
          @click="currentColor = colorOption"
        >
          <span :style="{ background: colorOption.value }" />
        </button>
        <div class="anno-separator" />
        <button class="anno-btn text-size-btn" title="文字变小" @click="changeTextSize(-2)">
          <span>A-</span>
        </button>
        <span class="text-size-label" :title="`当前文字大小 ${currentTextSize}px`">{{ currentTextSize }}</span>
        <button class="anno-btn text-size-btn" title="文字变大" @click="changeTextSize(2)">
          <span>A+</span>
        </button>
        <div class="anno-separator" />
        <button class="anno-btn" title="复制批注信息" @click="copyAnnotations">
          <i class="fas fa-copy text-xs" />
        </button>
        <button class="anno-btn" title="撤销上一条批注" :disabled="!items.length" @click="undoAnnotation">
          <i class="fas fa-undo text-xs" />
        </button>
        <button class="anno-btn" title="清除批注" :disabled="!items.length" @click="clearAnnotations">
          <i class="fas fa-trash text-xs" />
        </button>
        <button class="anno-btn" title="关闭批注模式 Esc" @click="emit('close')">
          <i class="fas fa-times text-xs" />
        </button>
      </template>
      <button class="anno-btn" :title="toolbarCollapsed ? '展开工具栏' : '折叠工具栏'" @click="toolbarCollapsed = !toolbarCollapsed">
        <i :class="['fas', toolbarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left', 'text-xs']" />
      </button>
    </div>

    <svg ref="svgRef" class="annotation-canvas">
      <defs>
        <marker
          v-for="colorOption in ANNOTATION_COLORS"
          :id="`pm-annotation-arrow-${colorOption.name}`"
          :key="colorOption.name"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" :fill="colorOption.value" :stroke="colorOption.value" />
        </marker>
      </defs>

      <g v-for="item in items" v-show="item.id !== textDraft?.editingId" :key="item.id">
        <polyline v-if="item.kind === 'pen'" class="anno-stroke" :style="getStrokeStyle(item)" :points="toPolyline(item.points)" />
        <line v-else-if="item.kind === 'arrow'" class="anno-stroke anno-arrow" :style="getStrokeStyle(item)" v-bind="toLineAttrs(item.points)" :marker-end="getMarkerUrl(item)" />
        <rect v-else-if="item.kind === 'rect'" class="anno-rect" :style="getStrokeStyle(item)" v-bind="toRectAttrs(item.points)" />
        <g v-else-if="item.kind === 'ruler'" class="anno-ruler">
          <line class="anno-stroke anno-ruler-line" :style="getStrokeStyle(item)" v-bind="toLineAttrs(item.points)" />
          <circle v-bind="toRulerStartPoint(item.points)" r="4" :fill="item.color" />
          <circle v-bind="toRulerEndPoint(item.points)" r="4" :fill="item.color" />
          <text class="anno-ruler-label" v-bind="toRulerLabelPoint(item.points)" :fill="item.color">
            {{ getRulerLabel(item.points) }}
          </text>
        </g>
        <g v-else-if="item.kind === 'text'" class="anno-text" @pointerdown.stop="onTextPointerDown($event, item)">
          <rect class="anno-text-hit" v-bind="toTextBoxAttrs(item.points)" />
          <foreignObject class="anno-text-foreign" v-bind="toTextBoxAttrs(item.points)">
            <div xmlns="http://www.w3.org/1999/xhtml" class="anno-text-content" :style="{ color: item.color, fontSize: `${item.fontSize ?? DEFAULT_TEXT_SIZE}px` }">
              {{ item.note }}
            </div>
          </foreignObject>
        </g>
        <g v-else class="anno-pin">
          <circle :cx="item.points[0]?.x" :cy="item.points[0]?.y" r="13" :fill="item.color" />
          <text :x="item.points[0]?.x" :y="(item.points[0]?.y ?? 0) + 4" :fill="item.textColor">{{ item.label }}</text>
        </g>
      </g>

      <g v-if="draft">
        <polyline v-if="draft.kind === 'pen'" class="anno-stroke draft" :style="getStrokeStyle(draft)" :points="toPolyline(draft.points)" />
        <line v-else-if="draft.kind === 'arrow'" class="anno-stroke anno-arrow draft" :style="getStrokeStyle(draft)" v-bind="toLineAttrs(draft.points)" :marker-end="getMarkerUrl(draft)" />
        <rect v-else-if="draft.kind === 'rect'" class="anno-rect draft" :style="getStrokeStyle(draft)" v-bind="toRectAttrs(draft.points)" />
        <g v-else-if="draft.kind === 'ruler'" class="anno-ruler draft">
          <line class="anno-stroke anno-ruler-line" :style="getStrokeStyle(draft)" v-bind="toLineAttrs(draft.points)" />
          <circle v-bind="toRulerStartPoint(draft.points)" r="4" :fill="draft.color" />
          <circle v-bind="toRulerEndPoint(draft.points)" r="4" :fill="draft.color" />
          <text class="anno-ruler-label" v-bind="toRulerLabelPoint(draft.points)" :fill="draft.color">
            {{ getRulerLabel(draft.points) }}
          </text>
        </g>
        <rect v-else-if="draft.kind === 'text'" class="anno-text-box draft" :style="getStrokeStyle(draft)" v-bind="toRectAttrs(draft.points)" />
      </g>
    </svg>

    <textarea
      v-if="textDraft"
      ref="textInputRef"
      v-model="textDraft.value"
      class="anno-text-input"
      :style="textInputStyle"
      placeholder="输入批注"
      @pointerdown.stop
      @click.stop
      @blur="commitTextInput"
      @keydown.enter.exact.prevent.stop="commitTextInput"
      @keydown.esc.prevent.stop="cancelTextInput"
    />
  </div>
</template>

<script setup lang="ts">
import { ANNOTATION_COLORS, formatAnnotationExport, getNextAnnotationLabel, normalizeAnnotationRect, type AnnotationColor, type AnnotationItem, type AnnotationPoint, type AnnotationTool } from '../utils/annotationTools';

const emit = defineEmits<{ close: [] }>();

const STORAGE_KEY = 'preset_manager_annotations';
const TOOLBAR_STORAGE_KEY = 'preset_manager_annotation_toolbar';

const parentDoc = inject<Document>('parentDocument', document);
const overlayRef = ref<HTMLElement>();
const svgRef = ref<SVGSVGElement>();
const tool = ref<AnnotationTool>('pen');
const items = ref<AnnotationItem[]>([]);
const draft = ref<AnnotationItem | null>(null);
const currentColor = ref<AnnotationColor>(ANNOTATION_COLORS.find(color => color.name === 'red') ?? ANNOTATION_COLORS[0]);
const toolbarPosition = ref(loadToolbarPosition());
const toolbarCollapsed = ref(false);
const textInputRef = ref<HTMLTextAreaElement>();
const textDraft = ref<{
  points: AnnotationPoint[];
  value: string;
  editingId?: string;
  color?: string;
  colorLabel?: string;
  textColor?: string;
  fontSize?: number;
} | null>(null);
let isRestoring = false;
let textDragState: { item: AnnotationItem; startPoint: AnnotationPoint; startItemPoints: AnnotationPoint[] } | null = null;
const DEFAULT_TEXT_SIZE = 22;
const MIN_TEXT_SIZE = 14;
const MAX_TEXT_SIZE = 34;
const currentTextSize = ref(DEFAULT_TEXT_SIZE);

const toolOptions: { kind: AnnotationTool; icon: string; title: string }[] = [
  { kind: 'pen', icon: 'fa-pencil-alt', title: '画线' },
  { kind: 'arrow', icon: 'fa-location-arrow', title: '箭头' },
  { kind: 'ruler', icon: 'fa-ruler-combined', title: '标尺' },
  { kind: 'rect', icon: 'fa-square', title: '矩形框' },
  { kind: 'pin', icon: 'fa-map-pin', title: '编号点' },
  { kind: 'text', icon: 'fa-font', title: '文字' },
  { kind: 'eraser', icon: 'fa-eraser', title: '橡皮擦' },
];

const toolbarStyle = computed(() => ({
  left: `${toolbarPosition.value.x}px`,
  top: `${toolbarPosition.value.y}px`,
}));

const textInputStyle = computed(() => ({
  left: `${textDraftRect.value.left}px`,
  top: `${textDraftRect.value.top}px`,
  width: `${textDraftRect.value.width}px`,
  height: `${textDraftRect.value.height}px`,
  color: textDraft.value?.color ?? currentColor.value.value,
  fontSize: `${textDraft.value?.fontSize ?? currentTextSize.value}px`,
}));

const textDraftRect = computed(() => {
  if (!textDraft.value) return { left: 0, top: 0, width: 220, height: 58 };
  const rect = normalizeAnnotationRect(textDraft.value.points);
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
});

watch(
  items,
  () => {
    if (!isRestoring) persistAnnotations();
  },
  { deep: true },
);

onMounted(() => {
  loadAnnotations();
  window.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('keydown', onKeyDown, true);
  parentDoc?.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('resize', resizeCurrentAnnotations);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown, true);
  document.removeEventListener('keydown', onKeyDown, true);
  parentDoc?.removeEventListener('keydown', onKeyDown, true);
  window.removeEventListener('resize', resizeCurrentAnnotations);
});

function getCanvasSize() {
  const rect = svgRef.value?.getBoundingClientRect();
  return { width: rect?.width ?? 1, height: rect?.height ?? 1 };
}

function getPoint(e: PointerEvent): AnnotationPoint {
  const rect = svgRef.value?.getBoundingClientRect();
  const size = getCanvasSize();
  const x = Math.round(e.clientX - (rect?.left ?? 0));
  const y = Math.round(e.clientY - (rect?.top ?? 0));
  return {
    x,
    y,
    nx: size.width ? x / size.width : 0,
    ny: size.height ? y / size.height : 0,
  };
}

function withNormalizedPoints(item: AnnotationItem): AnnotationItem {
  const size = getCanvasSize();
  return {
    ...item,
    points: item.points.map(point => withNormalizedPoint(point, size)),
  };
}

function withNormalizedPoint(point: AnnotationPoint, size = getCanvasSize()): AnnotationPoint {
  return {
    ...point,
    nx: size.width ? point.x / size.width : point.nx,
    ny: size.height ? point.y / size.height : point.ny,
  };
}

function restorePoints(item: AnnotationItem): AnnotationItem {
  const size = getCanvasSize();
  return {
    ...item,
    points: item.points.map(point => ({
      ...point,
      x: typeof point.nx === 'number' ? Math.round(point.nx * size.width) : point.x,
      y: typeof point.ny === 'number' ? Math.round(point.ny * size.height) : point.y,
    })),
  };
}

function createItem(point: AnnotationPoint, kind = tool.value): AnnotationItem {
  const itemKind = kind as AnnotationItem['kind'];
  return {
    id: `anno_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label: itemKind === 'pin'
      ? getNextAnnotationLabel(items.value.filter(item => item.kind === 'pin'))
      : getNextAnnotationLabel(items.value),
    kind: itemKind,
    points: [point],
    color: currentColor.value.value,
    colorLabel: currentColor.value.label,
    textColor: currentColor.value.text,
    fontSize: itemKind === 'text' ? currentTextSize.value : undefined,
  };
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return;
  if (textDraft.value) {
    commitTextInput();
    return;
  }
  const point = getPoint(e);

  if (tool.value === 'eraser') {
    eraseAt(point);
    return;
  }

  if (tool.value === 'pin') {
    items.value.push(withNormalizedPoints(createItem(point, 'pin')));
    return;
  }

  if (tool.value === 'text') {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    draft.value = createItem(point, 'text');
    return;
  }

  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  draft.value = createItem(point);
}

function onPointerMove(e: PointerEvent) {
  if (!draft.value) return;
  const point = getPoint(e);
  draft.value.points = draft.value.kind === 'pen' ? [...draft.value.points, point] : [draft.value.points[0], point];
}

function onPointerUp() {
  if (!draft.value) return;
  if (draft.value.kind === 'text') {
    if (isVisibleDraft(draft.value)) beginTextInputFromDraft(draft.value);
    draft.value = null;
    return;
  }
  if (isVisibleDraft(draft.value)) items.value.push(withNormalizedPoints(draft.value));
  draft.value = null;
}

function isVisibleDraft(item: AnnotationItem) {
  if (item.kind === 'pen') return item.points.length > 2;
  const rect = normalizeAnnotationRect(item.points);
  return rect.width > 4 || rect.height > 4;
}

function toPolyline(points: AnnotationPoint[]) {
  return points.map(point => `${point.x},${point.y}`).join(' ');
}

function toLineAttrs(points: AnnotationPoint[]) {
  const start = points[0] ?? { x: 0, y: 0 };
  const end = points[points.length - 1] ?? start;
  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
}

function toRulerStartPoint(points: AnnotationPoint[]) {
  const start = points[0] ?? { x: 0, y: 0 };
  return { cx: start.x, cy: start.y };
}

function toRulerEndPoint(points: AnnotationPoint[]) {
  const start = points[0] ?? { x: 0, y: 0 };
  const end = points[points.length - 1] ?? start;
  return { cx: end.x, cy: end.y };
}

function toRulerLabelPoint(points: AnnotationPoint[]) {
  const start = points[0] ?? { x: 0, y: 0 };
  const end = points[points.length - 1] ?? start;
  return {
    x: Math.round((start.x + end.x) / 2),
    y: Math.round((start.y + end.y) / 2) - 10,
  };
}

function getRulerLabel(points: AnnotationPoint[]) {
  const start = points[0] ?? { x: 0, y: 0 };
  const end = points[points.length - 1] ?? start;
  const dx = Math.round(end.x - start.x);
  const dy = Math.round(end.y - start.y);
  return `${Math.round(Math.hypot(dx, dy))}px  Δx ${dx}  Δy ${dy}`;
}

function toRectAttrs(points: AnnotationPoint[]) {
  const rect = normalizeAnnotationRect(points.length > 1 ? points : [points[0] ?? { x: 0, y: 0 }, points[0] ?? { x: 0, y: 0 }]);
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
}

function toTextBoxAttrs(points: AnnotationPoint[]) {
  const rect = normalizeAnnotationRect(points.length > 1 ? points : [points[0] ?? { x: 0, y: 0 }, { x: (points[0]?.x ?? 0) + 220, y: (points[0]?.y ?? 0) + 58 }]);
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function getStrokeStyle(item: AnnotationItem) {
  return { stroke: item.color ?? ANNOTATION_COLORS[0].value };
}

function getMarkerUrl(item: AnnotationItem) {
  const colorName = ANNOTATION_COLORS.find(color => color.value === item.color)?.name ?? 'red';
  return `url(#pm-annotation-arrow-${colorName})`;
}

function undoAnnotation() {
  items.value.pop();
}

function beginTextInputFromDraft(item: AnnotationItem, editing = false) {
  const points = item.points.length > 1
    ? item.points
    : [
        item.points[0] ?? { x: 0, y: 0 },
        { x: (item.points[0]?.x ?? 0) + 220, y: (item.points[0]?.y ?? 0) + 58 },
      ];
  const rect = normalizeAnnotationRect(points);
  const size = getCanvasSize();
  const endPoint = {
    x: rect.left + rect.width,
    y: rect.top + rect.height,
  };
  textDraft.value = {
    points: [
      withNormalizedPoint({ x: rect.left, y: rect.top }, size),
      withNormalizedPoint(endPoint, size),
    ],
    value: item.note ?? '',
    editingId: editing ? item.id : undefined,
    color: item.color,
    colorLabel: item.colorLabel,
    textColor: item.textColor,
    fontSize: item.fontSize ?? currentTextSize.value,
  };
  currentTextSize.value = item.fontSize ?? currentTextSize.value;
  nextTick(() => {
    window.requestAnimationFrame(() => textInputRef.value?.focus());
  });
}

function commitTextInput() {
  const draftText = textDraft.value;
  if (!draftText) return;
  const note = draftText.value.trim();
  const points = getTextInputPoints(draftText.points);
  if (draftText.editingId) {
    const item = items.value.find(annotation => annotation.id === draftText.editingId);
    if (item) {
      if (note) {
        item.points = points;
        item.note = note;
        item.fontSize = draftText.fontSize ?? currentTextSize.value;
      } else {
        items.value = items.value.filter(annotation => annotation.id !== draftText.editingId);
      }
    }
    textDraft.value = null;
    return;
  }
  if (note) {
    const start = points[0] ?? { x: 0, y: 0 };
    items.value.push(withNormalizedPoints({
      ...createItem(start, 'text'),
      points,
      note,
      color: draftText.color ?? currentColor.value.value,
      colorLabel: draftText.colorLabel ?? currentColor.value.label,
      textColor: draftText.textColor ?? currentColor.value.text,
      fontSize: draftText.fontSize ?? currentTextSize.value,
    }));
  }
  textDraft.value = null;
}

function getTextInputPoints(fallback: AnnotationPoint[]) {
  const inputRect = textInputRef.value?.getBoundingClientRect();
  const canvasRect = svgRef.value?.getBoundingClientRect();
  if (!inputRect || !canvasRect) return fallback;

  const start = {
    x: Math.round(inputRect.left - canvasRect.left),
    y: Math.round(inputRect.top - canvasRect.top),
  };
  const end = {
    x: Math.round(inputRect.right - canvasRect.left),
    y: Math.round(inputRect.bottom - canvasRect.top),
  };

  return [
    withNormalizedPoint(start),
    withNormalizedPoint(end),
  ];
}

function cancelTextInput() {
  textDraft.value = null;
}

function onTextPointerDown(e: PointerEvent, item: AnnotationItem) {
  if (e.button !== 0) return;
  e.preventDefault();
  if (tool.value === 'eraser') {
    eraseAt(getPoint(e));
    return;
  }
  if (textDraft.value) {
    commitTextInput();
    return;
  }

  const startItemPoints = item.points.length
    ? item.points.map(point => ({ ...point }))
    : [{ x: 0, y: 0 }];
  const target = e.currentTarget as SVGElement;
  target.setPointerCapture(e.pointerId);
  textDragState = {
    item,
    startPoint: getPoint(e),
    startItemPoints,
  };
  let moved = false;

  const onMove = (moveEvent: PointerEvent) => {
    if (!textDragState) return;
    const state = textDragState;
    const point = getPoint(moveEvent);
    if (Math.hypot(point.x - state.startPoint.x, point.y - state.startPoint.y) < 4) return;
    moved = true;
    state.item.points = state.startItemPoints.map(startPoint => withNormalizedPoint({
      x: startPoint.x + point.x - state.startPoint.x,
      y: startPoint.y + point.y - state.startPoint.y,
    }));
  };

  const onEnd = () => {
    if (textDragState) {
      if (moved) {
        textDragState.item.points = textDragState.item.points.map(point => withNormalizedPoint(point));
        persistAnnotations();
      } else {
        beginTextInputFromDraft(textDragState.item, true);
      }
    }
    textDragState = null;
    target.removeEventListener('pointermove', onMove);
    target.removeEventListener('pointerup', onEnd);
    target.removeEventListener('pointercancel', onEnd);
  };

  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerup', onEnd);
  target.addEventListener('pointercancel', onEnd);
}

function clearAnnotations() {
  items.value = [];
  localStorage.removeItem(STORAGE_KEY);
  toastr.info('批注已清除', '', { timeOut: 1200 });
}

function persistAnnotations() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value.map(withNormalizedPoints)));
}

function loadAnnotations() {
  restoreSavedAnnotations();
}

function resizeCurrentAnnotations() {
  isRestoring = true;
  items.value = items.value.map(restorePoints);
  nextTick(() => {
    isRestoring = false;
    persistAnnotations();
  });
}

function restoreSavedAnnotations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    isRestoring = true;
    const parsed = JSON.parse(raw) as AnnotationItem[];
    items.value = parsed.map(restorePoints);
    nextTick(() => {
      isRestoring = false;
    });
  } catch (error) {
    isRestoring = false;
    console.warn('[PresetManager] Failed to load annotations:', error);
  }
}

async function copyAnnotations() {
  const rect = svgRef.value?.getBoundingClientRect();
  const text = formatAnnotationExport(items.value, { width: rect?.width ?? 0, height: rect?.height ?? 0 });
  await navigator.clipboard?.writeText(text);
  toastr.info('已复制批注信息', '', { timeOut: 1200 });
}

function eraseAt(point: AnnotationPoint) {
  const hitIndex = findHitItemIndex(point);
  if (hitIndex >= 0) items.value.splice(hitIndex, 1);
}

function findHitItemIndex(point: AnnotationPoint) {
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  items.value.forEach((item, index) => {
    const distance = getItemDistance(item, point);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestDistance <= 22 ? bestIndex : -1;
}

function getItemDistance(item: AnnotationItem, point: AnnotationPoint) {
  if (item.kind === 'rect' || item.kind === 'text') {
    const rect = normalizeAnnotationRect(item.points);
    if (point.x >= rect.left && point.x <= rect.left + rect.width && point.y >= rect.top && point.y <= rect.top + rect.height) return 0;
    return Math.min(
      Math.abs(point.x - rect.left),
      Math.abs(point.x - (rect.left + rect.width)),
      Math.abs(point.y - rect.top),
      Math.abs(point.y - (rect.top + rect.height)),
    );
  }

  if (item.kind === 'arrow' || item.kind === 'ruler') {
    const start = item.points[0] ?? { x: 0, y: 0 };
    const end = item.points[item.points.length - 1] ?? start;
    return distanceToSegment(point, start, end);
  }

  return Math.min(...item.points.map(p => Math.hypot(point.x - p.x, point.y - p.y)));
}

function distanceToSegment(point: AnnotationPoint, start: AnnotationPoint, end: AnnotationPoint) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  const x = start.x + t * dx;
  const y = start.y + t * dy;
  return Math.hypot(point.x - x, point.y - y);
}

function changeTextSize(delta: number) {
  currentTextSize.value = Math.max(MIN_TEXT_SIZE, Math.min(MAX_TEXT_SIZE, currentTextSize.value + delta));
  if (textDraft.value) {
    textDraft.value.fontSize = currentTextSize.value;
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    if (textDraft.value) {
      cancelTextInput();
      return;
    }
    emit('close');
  }
}

function onToolbarDragStart(e: PointerEvent) {
  const startX = e.clientX;
  const startY = e.clientY;
  const startPos = { ...toolbarPosition.value };
  const target = e.currentTarget as HTMLElement;
  target.setPointerCapture(e.pointerId);

  const onMove = (moveEvent: PointerEvent) => {
    const bounds = overlayRef.value?.getBoundingClientRect();
    const maxX = Math.max((bounds?.width ?? window.innerWidth) - 120, 8);
    const maxY = Math.max((bounds?.height ?? window.innerHeight) - 44, 8);
    toolbarPosition.value = {
      x: Math.min(Math.max(startPos.x + moveEvent.clientX - startX, 8), maxX),
      y: Math.min(Math.max(startPos.y + moveEvent.clientY - startY, 8), maxY),
    };
  };

  const onEnd = () => {
    localStorage.setItem(TOOLBAR_STORAGE_KEY, JSON.stringify(toolbarPosition.value));
    target.removeEventListener('pointermove', onMove);
    target.removeEventListener('pointerup', onEnd);
    target.removeEventListener('pointercancel', onEnd);
  };

  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerup', onEnd);
  target.addEventListener('pointercancel', onEnd);
}

function loadToolbarPosition() {
  try {
    const raw = localStorage.getItem(TOOLBAR_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as { x: number; y: number };
  } catch {}
  return { x: 16, y: 10 };
}
</script>

<style scoped>
.annotation-overlay {
  position: absolute;
  inset: 0;
  z-index: 950;
  cursor: crosshair;
  background: rgba(0, 0, 0, 0.04);
}
.annotation-overlay.erasing {
  cursor: cell;
}
.annotation-toolbar {
  position: absolute;
  z-index: 2;
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 4px;
  border: 1px solid var(--pm-border-strong);
  border-radius: 999px;
  background: color-mix(in srgb, var(--pm-ai-capsule) 88%, transparent);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(20px);
}
.annotation-toolbar.collapsed {
  gap: 3px;
  padding: 3px;
}
.anno-btn,
.anno-color-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
}
.anno-btn i {
  font-size: 11px;
}
.anno-btn span {
  font-size: 10px;
  font-weight: 750;
  line-height: 1;
}
.text-size-btn {
  width: 28px;
}
.text-size-label {
  min-width: 18px;
  color: var(--pm-text-muted);
  font-size: 11px;
  font-weight: 700;
  text-align: center;
}
.drag-handle {
  cursor: grab;
}
.drag-handle:active {
  cursor: grabbing;
}
.anno-btn:hover:not(:disabled),
.anno-btn.active,
.anno-color-btn:hover,
.anno-color-btn.active {
  border-color: var(--pm-border-strong);
  background: var(--pm-bg-hover);
  color: var(--pm-text);
}
.anno-color-btn span {
  width: 12px;
  height: 12px;
  border: 1px solid rgba(0, 0, 0, 0.28);
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}
.anno-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.anno-separator {
  width: 1px;
  height: 14px;
  background: var(--pm-divider);
}
.annotation-canvas {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}
.anno-stroke,
.anno-rect {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
}
.anno-rect {
  stroke-dasharray: 8 5;
}
.anno-ruler-line {
  stroke-width: 2.5;
  stroke-dasharray: 7 5;
}
.anno-ruler circle {
  stroke: rgba(0, 0, 0, 0.62);
  stroke-width: 1;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
}
.anno-ruler-label {
  font-size: 13px;
  font-weight: 800;
  paint-order: stroke;
  stroke: rgba(0, 0, 0, 0.84);
  stroke-width: 4px;
  stroke-linejoin: round;
  text-anchor: middle;
  user-select: none;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.38));
}
.anno-text-box {
  fill: color-mix(in srgb, var(--pm-ai-capsule) 18%, transparent);
  stroke-width: 2;
  stroke-dasharray: 6 5;
  rx: 8;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.28));
}
.draft {
  opacity: 0.72;
}
.anno-pin circle {
  stroke: rgba(0, 0, 0, 0.5);
  stroke-width: 1;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
}
.anno-pin text {
  font-size: 12px;
  font-weight: 750;
  text-anchor: middle;
  user-select: none;
}
.anno-text {
  cursor: move;
}
.anno-text-hit {
  fill: transparent;
  stroke: transparent;
  stroke-width: 0;
  pointer-events: all;
  rx: 8;
}
.anno-text-content {
  width: 100%;
  height: 100%;
  padding: 5px 7px;
  overflow: hidden;
  font-weight: 750;
  line-height: 1.35;
  word-break: break-word;
  white-space: pre-wrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85), 0 0 8px rgba(0, 0, 0, 0.42);
  user-select: none;
  pointer-events: none;
}
.anno-text-input {
  position: absolute;
  z-index: 3;
  min-width: 0;
  min-height: 0;
  padding: 6px 8px;
  border: 1px solid var(--pm-border-strong);
  border-radius: 8px;
  background: color-mix(in srgb, var(--pm-ai-capsule) 92%, transparent);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.26);
  font-weight: 750;
  line-height: 1.35;
  resize: both;
  overflow: auto;
  outline: none;
  backdrop-filter: blur(18px);
}
.anno-text-input::placeholder {
  color: var(--pm-text-subtle);
}
</style>
