const ALLOWED_KEYS = new Set([
  'Tab',
  'Shift',
  'Escape',
  'Enter',
  ' ',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

type InputLike = {
  showPicker?: () => void;
};

type InteractionEventLike = {
  currentTarget: HTMLInputElement & InputLike;
};

type KeyEventLike = InteractionEventLike & {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  preventDefault: () => void;
};

type PreventableEventLike = {
  preventDefault: () => void;
};

export function openDatePicker(event: InteractionEventLike): void {
  event.currentTarget.showPicker?.();
}

export function preventManualDateTyping(event: KeyEventLike): void {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    event.preventDefault();
    return;
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    event.currentTarget.showPicker?.();
    return;
  }

  if (!ALLOWED_KEYS.has(event.key)) {
    event.preventDefault();
  }
}

export function preventManualDatePasteOrDrop(event: PreventableEventLike): void {
  event.preventDefault();
}
