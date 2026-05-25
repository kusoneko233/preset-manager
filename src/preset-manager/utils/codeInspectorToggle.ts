export type AltShiftToggleState = {
  armed: boolean;
};

type AltShiftEvent = Pick<KeyboardEvent | MouseEvent, 'altKey' | 'shiftKey'> &
  Partial<Pick<KeyboardEvent, 'repeat' | 'key' | 'code'>>;

export function createAltShiftToggleState(): AltShiftToggleState {
  return { armed: false };
}

export function shouldToggleInspectorOnAltShift(event: AltShiftEvent, state: AltShiftToggleState) {
  const isChord = event.altKey && event.shiftKey;
  if (!isChord) {
    state.armed = false;
    return false;
  }

  if (event.repeat || state.armed) return false;
  state.armed = true;
  return true;
}

export function resetAltShiftToggleState(event: AltShiftEvent, state: AltShiftToggleState) {
  if (!event.altKey || !event.shiftKey) {
    state.armed = false;
  }
}
