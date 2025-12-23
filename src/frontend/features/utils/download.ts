/**
 * Sanitizes a string for safe use as a filename across major operating systems.
 *
 * - Replaces reserved characters like `/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`.
 * - Removes ASCII control characters.
 * - Trims and collapses whitespace.
 *
 * @param input - Candidate filename or display name.
 * @returns A filesystem-safe filename segment (no extension is appended).
 */
export function sanitizeFilename(input: string): string {
  const withoutControlChars = input.replace(/[\x00-\x1F\x80-\x9F]/g, '');
  const withoutReserved = withoutControlChars.replace(/[<>:"/\\|?*]/g, '_');
  const collapsedWhitespace = withoutReserved.replace(/\s+/g, ' ').trim();
  return collapsedWhitespace;
}

/**
 * Converts a data URL (e.g., `data:image/png;base64,...`) to a Blob.
 *
 * @param dataUrl - The data URL to convert.
 * @returns A Blob for the data URL, or null if the URL is malformed.
 */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = /^data:([^;]+)(;base64)?,(.*)$/.exec(dataUrl);
  if (!match) return null;

  const mimeType = match[1] ?? 'application/octet-stream';
  const isBase64 = Boolean(match[2]);
  const payload = match[3] ?? '';

  if (!isBase64) {
    // Percent-decoded (rare in this codebase), but handle for completeness.
    const text = decodeURIComponent(payload);
    return new Blob([text], { type: mimeType });
  }

  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/**
 * Triggers a browser download for a data URL.
 *
 * This is intended for "save locally" behavior in the PDF screenshot flow.
 *
 * @param dataUrl - Screenshot content as a data URL.
 * @param fileName - Desired filename (should include extension like `.png`).
 */
export function downloadDataUrlAsFile(dataUrl: string, fileName: string): void {
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) {
    // Keep behavior non-fatal; screenshot can still be added to context.
    console.warn('[downloadDataUrlAsFile] Invalid data URL, skipping download');
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';

  // Some browsers require the anchor to be attached to the DOM.
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // Revoke asynchronously to avoid canceling the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}


