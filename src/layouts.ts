import type { WechatTheme } from "./themes";

export interface LayoutStyles {
  section: string;
  h1: string;
  h2: string;
  h3: string;
  p: string;
  blockquote: string;
  ul: string;
  ol: string;
  li: string;
  strong: string;
  em: string;
  a: string;
  img: string;
  hr: string;
  inlineCode: string;
  pre: string;
  code: string;
  table: string;
  th: string;
  td: string;
}

export interface WechatLayout {
  id: string;
  name: string;
  styles(theme: WechatTheme): LayoutStyles;
}

function baseStyles(theme: WechatTheme): LayoutStyles {
  return {
    section: `font-family:Optima,'PingFang SC','Microsoft YaHei',serif;font-size:16px;line-height:1.75;color:${theme.body};`,
    h1: `font-size:24px;line-height:1.4;text-align:center;margin:.9em 0 .65em;font-weight:700;color:${theme.heading};`,
    h2: `font-size:20px;line-height:1.5;border-bottom:2px solid ${theme.accent};padding-bottom:3px;margin:1.25em 0 .55em;font-weight:700;color:${theme.heading};`,
    h3: `font-size:18px;line-height:1.5;margin:1.05em 0 .45em;font-weight:700;color:${theme.heading};`,
    p: `margin:.65em 0;color:${theme.body};`,
    blockquote: `border-left:4px solid ${theme.accent};background:${theme.quoteBackground};margin:.75em 0;padding:.45em .75em;color:${theme.body};`,
    ul: "margin:.65em 0;padding-left:1.35em;",
    ol: "margin:.65em 0;padding-left:1.35em;",
    li: `margin:.15em 0;color:${theme.body};`,
    strong: `font-weight:700;color:${theme.heading};`,
    em: `font-style:italic;color:${theme.body};`,
    a: `color:${theme.accent};text-decoration:none;`,
    img: "display:block;max-width:100%;height:auto;margin:.9em auto;",
    hr: `margin:1.4em 0;border:0;border-top:1px solid ${theme.accent};`,
    inlineCode: `padding:.12em .3em;background:${theme.codeBackground};color:${theme.heading};font-family:'SFMono-Regular',Consolas,monospace;font-size:.9em;`,
    pre: `margin:.8em 0;padding:10px;overflow:auto;background:${theme.codeBackground};border-radius:6px;`,
    code: `font-family:'SFMono-Regular',Consolas,'Liberation Mono',monospace;font-size:14px;color:${theme.body};`,
    table: "width:100%;margin:.8em 0;border-collapse:collapse;font-size:.92em;line-height:1.55;",
    th: `padding:.42em .55em;border:1px solid ${theme.accent};background:${theme.quoteBackground};color:${theme.heading};text-align:left;font-weight:700;`,
    td: `padding:.42em .55em;border:1px solid ${theme.accent};color:${theme.body};vertical-align:top;`
  };
}

