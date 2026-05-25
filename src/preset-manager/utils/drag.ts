export type DragSession = {
  startEvent: MouseEvent;
  cursor?: string;
  onMove: (event: MouseEvent) => void;
  onEnd?: () => void;
};

export const DRAG_OVERLAY_ATTRIBUTE = 'data-preset-manager-drag-overlay';
const DRAG_OVERLAY_FAILSAFE_MS = 15000;

function isLegacyDragOverlay(element: Element, parentDoc: Document) {
  if (!(element instanceof parentDoc.defaultView!.HTMLElement)) return false;

  const style = element.style;
  return (
    element.tagName === 'DIV' &&
    style.position === 'fixed' &&
    style.inset === '0px' &&
    style.zIndex === '2147483647' &&
    style.background === 'transparent' &&
    !element.id &&
    !element.className &&
    !element.getAttribute('script_id')
  );
}

export function cleanupPresetManagerDragOverlays(parentDoc: Document) {
  parentDoc.querySelectorAll(`[${DRAG_OVERLAY_ATTRIBUTE}="true"]`).forEach(overlay => overlay.remove());
  Array.from(parentDoc.body.children).forEach(element => {
    if (isLegacyDragOverlay(element, parentDoc)) element.remove();
  });
}

export function startParentDrag(parentDoc: Document, session: DragSession) {
  const sourceDoc = ((session.startEvent.currentTarget as Node | null)?.ownerDocument ?? session.startEvent.view?.document ?? document);
  const docs = Array.from(new Set([sourceDoc, parentDoc]));
  const windows = Array.from(new Set([sourceDoc.defaultView, parentDoc.defaultView].filter(Boolean))) as Window[];
  const previousUserSelect = new Map<Document, string>();
  const previousCursor = new Map<Document, string>();
  const overlay = parentDoc.createElement('div');
  let active = true;

  cleanupPresetManagerDragOverlays(parentDoc);
  overlay.setAttribute(DRAG_OVERLAY_ATTRIBUTE, 'true');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483647',
    cursor: session.cursor ?? 'default',
    background: 'transparent',
    userSelect: 'none',
    pointerEvents: 'none',
  });

  for (const doc of docs) {
    previousUserSelect.set(doc, doc.body.style.userSelect);
    previousCursor.set(doc, doc.body.style.cursor);
    doc.body.style.userSelect = 'none';
    if (session.cursor) doc.body.style.cursor = session.cursor;
  }

  parentDoc.body.appendChild(overlay);

  const finish = () => {
    if (!active) return;
    active = false;
    parentDoc.defaultView?.clearTimeout(failsafeTimer);
    overlay.remove();
    for (const doc of docs) {
      doc.body.style.userSelect = previousUserSelect.get(doc) ?? '';
      doc.body.style.cursor = previousCursor.get(doc) ?? '';
      doc.removeEventListener('mousemove', onMove, true);
      doc.removeEventListener('mouseup', finish, true);
    }
    for (const win of windows) {
      win.removeEventListener('mouseup', finish, true);
      win.removeEventListener('blur', finish, true);
    }
    session.onEnd?.();
  };

  const failsafeTimer = parentDoc.defaultView?.setTimeout(finish, DRAG_OVERLAY_FAILSAFE_MS);

  const onMove = (event: MouseEvent) => {
    if (!active) return;
    event.preventDefault();
    if (event.buttons === 0) {
      finish();
      return;
    }
    session.onMove(event);
  };

  for (const doc of docs) {
    doc.addEventListener('mousemove', onMove, true);
    doc.addEventListener('mouseup', finish, true);
  }
  for (const win of windows) {
    win.addEventListener('mouseup', finish, true);
    win.addEventListener('blur', finish, true);
  }
}
