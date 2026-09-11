type TranscriptToggleEvent = Pick<KeyboardEvent, 'altKey' | 'code' | 'ctrlKey' | 'metaKey' | 'repeat' | 'shiftKey' | 'type'>;

export function isTranscriptToggleKey(event: TranscriptToggleEvent): boolean {
  return event.type === 'keydown' && event.code === 'KeyL' && event.ctrlKey && event.shiftKey &&
    !event.altKey && !event.metaKey && !event.repeat;
}

type CopyShortcutEvent = Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey' | 'type'>;

// Ctrl+C is the pty's SIGINT byte, but when the user has a selection they
// almost always mean "copy" (the convention most terminal apps follow) —
// without this, selecting output with the mouse and pressing Ctrl+C has no
// way to reach the clipboard.
export function isCopyShortcutKey(event: CopyShortcutEvent): boolean {
  return event.type === 'keydown' && event.ctrlKey && event.key.toLowerCase() === 'c' &&
    !event.altKey && !event.metaKey && !event.shiftKey;
}
