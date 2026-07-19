import type { WechatUploadFile } from "./wechat";

export const COVER_ASPECT_RATIO = 2.35;
export const COVER_OUTPUT_WIDTH = 1175;
export const COVER_OUTPUT_HEIGHT = 500;

export interface CoverCrop {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export const DEFAULT_COVER_CROP: CoverCrop = { scale: 1, offsetX: 0, offsetY: 0 };

export function normalizeCoverCrop(crop?: Partial<CoverCrop>): CoverCrop {
  return {
    scale: clamp(crop?.scale ?? DEFAULT_COVER_CROP.scale, 1, 3),
    offsetX: clamp(crop?.offsetX ?? DEFAULT_COVER_CROP.offsetX, -1, 1),
    offsetY: clamp(crop?.offsetY ?? DEFAULT_COVER_CROP.offsetY, -1, 1)
  };
}

export function calculateCoverCropRect(sourceWidth: number, sourceHeight: number, crop?: Partial<CoverCrop>, targetWidth = COVER_OUTPUT_WIDTH, targetHeight = COVER_OUTPUT_HEIGHT): { x: number; y: number; width: number; height: number } {
  const normalized = normalizeCoverCrop(crop);
  const baseScale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * baseScale * normalized.scale;
  const height = sourceHeight * baseScale * normalized.scale;
  return {
    x: (targetWidth - width) / 2 + normalized.offsetX * (width - targetWidth) / 2,
    y: (targetHeight - height) / 2 + normalized.offsetY * (height - targetHeight) / 2,
    width,
    height
  };
}

export async function cropCoverFile(file: WechatUploadFile, crop?: Partial<CoverCrop>): Promise<WechatUploadFile> {
  const source = await loadImage(uploadFileToDataUrl(file));
  const canvas = document.createElement("canvas");
  canvas.width = COVER_OUTPUT_WIDTH;
  canvas.height = COVER_OUTPUT_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法创建封面裁剪画布");
  const rect = calculateCoverCropRect(source.naturalWidth, source.naturalHeight, crop);
  context.drawImage(source, rect.x, rect.y, rect.width, rect.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("生成裁剪封面失败")), "image/jpeg", 0.92));
  return {
    bytes: await blob.arrayBuffer(),
    filename: file.filename.replace(/\.[^.]+$/, "") + "-cover.jpg",
    mimeType: "image/jpeg"
  };
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("读取封面图片失败"));
    image.src = source;
  });
}

function uploadFileToDataUrl(file: WechatUploadFile): string {
  let binary = "";
  for (const byte of new Uint8Array(file.bytes)) binary += String.fromCharCode(byte);
  return `data:${file.mimeType};base64,${btoa(binary)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
