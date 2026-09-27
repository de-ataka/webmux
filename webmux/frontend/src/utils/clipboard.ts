// The async Clipboard API (navigator.clipboard) only exists in secure
// contexts (HTTPS or localhost). WebMux's "trusted mode" is documented for
// use on plain HTTP over a LAN, where navigator.clipboard is undefined —
// without this fallback, copying silently does nothing there.
export function copyToClipboard(text: string): void {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => copyViaExecCommand(text));
    return;
  }
  copyViaExecCommand(text);
}

function copyViaExecCommand(text: string): void {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '-1000px';
    textarea.style.left = '-1000px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  } catch {
    // Best effort only — nothing more we can do if both paths fail.
  }
}
