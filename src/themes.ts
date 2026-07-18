export interface WechatTheme {
  id: string;
  name: string;
  accent: string;
  body: string;
  heading: string;
  quoteBackground: string;
  codeBackground: string;
}

export const THEMES: readonly WechatTheme[] = [
  { id: "minimal-mono", name: "简约黑白", accent: "#222222", body: "#222222", heading: "#111111", quoteBackground: "#f5f5f5", codeBackground: "#f6f6f6" },
  { id: "tech-blue", name: "科技蓝", accent: "#1769aa", body: "#1f2937", heading: "#0f3d66", quoteBackground: "#edf6ff", codeBackground: "#f4f8fc" },
  { id: "business-green", name: "商务绿", accent: "#2f8f6f", body: "#202124", heading: "#1e5e49", quoteBackground: "#f2faf6", codeBackground: "#f4f8f6" },
  { id: "ink", name: "人文墨", accent: "#775548", body: "#312c29", heading: "#2a211d", quoteBackground: "#f7f3ef", codeBackground: "#f5f1ed" },
  { id: "editorial-red", name: "杂志红", accent: "#b42318", body: "#2d2626", heading: "#8f1d16", quoteBackground: "#fff3f1", codeBackground: "#fff7f5" },
  { id: "warm-orange", name: "暖橙生活", accent: "#bc6c25", body: "#3e3025", heading: "#8a4d17", quoteBackground: "#fff6ed", codeBackground: "#fff9f2" }
];

export function getTheme(id: string): WechatTheme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}
