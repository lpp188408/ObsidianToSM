import { describe, expect, it } from "vitest";
import {
  DEFAULT_STICKER_SETTINGS,
  applyStickerRatio,
  buildStickerExportPaths,
  calculateStickerPageOffsets,
  mergeStickerSettings,
  validateStickerPages
} from "../sticker";

describe("贴图设置", () => {
  it("默认使用 750x1000 的小红书 3:4 画布", () => {
    expect(DEFAULT_STICKER_SETTINGS).toMatchObject({
      pageMode: "single",
      width: 750,
      pageHeight: 1000,
      presetRatio: "3-4",
      fontSize: 16,
      padding: 40,
      borderRadius: 16
    });
  });

  it("应用比例预设时根据当前宽度更新页高", () => {
    expect(applyStickerRatio({ ...DEFAULT_STICKER_SETTINGS, width: 900 }, "9-16")).toMatchObject({
      width: 900,
      pageHeight: 1600,
      presetRatio: "9-16"
    });
  });

  it("旧配置升级时保留已有值并补全贴图默认值", () => {
    expect(mergeStickerSettings({ width: 900, fontSize: 20 })).toEqual({
      ...DEFAULT_STICKER_SETTINGS,
      width: 900,
      fontSize: 20
    });
  });
});

describe("贴图分页", () => {
  const blocks = [
    { top: 0, bottom: 300, tag: "H1" },
    { top: 320, bottom: 760, tag: "P" },
    { top: 780, bottom: 980, tag: "P" },
    { top: 1000, bottom: 1010, tag: "HR" },
    { top: 1030, bottom: 1500, tag: "P" }
  ];

  it("多页模式优先在完整块之前分页", () => {
    expect(calculateStickerPageOffsets(1500, 700, blocks, "multi")).toEqual([0, 320, 980]);
  });

  it("分割线模式从分割线后的正文开始新页", () => {
    expect(calculateStickerPageOffsets(1500, 700, blocks, "hr")).toEqual([0, 320, 1030]);
  });

  it("超长段落优先沿文本行边界切片", () => {
    expect(calculateStickerPageOffsets(1300, 700, [
      { top: 0, bottom: 1300, tag: "P" },
      { top: 680, bottom: 704, tag: "LINE" }
    ], "multi")).toEqual([0, 680]);
  });

  it("拒绝超过安全高度的单张长图和超过 20 页的微信贴图", () => {
    expect(() => validateStickerPages([16001], false)).toThrow("多页切片");
    expect(() => validateStickerPages(Array.from({ length: 21 }, () => 1000), true)).toThrow("20");
  });
});

describe("贴图文件路径", () => {
  it("写入统一导出目录并在重名时增加批次号", () => {
    expect(buildStickerExportPaths("测试/文章", 2, new Set())).toEqual([
      "贴图导出/测试-文章/测试-文章_01.png",
      "贴图导出/测试-文章/测试-文章_02.png"
    ]);
    expect(buildStickerExportPaths("测试/文章", 2, new Set(["贴图导出/测试-文章/测试-文章_01.png"]))).toEqual([
      "贴图导出/测试-文章/测试-文章_2_01.png",
      "贴图导出/测试-文章/测试-文章_2_02.png"
    ]);
    expect(buildStickerExportPaths("测试/文章", 2, new Set(["贴图导出/测试-文章/测试-文章_02.png"]))).toEqual([
      "贴图导出/测试-文章/测试-文章_2_01.png",
      "贴图导出/测试-文章/测试-文章_2_02.png"
    ]);
  });
});
