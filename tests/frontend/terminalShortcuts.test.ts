import { describe, expect, it } from 'vitest';
import { isTranscriptToggleKey } from '@frontend/utils/terminalShortcuts';

function keyEvent(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    type: 'keydown',
    code: 'KeyL',
    ctrlKey: true,
    shiftKey: true,
    altKey: false,
    metaKey: false,
    repeat: false,
    ...overrides,
  } as KeyboardEvent;
}

describe('isTranscriptToggleKey', () => {
  it('matches Ctrl+Shift+L on the initial keydown', () => {
    expect(isTranscriptToggleKey(keyEvent())).toBe(true);
  });

  it('does not match repeats, keyup, or additional modifiers', () => {
    expect(isTranscriptToggleKey(keyEvent({ repeat: true }))).toBe(false);
    expect(isTranscriptToggleKey(keyEvent({ type: 'keyup' }))).toBe(false);
    expect(isTranscriptToggleKey(keyEvent({ altKey: true }))).toBe(false);
    expect(isTranscriptToggleKey(keyEvent({ metaKey: true }))).toBe(false);
  });
});
