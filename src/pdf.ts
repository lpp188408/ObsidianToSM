function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function printDocument(title: string, content: string, styles: string): string {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>@page{margin:14mm}body{margin:0;background:#fff;color:#111;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif}${styles}</style></head><body>${content}<script>window.addEventListener('load',()=>setTimeout(()=>{window.focus();window.print()},200))</script></body></html>`;
}

export function buildArticlePdfDocument(title: string, html: string): string {
  return printDocument(title, html, ".obsidian-to-sm{max-width:100%}.obsidian-to-sm img{max-width:100%;height:auto}@media print{.obsidian-to-sm{break-inside:auto}} ");
}

export function buildStickerPdfDocument(title: string, dataUrls: string[]): string {
  const pages = dataUrls.map((url, index) => `<section class="page"><img src="${url}" alt="${escapeHtml(`${title} 第 ${index + 1} 页`)}"></section>`).join("");
  return printDocument(title, pages, ".page{break-after:page;page-break-after:always}.page:last-child{break-after:auto;page-break-after:auto}.page img{display:block;width:100%;height:auto}");
}

export function openPdfPrintWindow(): Window {
  const printWindow = window.open("", "_blank");
  if (!printWindow) throw new Error("无法打开 PDF 导出窗口，请检查是否阻止了弹窗");
  return printWindow;
}

export function writePdfPrintDocument(printWindow: Window, documentHtml: string): void {
  printWindow.document.open();
  printWindow.document.write(documentHtml);
  printWindow.document.close();
}