export const LAYOUTS: readonly WechatLayout[] = [
  { id: "none", name: "不套用模板", styles: baseStyles },
  {
    id: "editorial-magazine",
    name: "杂志叙事",
    styles: (theme) => ({
      ...baseStyles(theme),
      section: `font-family:Optima,'Songti SC','PingFang SC',serif;font-size:16px;line-height:1.78;color:${theme.body};`,
      h1: `font-family:Georgia,'Songti SC',serif;font-size:25px;line-height:1.35;text-align:center;margin:1em 0 .65em;padding-bottom:.45em;border-bottom:3px solid ${theme.accent};font-weight:700;color:${theme.heading};`,
      h2: `font-family:Georgia,'Songti SC',serif;font-size:20px;line-height:1.5;text-align:center;margin:1.35em 0 .6em;padding-bottom:.35em;border-bottom:1px solid ${theme.accent};font-weight:700;color:${theme.heading};`,
      h3: `font-family:Georgia,'Songti SC',serif;font-size:18px;margin:1.15em 0 .5em;padding-left:.6em;border-left:3px solid ${theme.accent};font-weight:700;color:${theme.heading};`,
      blockquote: `margin:.8em 0;padding:.65em .85em;border:0;background:${theme.quoteBackground};color:${theme.body};font-family:Georgia,'Songti SC',serif;`,
      hr: `width:3em;margin:1.4em auto;border:0;border-top:3px solid ${theme.accent};`
    })
  },
  {
    id: "modern-business",
    name: "现代商务",
    styles: (theme) => ({
      ...baseStyles(theme),
      section: `font-family:Optima,'PingFang SC','Microsoft YaHei',sans-serif;font-size:16px;line-height:1.75;color:${theme.body};`,
      h1: `font-size:25px;line-height:1.35;text-align:left;margin:.95em 0 .6em;padding-bottom:.4em;border-bottom:3px solid ${theme.accent};font-weight:750;color:${theme.heading};`,
      h2: `font-size:20px;line-height:1.5;margin:1.2em 0 .55em;padding:.25em .6em;border-left:5px solid ${theme.accent};background:${theme.quoteBackground};font-weight:700;color:${theme.heading};`,
      h3: `font-size:18px;margin:1.05em 0 .45em;padding-bottom:.25em;border-bottom:1px solid ${theme.accent};font-weight:700;color:${theme.heading};`,
      blockquote: `margin:.75em 0;padding:.55em .75em;border:1px solid ${theme.accent};border-left:5px solid ${theme.accent};background:${theme.quoteBackground};color:${theme.body};`,
      th: `padding:.42em .55em;border:1px solid ${theme.accent};background:${theme.accent};color:#ffffff;text-align:left;font-weight:700;`
    })
  },
  {
    id: "reading-notes",
    name: "阅读手记",
    styles: (theme) => ({
      ...baseStyles(theme),
      section: `font-family:Georgia,'Songti SC','PingFang SC',serif;font-size:16px;line-height:1.78;color:${theme.body};background:#fffdf8;padding:.2em .45em;`,
      h1: `font-family:Georgia,'Songti SC',serif;font-size:24px;line-height:1.4;text-align:left;margin:.95em 0 .65em;font-weight:700;color:${theme.heading};`,
      h2: `font-family:Georgia,'Songti SC',serif;font-size:20px;line-height:1.5;margin:1.25em 0 .55em;padding-left:.6em;border-left:5px solid ${theme.accent};font-weight:700;color:${theme.heading};`,
      h3: `font-family:Georgia,'Songti SC',serif;font-size:18px;margin:1.05em 0 .45em;color:${theme.heading};`,
      blockquote: `margin:.8em 0;padding:.7em .8em;border:0;background:${theme.quoteBackground};color:${theme.body};font-family:Georgia,'Songti SC',serif;`,
      li: `margin:.15em 0;padding-left:.1em;color:${theme.body};`
    })
  },
  {
    id: "technical-blueprint",
    name: "技术蓝图",
    styles: (theme) => ({
      ...baseStyles(theme),
      section: `font-family:Optima,'PingFang SC','Microsoft YaHei',sans-serif;font-size:16px;line-height:1.72;color:${theme.body};`,
      h1: `font-size:24px;line-height:1.35;text-align:left;margin:.95em 0 .6em;padding-bottom:.4em;border-bottom:1px solid ${theme.accent};font-weight:750;color:${theme.heading};`,
      h2: `font-size:20px;line-height:1.5;margin:1.2em 0 .55em;padding-left:.55em;border-left:4px solid ${theme.accent};font-weight:700;color:${theme.heading};`,
      h3: `font-size:17px;margin:1.05em 0 .45em;color:${theme.accent};font-weight:700;`,
      blockquote: `margin:.75em 0;padding:.55em .75em;border:0;border-left:4px solid ${theme.accent};background:${theme.quoteBackground};color:${theme.body};`,
      inlineCode: `padding:.15em .35em;background:${theme.codeBackground};color:${theme.accent};font-family:'SFMono-Regular',Consolas,monospace;font-size:.9em;`,
      pre: "margin:.8em 0;padding:10px;overflow:auto;background:#101820;border-radius:4px;color:#d7e2ea;",
      code: `font-family:'SFMono-Regular',Consolas,'Liberation Mono',monospace;font-size:13px;color:#d7e2ea;`
    })
  }
];

export function getLayout(id: string): WechatLayout {
  return LAYOUTS.find((layout) => layout.id === id) ?? LAYOUTS[0];
}
