export type StickerPageMode = "single" | "multi" | "hr";
export type StickerBackgroundType = "color" | "gradient";

export interface StickerSettings {
  pageMode: StickerPageMode;
  width: number;
  pageHeight: number;
  presetRatio: string;
  fontFamily: string;
  fontSize: number;
  backgroundType: StickerBackgroundType;
  backgroundColor: string;
  backgroundGradient: string;
  padding: number;
  borderRadius: number;
}

export interface StickerBlockMetric {
  top: number;
  bottom: number;
  tag: string;
}

export interface StickerNote {
  title: string;
  html: string;
  plainText: string;
  needOpenComment: boolean;
  onlyFansCanComment: boolean;
}

export const STICKER_MAX_SINGLE_HEIGHT = 16000;
export const STICKER_MAX_WECHAT_PAGES = 20;

export const DEFAULT_STICKER_SETTINGS: StickerSettings = {
  pageMode: "single",
  width: 750,
  pageHeight: 1000,
  presetRatio: "3-4",
  fontFamily: "默认",
  fontSize: 16,
  backgroundType: "color",
  backgroundColor: "#ffffff",
  backgroundGradient: "linear-gradient(135deg, #f8fafc 0%, #e8eef7 100%)",
  padding: 40,
  borderRadius: 16
};

export function createDefaultStickerSettings(): StickerSettings {
  return { ...DEFAULT_STICKER_SETTINGS };
}

export function mergeStickerSettings(settings?: Partial<StickerSettings>): StickerSettings {
  return { ...DEFAULT_STICKER_SETTINGS, ...settings };
}

const RATIOS: Record<string, number> = {
  "3-4": 4 / 3,
  "9-16": 16 / 9,
  "1-1": 1,
  "4-3": 3 / 4,
  "16-9": 9 / 16
};

export function applyStickerRatio(settings: StickerSettings, presetRatio: string): StickerSettings {
  const ratio = RATIOS[presetRatio];
  if (!ratio) return { ...settings, presetRatio };
  return { ...settings, pageHeight: Math.round(settings.width * ratio), presetRatio };
}

export function calculateStickerTableFirstColumnWidth(tableWidth: number, contentWidth: number): number {
  return Math.max(0, Math.min(tableWidth * 0.25, contentWidth));
}

export function calculateStickerPageOffsets(
  contentHeight: number,
  viewportHeight: number,
  blocks: readonly StickerBlockMetric[],
  mode: StickerPageMode
): number[] {
  if (mode === "single" || contentHeight <= viewportHeight) return [0];
  if (mode === "hr") return calculateHrOffsets(contentHeight, viewportHeight, blocks);
  return paginateSegment(0, contentHeight, viewportHeight, blocks);
}

function calculateHrOffsets(
  contentHeight: number,
  viewportHeight: number,
  blocks: readonly StickerBlockMetric[]
): number[] {
  const starts = [0, ...blocks.filter((block) => block.tag.toUpperCase() === "HR").map((block) => {
    const next = blocks.find((candidate) => candidate.top >= block.bottom && candidate.tag.toUpperCase() !== "HR");
    return next?.top ?? contentHeight;
  })].filter((value, index, values) => value < contentHeight && values.indexOf(value) === index).sort((a, b) => a - b);
  const offsets: number[] = [];
  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const end = starts[index + 1] ?? contentHeight;
    const pages = paginateSegment(start, end, viewportHeight, blocks, 10);
    for (const page of pages) if (!offsets.includes(page)) offsets.push(page);
  }
  return offsets;
}

function paginateSegment(
  start: number,
  end: number,
  viewportHeight: number,
  blocks: readonly StickerBlockMetric[],
  tolerance = 0
): number[] {
  const offsets = [start];
  let current = start;
  while (current + viewportHeight + tolerance < end) {
    const target = current + viewportHeight;
    const crossing = blocks
      .filter((block) => block.top < target && block.bottom > target && block.bottom > current)
      .sort((left, right) => (left.bottom - left.top) - (right.bottom - right.top))[0];
    let split = target;
    if (crossing && crossing.top > current && crossing.bottom - crossing.top <= viewportHeight) {
      split = crossing.top;
    } else {
      const previous = blocks
        .filter((block) => block.bottom > current && block.bottom <= target && block.tag.toUpperCase() !== "HR")
        .sort((left, right) => left.bottom - right.bottom)
        .at(-1);
      if (previous && target - previous.bottom <= 40) split = previous.bottom;
    }
    if (split <= current + 10) split = target;
    offsets.push(split);
    current = split;
  }
  return offsets;
}

export function validateStickerPages(pageHeights: readonly number[], forWechat: boolean): void {
  if (pageHeights.some((height) => height > STICKER_MAX_SINGLE_HEIGHT)) {
    throw new Error("单张长图超过安全高度，请改用多页切片");
  }
  if (forWechat && pageHeights.length > STICKER_MAX_WECHAT_PAGES) {
    throw new Error("公众号贴图最多支持 20 张图片");
  }
}

export function buildStickerExportPaths(title: string, pageCount: number, existingPaths: ReadonlySet<string>): string[] {
  const safeTitle = sanitizeStickerTitle(title);
  const directory = `贴图导出/${safeTitle}`;
  let batch = 1;
  while (Array.from({ length: pageCount }, (_, index) => stickerPath(directory, safeTitle, batch, index + 1)).some((path) => existingPaths.has(path))) {
    batch += 1;
  }
  return Array.from({ length: pageCount }, (_, index) => stickerPath(directory, safeTitle, batch, index + 1));
}

function stickerPath(directory: string, title: string, batch: number, page: number): string {
  const batchPart = batch === 1 ? "" : `_${batch}`;
  return `${directory}/${title}${batchPart}_${String(page).padStart(2, "0")}.png`;
}

export function sanitizeStickerTitle(title: string): string {
  return title.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim() || "未命名文章";
}
