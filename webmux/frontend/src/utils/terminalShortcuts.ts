type TranscriptToggleEvent = Pick<KeyboardEvent, 'altKey' | 'code' | 'ctrlKey' | 'metaKey' | 'repeat' | 'shiftKey' | 'type'>;

export function isTranscriptToggleKey(event: TranscriptToggleEvent): boolean {
  return event.type === 'keydown' && event.code === 'KeyL' && event.ctrlKey && event.shiftKey &&
    !event.altKey && !event.metaKey && !event.repeat;
}
