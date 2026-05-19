export type AnnotationKind = 'pen' | 'arrow' | 'rect' | 'pin';

export interface AnnotationPoint {
  x: number;
  y: number;
}

export interface AnnotationItem {
  id: string;
  label: string;
  kind: AnnotationKind;
  points: AnnotationPoint[];
  note?: string;
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
  const note = item.note?.trim() ? `：${item.note.trim()}` : '';

  if (item.kind === 'pin') {
    const point = item.points[0] ?? { x: 0, y: 0 };
    return `${item.label}. [pin] x=${Math.round(point.x)}, y=${Math.round(point.y)}${note}`;
  }

  if (item.kind === 'rect') {
    const rect = normalizeAnnotationRect(item.points);
    return `${item.label}. [rect] left=${rect.left}, top=${rect.top}, width=${rect.width}, height=${rect.height}${note}`;
  }

  const first = item.points[0] ?? { x: 0, y: 0 };
  const last = item.points[item.points.length - 1] ?? first;
  return `${item.label}. [${item.kind}] from=(${Math.round(first.x)}, ${Math.round(first.y)}), to=(${Math.round(last.x)}, ${Math.round(last.y)}), points=${item.points.length}${note}`;
}
