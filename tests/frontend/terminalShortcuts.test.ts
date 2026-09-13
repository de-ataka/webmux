import { describe, expect, it } from 'vitest';
import { isCopyShortcutKey, isTranscriptToggleKey } from '@frontend/utils/terminalShortcuts';

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

function copyKeyEvent(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    type: 'keydown',
    key: 'c',
    ctrlKey: true,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ...overrides,
  } as KeyboardEvent;
}

describe('isCopyShortcutKey', () => {
  it('matches Ctrl+C on the initial keydown', () => {
    expect(isCopyShortcutKey(copyKeyEvent())).toBe(true);
  });

  it('is case-insensitive on the key (e.g. Caps Lock)', () => {
    expect(isCopyShortcutKey(copyKeyEvent({ key: 'C' }))).toBe(true);
  });

  it('does not match keyup, other keys, or additional modifiers', () => {
    expect(isCopyShortcutKey(copyKeyEvent({ type: 'keyup' }))).toBe(false);
    expect(isCopyShortcutKey(copyKeyEvent({ key: 'v' }))).toBe(false);
    expect(isCopyShortcutKey(copyKeyEvent({ altKey: true }))).toBe(false);
    expect(isCopyShortcutKey(copyKeyEvent({ metaKey: true }))).toBe(false);
    expect(isCopyShortcutKey(copyKeyEvent({ shiftKey: true }))).toBe(false);
  });

  it('does not match without Ctrl (e.g. Cmd+C on macOS)', () => {
    expect(isCopyShortcutKey(copyKeyEvent({ ctrlKey: false, metaKey: true }))).toBe(false);
  });
});
