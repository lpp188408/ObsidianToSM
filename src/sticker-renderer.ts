import { Marked, type Token, type Tokens } from "marked";

export function renderMarkdownToStickerHtml(markdown: string): string {
  const marked = new Marked({ async: false, gfm: true });
  return `<article class="obsidian-to-sm-sticker-content">${marked.parse(markdown) as string}</article>`;
}

export function markdownToStickerPlainText(markdown: string): string {
  const normalized = markdown
    .replace(/!\[\[[^\]]+\]\]/g, "")
    .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1");
  const tokens = new Marked({ async: false, gfm: true }).lexer(normalized);
  return tokens.map(tokenText).filter(Boolean).join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

function tokenText(token: Token): string {
  switch (token.type) {
    case "heading":
    case "paragraph":
    case "text":
      return inlineText((token as Tokens.Heading | Tokens.Paragraph | Tokens.Text).tokens ?? []);
    case "list":
      return (token as Tokens.List).items.map((item) => inlineText(item.tokens)).join("\n");
    case "blockquote":
      return (token as Tokens.Blockquote).tokens.map(tokenText).filter(Boolean).join("\n");
    case "code":
      return (token as Tokens.Code).text;
    case "table": {
      const table = token as Tokens.Table;
      return [table.header, ...table.rows].map((row) => row.map((cell) => inlineText(cell.tokens)).join("\t")).join("\n");
    }
    default:
      return "tokens" in token && Array.isArray(token.tokens) ? inlineText(token.tokens as Token[]) : "";
  }
}

function inlineText(tokens: readonly Token[]): string {
  return tokens.map((token) => {
    if (token.type === "br") return "\n";
    if (token.type === "image") return (token as Tokens.Image).text;
    if ("tokens" in token && Array.isArray(token.tokens)) return inlineText(token.tokens as Token[]);
    return "text" in token && typeof token.text === "string" ? token.text : "";
  }).join("").trim();
}
