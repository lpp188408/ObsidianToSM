import { describe, expect, it } from "vitest";
import { calculateCoverCropRect, DEFAULT_COVER_CROP, normalizeCoverCrop } from "../cover-crop";

describe("封面裁剪", () => {
  it("使用居中且不放大的默认裁剪参数", () => {
    expect(normalizeCoverCrop()).toEqual(DEFAULT_COVER_CROP);
  });

  it("限制缩放和拖动位置，避免裁剪区域出现空白", () => {
    expect(normalizeCoverCrop({ scale: 9, offsetX: -3, offsetY: 5 })).toEqual({ scale: 3, offsetX: -1, offsetY: 1 });
  });

  it("按固定 2.35:1 输出尺寸计算居中覆盖区域", () => {
    const rect = calculateCoverCropRect(1000, 1000);
    expect(rect).toEqual({ x: 0, y: -337.5, width: 1175, height: 1175 });
  });

  it("偏移量沿可裁剪的溢出范围移动图片", () => {
    const rect = calculateCoverCropRect(1000, 1000, { scale: 2, offsetX: 1, offsetY: -1 });
    expect(rect).toEqual({ x: 0, y: -1850, width: 2350, height: 2350 });
  });
});
