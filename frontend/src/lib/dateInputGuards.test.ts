import { describe, expect, it, vi } from 'vitest';
import { openDatePicker, preventManualDatePasteOrDrop, preventManualDateTyping } from './dateInputGuards';

describe('dateInputGuards', () => {
  it('openDatePicker llama showPicker cuando existe', () => {
    const showPicker = vi.fn();
    openDatePicker({ currentTarget: { showPicker } as HTMLInputElement & { showPicker: () => void } });
    expect(showPicker).toHaveBeenCalledTimes(1);
  });

  it('openDatePicker no falla cuando showPicker no existe', () => {
    expect(() => openDatePicker({ currentTarget: {} as HTMLInputElement })).not.toThrow();
  });

  it('preventManualDateTyping bloquea con teclas modificadoras', () => {
    const preventDefault = vi.fn();
    preventManualDateTyping({
      currentTarget: {} as HTMLInputElement,
      key: 'v',
      ctrlKey: true,
      preventDefault,
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it('preventManualDateTyping abre picker con Enter o espacio', () => {
    const preventDefaultEnter = vi.fn();
    const showPickerEnter = vi.fn();

    preventManualDateTyping({
      currentTarget: { showPicker: showPickerEnter } as HTMLInputElement & { showPicker: () => void },
      key: 'Enter',
      preventDefault: preventDefaultEnter,
    });

    const preventDefaultSpace = vi.fn();
    const showPickerSpace = vi.fn();

    preventManualDateTyping({
      currentTarget: { showPicker: showPickerSpace } as HTMLInputElement & { showPicker: () => void },
      key: ' ',
      preventDefault: preventDefaultSpace,
    });

    expect(preventDefaultEnter).toHaveBeenCalledTimes(1);
    expect(showPickerEnter).toHaveBeenCalledTimes(1);
    expect(preventDefaultSpace).toHaveBeenCalledTimes(1);
    expect(showPickerSpace).toHaveBeenCalledTimes(1);
  });

  it('preventManualDateTyping permite navegacion y bloquea teclas de escritura', () => {
    const allowPreventDefault = vi.fn();
    preventManualDateTyping({
      currentTarget: {} as HTMLInputElement,
      key: 'Tab',
      preventDefault: allowPreventDefault,
    });

    const blockPreventDefault = vi.fn();
    preventManualDateTyping({
      currentTarget: {} as HTMLInputElement,
      key: '7',
      preventDefault: blockPreventDefault,
    });

    expect(allowPreventDefault).not.toHaveBeenCalled();
    expect(blockPreventDefault).toHaveBeenCalledTimes(1);
  });

  it('preventManualDatePasteOrDrop bloquea pegado/arrastre', () => {
    const preventDefault = vi.fn();
    preventManualDatePasteOrDrop({ preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });
});
