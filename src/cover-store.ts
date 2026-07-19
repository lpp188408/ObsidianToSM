import type { WechatUploadFile } from "./wechat";

export interface StoredCover {
  storagePath: string;
  filename: string;
  mimeType: string;
}

export interface CoverStorageAdapter {
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  writeBinary(path: string, data: ArrayBuffer): Promise<void>;
  readBinary(path: string): Promise<ArrayBuffer>;
}

export class CoverStore {
  private readonly coverDirectory: string;

  constructor(private readonly adapter: CoverStorageAdapter, pluginDirectory: string) {
    this.coverDirectory = `${pluginDirectory}/covers`;
  }

  async save(notePath: string, file: WechatUploadFile): Promise<StoredCover> {
    if (!await this.adapter.exists(this.coverDirectory)) await this.adapter.mkdir(this.coverDirectory);
    const storagePath = `${this.coverDirectory}/${hashPath(notePath)}.cover`;
    await this.adapter.writeBinary(storagePath, file.bytes);
    return { storagePath, filename: file.filename, mimeType: file.mimeType };
  }

  async read(cover: StoredCover): Promise<WechatUploadFile> {
    return {
      bytes: await this.adapter.readBinary(cover.storagePath),
      filename: cover.filename,
      mimeType: cover.mimeType
    };
  }
}

function hashPath(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}
