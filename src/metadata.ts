export interface WechatMetadata {
  title: string;
  author: string;
  digest: string;
  cover: string;
  needOpenComment: boolean;
  onlyFansCanComment: boolean;
}

export interface MetadataFallbacks {
  author: string;
  title: string;
}

export function extractWechatMetadata(markdown: string, fallbacks: MetadataFallbacks): {
  body: string;
  metadata: WechatMetadata;
} {
  const { attributes, body } = splitFrontmatter(markdown);
  const titleFromHeading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();

  return {
    body,
    metadata: {
      title: readString(attributes, ["title", "标题"]) || titleFromHeading || fallbacks.title,
      author: readString(attributes, ["author", "作者"]) || fallbacks.author,
      digest: readString(attributes, ["digest", "摘要"]),
      cover: extractEmbedPath(readString(attributes, ["cover", "封面"])),
      needOpenComment: readBoolean(attributes, ["need_open_comment", "打开评论"], true),
      onlyFansCanComment: readBoolean(attributes, ["only_fans_can_comment", "仅粉丝可评论"], false)
    }
  };
}

function splitFrontmatter(markdown: string): { attributes: Record<string, string>; body: string } {
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
  if (!match) return { attributes: {}, body: markdown };

  const attributes: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator <= 0) continue;
    attributes[line.slice(0, separator).trim()] = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return { attributes, body: markdown.slice(match[0].length) };
}

function readString(attributes: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    if (attributes[key]) return attributes[key];
  }
  return "";
}

function readBoolean(attributes: Record<string, string>, keys: string[], fallback: boolean): boolean {
  const value = readString(attributes, keys).toLowerCase();
  if (["true", "yes", "1"].includes(value)) return true;
  if (["false", "no", "0"].includes(value)) return false;
  return fallback;
}

function extractEmbedPath(value: string): string {
  const embed = value.match(/^!\[\[([^|\]]+)/);
  return embed?.[1]?.trim() ?? value;
}
