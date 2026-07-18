export type AssetResolver = (path: string) => Promise<string>;

export async function resolveEmbeds(markdown: string, resolver: AssetResolver): Promise<string> {
  const pattern = /!\[\[([^|\]]+)(?:\|(\d+)(?:x(\d+))?)?\]\]/g;
  const matches = [...markdown.matchAll(pattern)];
  let result = markdown;

  for (const match of matches) {
    const [raw, path, width, height] = match;
    const src = await resolver(path);
    const attrs = [
      `src="${escapeHtml(src)}"`,
      width ? `width="${width}"` : "",
      height ? `height="${height}"` : ""
    ]
      .filter(Boolean)
      .join(" ");
    result = result.replace(raw, `<img ${attrs} />`);
  }

  return result;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
