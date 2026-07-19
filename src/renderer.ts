import hljs from "highlight.js";
import { Marked, type Tokens } from "marked";
import { getLayout, type LayoutStyles } from "./layouts";
import { getTheme } from "./themes";

export interface RenderOptions {
  customCss: string;
  enableLineNumbers: boolean;
  themeId?: string;
  layoutId?: string;
}

export function renderMarkdownToWechatHtml(markdown: string, options: RenderOptions): string {
  const theme = getTheme(options.themeId ?? "business-green");
  const layout = getLayout(options.layoutId ?? "none");
  const articleStyles = layout.styles(theme);
  const marked = new Marked({ async: false, gfm: true });

  marked.use({
    renderer: {
      list(token: Tokens.List): string {
        const firstNumber = typeof token.start === "number" ? token.start : 1;
        return token.items.map((item, index) => {
          const marker = token.ordered ? `${firstNumber + index}.` : "•";
          const content = this.parser.parse(item.tokens, item.loose);
          return `<section class="obsidian-to-sm-list-item" style="${listItemStyle}"><span style="${listMarkerStyle}">${marker}</span>${content}</section>`;
        }).join("");
      },
      code(token: Tokens.Code): string {
        const language = token.lang && hljs.getLanguage(token.lang) ? token.lang : "plaintext";
        const highlighted = hljs.highlight(token.text, { language }).value;
        const body = options.enableLineNumbers ? addLineNumbers(highlighted) : highlighted;
        return `<pre style="${articleStyles.pre}"><code class="hljs language-${escapeHtml(language)}" style="${articleStyles.code}">${body}</code></pre>`;
      }
    }
  });

  const article = marked.parse(markdown) as string;
  return `<section class="obsidian-to-sm" style="${articleStyles.section}">${inlineWechatStyles(article, articleStyles)}</section><style>${baseCss(articleStyles)}${options.customCss}</style>`;
}

const listItemStyle = "display:block;margin:.2em 0;padding-left:1.35em;text-indent:-1.35em;";
const listMarkerStyle = "display:inline-block;width:1.35em;text-align:center;text-indent:0;";

function addLineNumbers(highlighted: string): string {
  const lines = highlighted.split("\n");
  const normalized = lines.at(-1) === "" ? lines.slice(0, -1) : lines;
  return normalized
    .map(
      (line, index) =>
        `<span class="code-line" data-line="${index + 1}" style="${codeLineStyle}"><span style="${lineNumberStyle}">${index + 1}</span>${line || " "}</span>`
    )
    .join("\n");
}

function inlineWechatStyles(html: string, styles: LayoutStyles): string {
  const plainTags: ReadonlyArray<[string, keyof LayoutStyles]> = [
    ["h1", "h1"],
    ["h2", "h2"],
    ["h3", "h3"],
    ["p", "p"],
    ["blockquote", "blockquote"],
    ["ul", "ul"],
    ["ol", "ol"],
    ["li", "li"],
    ["strong", "strong"],
    ["em", "em"],
    ["hr", "hr"],
    ["code", "inlineCode"],
    ["table", "table"],
    ["th", "th"],
    ["td", "td"]
  ];
  let output = html;
  for (const [tag, key] of plainTags) {
    output = output.replaceAll(`<${tag}>`, `<${tag} style="${styles[key]}">`);
  }
  return output
    .replaceAll("<a ", `<a style="${styles.a}" `)
    .replaceAll("<img ", `<img style="${styles.img}" `);
}

const codeLineStyle = "display:block;position:relative;min-height:1.5em;";
const lineNumberStyle = "display:inline-block;width:2em;margin-right:1em;text-align:right;color:#8a8f98;user-select:none;";

function baseCss(styles: LayoutStyles): string {
  return `
.obsidian-to-sm{${styles.section}}
.obsidian-to-sm h1{${styles.h1}}
.obsidian-to-sm h2{${styles.h2}}
.obsidian-to-sm h3{${styles.h3}}
.obsidian-to-sm p{${styles.p}}
.obsidian-to-sm blockquote{${styles.blockquote}}
.obsidian-to-sm ul{${styles.ul}}
.obsidian-to-sm ol{${styles.ol}}
.obsidian-to-sm li{${styles.li}}
.obsidian-to-sm strong{${styles.strong}}
.obsidian-to-sm em{${styles.em}}
.obsidian-to-sm a{${styles.a}}
.obsidian-to-sm img{${styles.img}}
.obsidian-to-sm hr{${styles.hr}}
.obsidian-to-sm code{${styles.inlineCode}}
.obsidian-to-sm pre{${styles.pre}}
.obsidian-to-sm pre code{${styles.code}}
.obsidian-to-sm table{${styles.table}}
.obsidian-to-sm th{${styles.th}}
.obsidian-to-sm td{${styles.td}}
.obsidian-to-sm .code-line{display:block;min-height:1.5em;}
`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
