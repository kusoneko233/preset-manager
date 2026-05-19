<template>
  <div class="annotation-overlay" @pointerdown.stop="onPointerDown" @pointermove.stop="onPointerMove" @pointerup.stop="onPointerUp" @pointercancel.stop="onPointerUp">
    <div class="annotation-toolbar" @pointerdown.stop>
      <button v-for="option in toolOptions" :key="option.kind" class="anno-btn" :class="{ active: tool === option.kind }" :title="option.title" @click="tool = option.kind">
        <i :class="['fas', option.icon, 'text-xs']" />
      </button>
      <div class="anno-separator" />
      <button class="anno-btn" title="复制批注信息" @click="copyAnnotations">
        <i class="fas fa-copy text-xs" />
      </button>
      <button class="anno-btn" title="撤销上一条批注" :disabled="!items.length" @click="items.pop()">
        <i class="fas fa-undo text-xs" />
      </button>
      <button class="anno-btn" title="清空批注" :disabled="!items.length" @click="items = []">
        <i class="fas fa-trash text-xs" />
      </button>
      <button class="anno-btn" title="关闭批注模式" @click="$emit('close')">
        <i class="fas fa-times text-xs" />
      </button>
    </div>

    <svg ref="svgRef" class="annotation-canvas">
      <defs>
        <marker id="pm-annotation-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" />
        </marker>
      </defs>

      <g v-for="item in items" :key="item.id">
        <polyline v-if="item.kind === 'pen'" class="anno-stroke" :points="toPolyline(item.points)" />
        <line v-else-if="item.kind === 'arrow'" class="anno-stroke anno-arrow" v-bind="toLineAttrs(item.points)" marker-end="url(#pm-annotation-arrow)" />
        <rect v-else-if="item.kind === 'rect'" class="anno-rect" v-bind="toRectAttrs(item.points)" />
        <g v-else class="anno-pin">
          <circle :cx="item.points[0]?.x" :cy="item.points[0]?.y" r="13" />
          <text :x="item.points[0]?.x" :y="(item.points[0]?.y ?? 0) + 4">{{ item.label }}</text>
        </g>
      </g>

      <g v-if="draft">
        <polyline v-if="draft.kind === 'pen'" class="anno-stroke draft" :points="toPolyline(draft.points)" />
        <line v-else-if="draft.kind === 'arrow'" class="anno-stroke anno-arrow draft" v-bind="toLineAttrs(draft.points)" marker-end="url(#pm-annotation-arrow)" />
        <rect v-else-if="draft.kind === 'rect'" class="anno-rect draft" v-bind="toRectAttrs(draft.points)" />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { formatAnnotationExport, getNextAnnotationLabel, normalizeAnnotationRect, type AnnotationItem, type AnnotationKind, type AnnotationPoint } from '../utils/annotationTools';

defineEmits<{ close: [] }>();

const svgRef = ref<SVGSVGElement>();
const tool = ref<AnnotationKind>('pen');
const items = ref<AnnotationItem[]>([]);
const draft = ref<AnnotationItem | null>(null);

const toolOptions: { kind: AnnotationKind; icon: string; title: string }[] = [
  { kind: 'pen', icon: 'fa-pencil-alt', title: '画线' },
  { kind: 'arrow', icon: 'fa-location-arrow', title: '箭头' },
  { kind: 'rect', icon: 'fa-vector-square', title: '矩形框' },
  { kind: 'pin', icon: 'fa-map-pin', title: '编号点' },
];

function getPoint(e: PointerEvent): AnnotationPoint {
  const rect = svgRef.value?.getBoundingClientRect();
  return {
    x: Math.round(e.clientX - (rect?.left ?? 0)),
    y: Math.round(e.clientY - (rect?.top ?? 0)),
  };
}

function createItem(point: AnnotationPoint): AnnotationItem {
  return {
    id: `anno_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label: getNextAnnotationLabel(items.value),
    kind: tool.value,
    points: [point],
  };
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return;
  const point = getPoint(e);
  if (tool.value === 'pin') {
    items.value.push(createItem(point));
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
  if (isVisibleDraft(draft.value)) items.value.push(draft.value);
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

function toRectAttrs(points: AnnotationPoint[]) {
  const rect = normalizeAnnotationRect(points.length > 1 ? points : [points[0] ?? { x: 0, y: 0 }, points[0] ?? { x: 0, y: 0 }]);
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
}

async function copyAnnotations() {
  const rect = svgRef.value?.getBoundingClientRect();
  const text = formatAnnotationExport(items.value, { width: rect?.width ?? 0, height: rect?.height ?? 0 });
  await navigator.clipboard?.writeText(text);
  toastr.info('已复制批注信息', '', { timeOut: 1200 });
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
.annotation-toolbar {
  position: absolute;
  top: 10px;
  left: 50%;
  z-index: 2;
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 6px;
  border: 1px solid var(--pm-border-strong);
  border-radius: 999px;
  background: color-mix(in srgb, var(--pm-ai-capsule) 88%, transparent);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.24);
  transform: translateX(-50%);
  backdrop-filter: blur(20px);
}
.anno-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--pm-text-muted);
  cursor: pointer;
}
.anno-btn:hover:not(:disabled),
.anno-btn.active {
  border-color: var(--pm-border-strong);
  background: var(--pm-bg-hover);
  color: var(--pm-text);
}
.anno-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.anno-separator {
  width: 1px;
  height: 18px;
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
  stroke: #ffcc4d;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
}
.anno-arrow,
#pm-annotation-arrow path {
  fill: #ffcc4d;
  stroke: #ffcc4d;
}
.anno-rect {
  stroke-dasharray: 8 5;
}
.draft {
  opacity: 0.72;
}
.anno-pin circle {
  fill: #ffcc4d;
  stroke: rgba(0, 0, 0, 0.5);
  stroke-width: 1;
}
.anno-pin text {
  fill: #171717;
  font-size: 12px;
  font-weight: 750;
  text-anchor: middle;
  user-select: none;
}
</style>
