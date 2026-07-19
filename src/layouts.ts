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
    section: `font-family:Optima,"PingFang SC","Microsoft YaHei",serif;font-size:16px;line-height:1.75;color:${theme.body};`,
    h1: `font-size:24px;line-height:1.4;text-align:center;margin:1.2em 0;font-weight:700;color:${theme.heading};`,
    h2: `font-size:20px;line-height:1.5;border-bottom:2px solid ${theme.accent};padding-bottom:4px;margin:1.6em 0 .8em;font-weight:700;color:${theme.heading};`,
    h3: `font-size:18px;line-height:1.5;margin:1.4em 0 .7em;font-weight:700;color:${theme.heading};`,
    p: `margin:1em 0;color:${theme.body};`,
    blockquote: `border-left:4px solid ${theme.accent};background:${theme.quoteBackground};margin:1em 0;padding:.6em 1em;color:${theme.body};`,
    ul: "margin:1em 0;padding-left:1.5em;",
    ol: "margin:1em 0;padding-left:1.5em;",
    li: `margin:.3em 0;color:${theme.body};`,
    strong: `font-weight:700;color:${theme.heading};`,
    em: `font-style:italic;color:${theme.body};`,
    a: `color:${theme.accent};text-decoration:none;`,
    img: "display:block;max-width:100%;height:auto;margin:1.2em auto;",
    hr: `margin:2em 0;border:0;border-top:1px solid ${theme.accent};`,
    inlineCode: `padding:.12em .3em;background:${theme.codeBackground};color:${theme.heading};font-family:"SFMono-Regular",Consolas,monospace;font-size:.9em;`,
    pre: `margin:1.2em 0;padding:12px;overflow:auto;background:${theme.codeBackground};border-radius:6px;`,
    code: `font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace;font-size:14px;color:${theme.body};`,
    table: "width:100%;margin:1.2em 0;border-collapse:collapse;font-size:.95em;",
    th: `padding:.6em .7em;border:1px solid ${theme.accent};background:${theme.quoteBackground};color:${theme.heading};text-align:left;font-weight:700;`,
    td: `padding:.6em .7em;border:1px solid ${theme.accent};color:${theme.body};vertical-align:top;`
  };
}

export const LAYOUTS: readonly WechatLayout[] = [
  { id: "none", name: "不套用模板", styles: baseStyles },
  {
    id: "editorial-magazine",
    name: "杂志叙事",
    styles: (theme) => ({
      ...baseStyles(theme),
      section: `font-family:Optima,"Songti SC","PingFang SC",serif;font-size:16px;line-height:1.9;color:${theme.body};`,
      h1: `font-family:Georgia,"Songti SC",serif;font-size:26px;line-height:1.35;text-align:center;margin:1.5em 0 .9em;padding-bottom:.65em;border-bottom:3px solid ${theme.accent};font-weight:700;color:${theme.heading};`,
      h2: `font-family:Georgia,"Songti SC",serif;font-size:21px;line-height:1.5;text-align:center;margin:2em 0 1em;padding-bottom:.5em;border-bottom:1px solid ${theme.accent};font-weight:700;color:${theme.heading};`,
      h3: `font-family:Georgia,"Songti SC",serif;font-size:18px;margin:1.7em 0 .8em;padding-left:.7em;border-left:3px solid ${theme.accent};font-weight:700;color:${theme.heading};`,
      blockquote: `margin:1.4em 0;padding:1em 1.2em;border:0;background:${theme.quoteBackground};color:${theme.body};font-family:Georgia,"Songti SC",serif;`,
      hr: `width:3em;margin:2em auto;border:0;border-top:3px solid ${theme.accent};`
    })
  },
  {
    id: "modern-business",
    name: "现代商务",
    styles: (theme) => ({
      ...baseStyles(theme),
      section: `font-family:Optima,"PingFang SC","Microsoft YaHei",sans-serif;font-size:16px;line-height:1.8;color:${theme.body};`,
      h1: `font-size:26px;line-height:1.35;text-align:left;margin:1.3em 0 .8em;padding-bottom:.55em;border-bottom:3px solid ${theme.accent};font-weight:750;color:${theme.heading};`,
      h2: `font-size:20px;line-height:1.5;margin:1.8em 0 .8em;padding:.35em .7em;border-left:5px solid ${theme.accent};background:${theme.quoteBackground};font-weight:700;color:${theme.heading};`,
      h3: `font-size:18px;margin:1.5em 0 .7em;padding-bottom:.35em;border-bottom:1px solid ${theme.accent};font-weight:700;color:${theme.heading};`,
      blockquote: `margin:1.2em 0;padding:.85em 1em;border:1px solid ${theme.accent};border-left:5px solid ${theme.accent};background:${theme.quoteBackground};color:${theme.body};`,
      th: `padding:.65em .75em;border:1px solid ${theme.accent};background:${theme.accent};color:#ffffff;text-align:left;font-weight:700;`
    })
  },
  {
    id: "reading-notes",
    name: "阅读手记",
    styles: (theme) => ({
      ...baseStyles(theme),
      section: `font-family:Georgia,"Songti SC","PingFang SC",serif;font-size:16px;line-height:1.95;color:${theme.body};background:#fffdf8;padding:.35em .8em;`,
      h1: `font-family:Georgia,"Songti SC",serif;font-size:25px;line-height:1.4;text-align:left;margin:1.4em 0 1em;font-weight:700;color:${theme.heading};`,
      h2: `font-family:Georgia,"Songti SC",serif;font-size:21px;line-height:1.5;margin:1.9em 0 .9em;padding-left:.75em;border-left:5px solid ${theme.accent};font-weight:700;color:${theme.heading};`,
      h3: `font-family:Georgia,"Songti SC",serif;font-size:18px;margin:1.6em 0 .75em;color:${theme.heading};`,
      blockquote: `margin:1.4em 0;padding:1.2em;border:0;background:${theme.quoteBackground};color:${theme.body};font-family:Georgia,"Songti SC",serif;`,
      li: `margin:.4em 0;padding-left:.15em;color:${theme.body};`
    })
  },
  {
    id: "technical-blueprint",
    name: "技术蓝图",
    styles: (theme) => ({
      ...baseStyles(theme),
      section: `font-family:Optima,"PingFang SC","Microsoft YaHei",sans-serif;font-size:15.5px;line-height:1.8;color:${theme.body};`,
      h1: `font-size:25px;line-height:1.35;text-align:left;margin:1.3em 0 .8em;padding-bottom:.55em;border-bottom:1px solid ${theme.accent};font-weight:750;color:${theme.heading};`,
      h2: `font-size:20px;line-height:1.5;margin:1.8em 0 .8em;padding-left:.65em;border-left:4px solid ${theme.accent};font-weight:700;color:${theme.heading};`,
      h3: `font-size:17px;margin:1.5em 0 .7em;color:${theme.accent};font-weight:700;`,
      blockquote: `margin:1.2em 0;padding:.8em 1em;border:0;border-left:4px solid ${theme.accent};background:${theme.quoteBackground};color:${theme.body};`,
      inlineCode: `padding:.15em .35em;background:${theme.codeBackground};color:${theme.accent};font-family:"SFMono-Regular",Consolas,monospace;font-size:.9em;`,
      pre: "margin:1.3em 0;padding:14px;overflow:auto;background:#101820;border-radius:4px;color:#d7e2ea;",
      code: `font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace;font-size:13px;color:#d7e2ea;`
    })
  }
];

export function getLayout(id: string): WechatLayout {
  return LAYOUTS.find((layout) => layout.id === id) ?? LAYOUTS[0];
}
