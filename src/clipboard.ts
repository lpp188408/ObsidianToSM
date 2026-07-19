export interface ClipboardPayload {
  [type: string]: Blob;
  "text/html": Blob;
  "text/plain": Blob;
}

export interface ImageClipboardPayload {
  [type: string]: Blob;
  "image/png": Blob;
}

export function createClipboardPayload(html: string, plainText: string): ClipboardPayload {
  return {
    "text/html": new Blob([html], { type: "text/html" }),
    "text/plain": new Blob([plainText], { type: "text/plain" })
  };
}

export function createImageClipboardPayload(image: Blob): ImageClipboardPayload {
  return { "image/png": image };
}

export async function copyHtmlToClipboard(html: string, plainText: string): Promise<void> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    await navigator.clipboard.writeText(plainText);
    return;
  }

  await navigator.clipboard.write([new ClipboardItem(createClipboardPayload(html, plainText))]);
}

export async function copyPngToClipboard(dataUrl: string): Promise<void> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("当前 Obsidian 版本不支持复制图片，请使用导出功能");
  }

  const response = await fetch(dataUrl);
  const image = await response.blob();
  if (image.type !== "image/png") throw new Error("贴图生成失败，未得到 PNG 图片");
  await navigator.clipboard.write([new ClipboardItem(createImageClipboardPayload(image))]);
}
