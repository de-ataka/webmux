import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyToClipboard } from '@frontend/utils/clipboard';

describe('copyToClipboard', () => {
  const originalClipboard = navigator.clipboard;
  const originalExecCommand = document.execCommand;

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, configurable: true });
    document.execCommand = originalExecCommand;
    vi.restoreAllMocks();
  });

  it('uses the async Clipboard API when available', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    copyToClipboard('hello');

    expect(writeText).toHaveBeenCalledWith('hello');
  });

  // navigator.clipboard is undefined outside secure contexts (e.g. WebMux's
  // trusted mode served over plain HTTP on a LAN) — copy must still work.
  it('falls back to execCommand when navigator.clipboard is unavailable', () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand;

    copyToClipboard('hello');

    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('falls back to execCommand when the Clipboard API rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand;

    copyToClipboard('hello');

    await vi.waitFor(() => expect(execCommand).toHaveBeenCalledWith('copy'));
  });

  it('does not throw when both the Clipboard API and execCommand are unavailable', () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    document.execCommand = vi.fn(() => {
      throw new Error('not supported');
    });

    expect(() => copyToClipboard('hello')).not.toThrow();
  });
});
