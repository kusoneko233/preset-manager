export type AnnotationKind = 'pen' | 'arrow' | 'rect' | 'pin' | 'text' | 'ruler';
export type AnnotationTool = AnnotationKind | 'eraser';
export type AnnotationColorName = 'red' | 'green' | 'blue';

export interface AnnotationColor {
  name: AnnotationColorName;
  label: string;
  value: string;
  text: string;
}

export const ANNOTATION_COLORS: AnnotationColor[] = [
  { name: 'red', label: '红色', value: '#ff5c5c', text: '#ffffff' },
  { name: 'green', label: '绿色', value: '#3ddc84', text: '#101612' },
  { name: 'blue', label: '蓝色', value: '#57a7ff', text: '#ffffff' },
];

export interface AnnotationPoint {
  x: number;
  y: number;
  nx?: number;
  ny?: number;
}

export interface AnnotationItem {
  id: string;
  label: string;
  kind: AnnotationKind;
  points: AnnotationPoint[];
  color?: string;
  colorLabel?: string;
  textColor?: string;
  note?: string;
  fontSize?: number;
}

export interface AnnotationSize {
  width: number;
  height: number;
}

export interface AnnotationRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface AnnotationToolbarPosition {
  x: number;
  y: number;
}

export function clampAnnotationToolbarPosition(
  position: Partial<AnnotationToolbarPosition> | undefined,
  container: AnnotationSize,
  toolbar: AnnotationSize,
): AnnotationToolbarPosition {
  const margin = 8;
  const fallback = { x: 16, y: 10 };
  const rawX = Number(position?.x);
  const rawY = Number(position?.y);
  const x = Number.isFinite(rawX) ? rawX : fallback.x;
  const y = Number.isFinite(rawY) ? rawY : fallback.y;
  const maxX = Math.max(container.width - toolbar.width - margin, margin);
  const maxY = Math.max(container.height - toolbar.height - margin, margin);

  return {
    x: Math.round(Math.min(Math.max(x, margin), maxX)),
    y: Math.round(Math.min(Math.max(y, margin), maxY)),
  };
}

export function getNextAnnotationLabel(items: Array<{ label: string; [key: string]: unknown }>) {
  const labels = items
    .map(item => Number(item.label))
    .filter(label => Number.isInteger(label) && label > 0);
  return String((labels.length ? Math.max(...labels) : 0) + 1);
}

export function normalizeAnnotationRect(points: AnnotationPoint[]): AnnotationRect {
  const xs = points.map(point => point.x);
  const ys = points.map(point => point.y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(right - left),
    height: Math.round(bottom - top),
  };
}

export function formatAnnotationExport(items: AnnotationItem[], size: AnnotationSize) {
  if (!items.length) return '当前没有批注。';

  const lines = [
    '预设管理器 UI 批注',
    `画布尺寸：${Math.round(size.width)} x ${Math.round(size.height)}`,
  ];

  for (const item of items) {
    lines.push(formatAnnotationItem(item));
  }

  return lines.join('\n');
}

function formatAnnotationItem(item: AnnotationItem) {
  const color = item.colorLabel ? ` color=${item.colorLabel}` : '';
  const note = item.note?.trim() ? `：${item.note.trim()}` : '';

  if (item.kind === 'pin') {
    const point = item.points[0] ?? { x: 0, y: 0 };
    return `${item.label}. [pin] x=${Math.round(point.x)}, y=${Math.round(point.y)}${color}${note}`;
  }

  if (item.kind === 'text') {
    const point = item.points[0] ?? { x: 0, y: 0 };
    const fontSize = item.fontSize ? ` font=${Math.round(item.fontSize)}px` : '';
    return `${item.label}. [text] x=${Math.round(point.x)}, y=${Math.round(point.y)}${fontSize}${color}${note}`;
  }

  if (item.kind === 'ruler') {
    const first = item.points[0] ?? { x: 0, y: 0 };
    const last = item.points[item.points.length - 1] ?? first;
    const dx = Math.round(last.x - first.x);
    const dy = Math.round(last.y - first.y);
    const length = Math.round(Math.hypot(dx, dy));
    return `${item.label}. [ruler] from=(${Math.round(first.x)}, ${Math.round(first.y)}), to=(${Math.round(last.x)}, ${Math.round(last.y)}), length=${length}px, dx=${dx}px, dy=${dy}px${color}${note}`;
  }

  if (item.kind === 'rect') {
    const rect = normalizeAnnotationRect(item.points);
    return `${item.label}. [rect] left=${rect.left}, top=${rect.top}, width=${rect.width}, height=${rect.height}${color}${note}`;
  }

  const first = item.points[0] ?? { x: 0, y: 0 };
  const last = item.points[item.points.length - 1] ?? first;
  return `${item.label}. [${item.kind}] from=(${Math.round(first.x)}, ${Math.round(first.y)}), to=(${Math.round(last.x)}, ${Math.round(last.y)}), points=${item.points.length}${color}${note}`;
}
