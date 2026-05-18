export type DragSession = {
  startEvent: MouseEvent;
  cursor?: string;
  onMove: (event: MouseEvent) => void;
  onEnd?: () => void;
};

export function startParentDrag(parentDoc: Document, session: DragSession) {
  const sourceDoc = ((session.startEvent.currentTarget as Node | null)?.ownerDocument ?? session.startEvent.view?.document ?? document);
  const docs = Array.from(new Set([sourceDoc, parentDoc]));
  const windows = Array.from(new Set([sourceDoc.defaultView, parentDoc.defaultView].filter(Boolean))) as Window[];
  const previousUserSelect = new Map<Document, string>();
  const previousCursor = new Map<Document, string>();
  const overlay = parentDoc.createElement('div');
  let active = true;

  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483647',
    cursor: session.cursor ?? 'default',
    background: 'transparent',
    userSelect: 'none',
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
