export type ConfirmTone = 'normal' | 'danger';
export type ConfirmAnchor = {
  x: number;
  y: number;
  width?: number;
  height?: number;
};

export type ConfirmOptions = {
  title?: string;
  message: string;
  details?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  anchor?: ConfirmAnchor;
};

type ConfirmRequest = {
  options: Required<Omit<ConfirmOptions, 'details' | 'anchor'>> & Pick<ConfirmOptions, 'details' | 'anchor'>;
  resolve: (value: boolean) => void;
};

const confirmStore = reactive({
  current: null as ConfirmRequest | null,

  get visible() {
    return Boolean(this.current);
  },

  get options() {
    return this.current?.options ?? null;
  },

  confirm(options: string | ConfirmOptions): Promise<boolean> {
    const normalized = normalizeConfirmOptions(options);
    if (this.current) {
      this.current.resolve(false);
    }

    return new Promise(resolve => {
      this.current = { options: normalized, resolve };
    });
  },

  confirmAction() {
    const request = this.current;
    if (!request) return;
    this.current = null;
    request.resolve(true);
  },

  cancel() {
    const request = this.current;
    if (!request) return;
    this.current = null;
    request.resolve(false);
  },
});

function normalizeConfirmOptions(options: string | ConfirmOptions): ConfirmRequest['options'] {
  if (typeof options === 'string') {
    return {
      title: '确认操作',
      message: options,
      details: '',
      confirmLabel: '确认',
      cancelLabel: '取消',
      tone: 'normal',
    };
  }

  return {
    title: options.title?.trim() || '确认操作',
    message: options.message,
    details: options.details ?? '',
    confirmLabel: options.confirmLabel?.trim() || '确认',
    cancelLabel: options.cancelLabel?.trim() || '取消',
    tone: options.tone ?? 'normal',
    anchor: options.anchor,
  };
}

export function useConfirmStore() {
  return confirmStore;
}
