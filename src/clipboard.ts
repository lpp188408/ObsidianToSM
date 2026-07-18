export interface ClipboardPayload {
  [type: string]: Blob;
  "text/html": Blob;
  "text/plain": Blob;
}

export function createClipboardPayload(html: string, plainText: string): ClipboardPayload {
  return {
    "text/html": new Blob([html], { type: "text/html" }),
    "text/plain": new Blob([plainText], { type: "text/plain" })
  };
}

export async function copyHtmlToClipboard(html: string, plainText: string): Promise<void> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    await navigator.clipboard.writeText(plainText);
    return;
  }

  await navigator.clipboard.write([new ClipboardItem(createClipboardPayload(html, plainText))]);
}
