import hljs from "highlight.js";
import { Marked, type Tokens } from "marked";

export interface RenderOptions {
  customCss: string;
  enableLineNumbers: boolean;
}

export function renderMarkdownToWechatHtml(markdown: string, options: RenderOptions): string {
  const marked = new Marked({ async: false, gfm: true });

  marked.use({
    renderer: {
      code(token: Tokens.Code): string {
        const language = token.lang && hljs.getLanguage(token.lang) ? token.lang : "plaintext";
        const highlighted = hljs.highlight(token.text, { language }).value;
        const body = options.enableLineNumbers ? addLineNumbers(highlighted) : highlighted;
        return `<pre style="${styles.pre}"><code class="hljs language-${escapeHtml(language)}" style="${styles.code}">${body}</code></pre>`;
      }
    }
  });

  const article = marked.parse(markdown) as string;
  return `<section class="obsidian-to-sm" style="${styles.section}">${inlineWechatStyles(article)}</section><style>${baseCss()}${options.customCss}</style>`;
}

function addLineNumbers(highlighted: string): string {
  const lines = highlighted.split("\n");
  const normalized = lines.at(-1) === "" ? lines.slice(0, -1) : lines;
  return normalized
    .map(
      (line, index) =>
        `<span class="code-line" data-line="${index + 1}" style="${styles.codeLine}"><span style="${styles.lineNumber}">${index + 1}</span>${line || " "}</span>`
    )
    .join("\n");
}

function inlineWechatStyles(html: string): string {
  return html
    .replaceAll("<h1>", `<h1 style="${styles.h1}">`)
    .replaceAll("<h2>", `<h2 style="${styles.h2}">`)
    .replaceAll("<h3>", `<h3 style="${styles.h3}">`)
    .replaceAll("<p>", `<p style="${styles.p}">`)
    .replaceAll("<blockquote>", `<blockquote style="${styles.blockquote}">`)
    .replaceAll("<a ", `<a style="${styles.a}" `)
    .replaceAll("<img ", `<img style="${styles.img}" `);
}

const styles = {
  section: 'font-family:Optima,"PingFang SC","Microsoft YaHei",serif;font-size:16px;line-height:1.75;color:#202124;',
  h1: "font-size:24px;text-align:center;margin:1.2em 0;font-weight:700;",
  h2: "font-size:20px;border-bottom:2px solid #2f8f6f;padding-bottom:4px;margin:1.6em 0 .8em;font-weight:700;",
  h3: "font-size:18px;margin:1.4em 0 .7em;font-weight:700;",
  p: "margin:1em 0;",
  a: "color:#2f8f6f;text-decoration:none;",
  blockquote: "border-left:4px solid #2f8f6f;background:#f5faf7;margin:1em 0;padding:.6em 1em;color:#4b5563;",
  img: "display:block;max-width:100%;height:auto;margin:1em auto;",
  pre: "background:#f6f8fa;border-radius:6px;padding:12px;overflow:auto;",
  code: 'font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace;font-size:14px;',
  codeLine: "display:block;position:relative;min-height:1.5em;",
  lineNumber: "display:inline-block;width:2em;margin-right:1em;text-align:right;color:#8a8f98;user-select:none;"
};

function baseCss(): string {
  return `
.obsidian-to-sm{font-family:Optima,"PingFang SC","Microsoft YaHei",serif;font-size:16px;line-height:1.75;color:#202124;}
.obsidian-to-sm h1{font-size:24px;text-align:center;margin:1.2em 0;}
.obsidian-to-sm h2{font-size:20px;border-bottom:2px solid #2f8f6f;padding-bottom:4px;margin:1.6em 0 .8em;}
.obsidian-to-sm h3{font-size:18px;margin:1.4em 0 .7em;}
.obsidian-to-sm p{margin:1em 0;}
.obsidian-to-sm a{color:#2f8f6f;text-decoration:none;}
.obsidian-to-sm blockquote{border-left:4px solid #2f8f6f;background:#f5faf7;margin:1em 0;padding:.6em 1em;color:#4b5563;}
.obsidian-to-sm img{display:block;max-width:100%;height:auto;margin:1em auto;}
.obsidian-to-sm pre{background:#f6f8fa;border-radius:6px;padding:12px;overflow:auto;}
.obsidian-to-sm code{font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace;font-size:14px;}
.obsidian-to-sm .code-line{display:block;position:relative;padding-left:3em;min-height:1.5em;}
.obsidian-to-sm .code-line::before{content:attr(data-line);position:absolute;left:0;width:2em;text-align:right;color:#8a8f98;}
`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
