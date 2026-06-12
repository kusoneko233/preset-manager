export type TextPromptOptions = {
  title?: string;
  message?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  multiline?: boolean;
  rows?: number;
};

type TextPromptRequest = {
  id: number;
  options: Required<TextPromptOptions>;
  resolve: (value: string | null) => void;
};

let nextRequestId = 1;

const textPromptStore = reactive({
  current: null as TextPromptRequest | null,

  get visible() {
    return Boolean(this.current);
  },

  get options() {
    return this.current?.options ?? null;
  },

  get requestId() {
    return this.current?.id ?? 0;
  },

  prompt(options: string | TextPromptOptions): Promise<string | null> {
    const normalized = normalizeTextPromptOptions(options);
    if (this.current) {
      this.current.resolve(null);
    }

    return new Promise(resolve => {
      this.current = {
        id: nextRequestId++,
        options: normalized,
        resolve,
      };
    });
  },

  submit(value: string) {
    const request = this.current;
    if (!request) return;
    this.current = null;
    request.resolve(value);
  },

  cancel() {
    const request = this.current;
    if (!request) return;
    this.current = null;
    request.resolve(null);
  },
});

function normalizeTextPromptOptions(options: string | TextPromptOptions): TextPromptRequest['options'] {
  if (typeof options === 'string') {
    return {
      title: options,
      message: '',
      label: options,
      placeholder: '',
      defaultValue: '',
      confirmLabel: '确认',
      cancelLabel: '取消',
      multiline: false,
      rows: 4,
    };
  }

  const title = options.title?.trim() || options.label?.trim() || '输入内容';
  return {
    title,
    message: options.message ?? '',
    label: options.label?.trim() || title,
    placeholder: options.placeholder ?? '',
    defaultValue: options.defaultValue ?? '',
    confirmLabel: options.confirmLabel?.trim() || '确认',
    cancelLabel: options.cancelLabel?.trim() || '取消',
    multiline: Boolean(options.multiline),
    rows: Math.max(2, Math.min(options.rows ?? 4, 12)),
  };
}

export function useTextPromptStore() {
  return textPromptStore;
}
