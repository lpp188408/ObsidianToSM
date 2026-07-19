import { describe, expect, it } from "vitest";
import { CoverStore, type CoverStorageAdapter } from "../cover-store";

describe("CoverStore", () => {
  it("按笔记路径保存并读取独立封面，不修改笔记内容", async () => {
    const files = new Map<string, ArrayBuffer>();
    const adapter: CoverStorageAdapter = {
      exists: async (path) => path === ".obsidian/plugins/obsidian-to-sm/covers",
      mkdir: async () => undefined,
      writeBinary: async (path, bytes) => { files.set(path, bytes); },
      readBinary: async (path) => files.get(path) ?? new ArrayBuffer(0)
    };
    const store = new CoverStore(adapter, ".obsidian/plugins/obsidian-to-sm");
    const bytes = new TextEncoder().encode("cover").buffer;

    const stored = await store.save("文章/测试.md", { bytes, filename: "封面.jpg", mimeType: "image/jpeg" });
    const result = await store.read(stored);

    expect(stored).toMatchObject({ filename: "封面.jpg", mimeType: "image/jpeg" });
    expect(stored.storagePath).toContain("/covers/");
    expect(new TextDecoder().decode(result.bytes)).toBe("cover");
  });

  it("首次保存时创建插件封面目录", async () => {
    const created: string[] = [];
    const adapter: CoverStorageAdapter = {
      exists: async () => false,
      mkdir: async (path) => { created.push(path); },
      writeBinary: async () => undefined,
      readBinary: async () => new ArrayBuffer(0)
    };
    const store = new CoverStore(adapter, ".obsidian/plugins/obsidian-to-sm");

    await store.save("测试.md", { bytes: new ArrayBuffer(0), filename: "封面.png", mimeType: "image/png" });

    expect(created).toEqual([".obsidian/plugins/obsidian-to-sm/covers"]);
  });
});
