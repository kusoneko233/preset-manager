import { CODEX_REFERENCE_METRICS, getCodexMainWidth } from '../designMetrics';
import type { DevThemeTarget } from './devThemeCss';

export type DevThemeCropTargets = Record<DevThemeTarget, boolean>;

export type DevThemeCropRect = {
  width: number;
  height: number;
};

export type DevThemeCropFrameState = {
  centerX: number;
  centerY: number;
  scale: number;
};

export type DevThemeCropAspect = {
  label: string;
  width: number;
  height: number;
  ratio: number;
};

const DEV_THEME_CROP_ASPECTS = {
  sidebar: { label: '侧栏', width: CODEX_REFERENCE_METRICS.sidebar.width, height: CODEX_REFERENCE_METRICS.window.height },
  workspace: { label: '工作区' },
  panel: { label: '弹窗', width: CODEX_REFERENCE_METRICS.window.width, height: CODEX_REFERENCE_METRICS.window.height },
  selected: { label: '选中元素' },
  fallbackVertical: { label: '竖图', width: 512, height: 768 },
} as const;

function createAspect(label: string, width: number, height: number): DevThemeCropAspect {
  return { label, width, height, ratio: width / height };
}

function isUsableRect(rect: DevThemeCropRect | null | undefined) {
  return Boolean(rect && Number.isFinite(rect.width) && Number.isFinite(rect.height) && rect.width > 0 && rect.height > 0);
}

function getActiveTargets(targets: DevThemeCropTargets) {
  return (Object.entries(targets) as [DevThemeTarget, boolean][])
    .filter(([, enabled]) => enabled)
    .map(([target]) => target);
}

export function getDevThemeCropAspect(options: {
  targets: DevThemeCropTargets;
  selectedRect?: DevThemeCropRect | null;
}): DevThemeCropAspect {
  const activeTargets = getActiveTargets(options.targets);

  if (activeTargets.length === 1) {
    const target = activeTargets[0];
    if (target === 'sidebar') {
      return createAspect(DEV_THEME_CROP_ASPECTS.sidebar.label, DEV_THEME_CROP_ASPECTS.sidebar.width, DEV_THEME_CROP_ASPECTS.sidebar.height);
    }
    if (target === 'workspace') {
      return createAspect(DEV_THEME_CROP_ASPECTS.workspace.label, getCodexMainWidth(), CODEX_REFERENCE_METRICS.window.height);
    }
    if (target === 'selected') {
      if (isUsableRect(options.selectedRect)) {
        return createAspect(DEV_THEME_CROP_ASPECTS.selected.label, Math.round(options.selectedRect!.width), Math.round(options.selectedRect!.height));
      }
      return createAspect(DEV_THEME_CROP_ASPECTS.fallbackVertical.label, DEV_THEME_CROP_ASPECTS.fallbackVertical.width, DEV_THEME_CROP_ASPECTS.fallbackVertical.height);
    }
  }

  return createAspect(DEV_THEME_CROP_ASPECTS.panel.label, DEV_THEME_CROP_ASPECTS.panel.width, DEV_THEME_CROP_ASPECTS.panel.height);
}

export function getDevThemeCropStageSize(maxWidth = 720) {
  return {
    width: maxWidth,
    height: Math.round(maxWidth * 2 / 3),
  };
}

export function getDevThemeSelectionCanvasSize(aspect: DevThemeCropAspect) {
  if (aspect.ratio >= 1) {
    return {
      width: Math.round(800 * aspect.ratio),
      height: 800,
    };
  }
  return {
    width: 512,
    height: Math.round(512 / aspect.ratio),
  };
}

export function getDevThemeContainedImageRect(stage: DevThemeCropRect, image: DevThemeCropRect) {
  if (!isUsableRect(stage) || !isUsableRect(image)) {
    return { left: 0, top: 0, width: stage.width, height: stage.height };
  }
  const scale = Math.min(stage.width / image.width, stage.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  return {
    left: Math.round((stage.width - width) / 2),
    top: Math.round((stage.height - height) / 2),
    width: Math.round(width),
    height: Math.round(height),
  };
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(value, max));
}

export function getDevThemeCropFrameSize(aspect: DevThemeCropAspect, stage: DevThemeCropRect, scale: number) {
  const safeScale = clamp(scale, 0.2, 1);
  const stageRatio = stage.width / stage.height;
  let width: number;
  let height: number;

  if (aspect.ratio >= stageRatio) {
    width = stage.width * safeScale;
    height = width / aspect.ratio;
  } else {
    height = stage.height * safeScale;
    width = height * aspect.ratio;
  }

  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
}

export function getDevThemeCropFrameRect(aspect: DevThemeCropAspect, stage: DevThemeCropRect, state: DevThemeCropFrameState) {
  const frame = getDevThemeCropFrameSize(aspect, stage, state.scale);
  const maxLeft = Math.max(0, stage.width - frame.width);
  const maxTop = Math.max(0, stage.height - frame.height);
  return {
    left: Math.round(clamp(state.centerX - frame.width / 2, 0, maxLeft)),
    top: Math.round(clamp(state.centerY - frame.height / 2, 0, maxTop)),
    width: frame.width,
    height: frame.height,
  };
}
