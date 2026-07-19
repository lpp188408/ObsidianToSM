import { describe, expect, it } from "vitest";
import { MacosKeychainStore } from "../macos-keychain";

describe("MacosKeychainStore", () => {
  it("使用固定服务名将密钥写入并从系统钥匙串读取", async () => {
    const commands: string[][] = [];
    const store = new MacosKeychainStore(async (args) => {
      commands.push(args);
      return args[0] === "find-generic-password" ? "saved-secret\n" : "";
    });

    await store.save("wx-a", "saved-secret");
    await expect(store.read("wx-a")).resolves.toBe("saved-secret");

    expect(commands).toEqual([
      ["add-generic-password", "-U", "-s", "ObsidianToSM", "-a", "wx-a", "-w", "saved-secret"],
      ["find-generic-password", "-s", "ObsidianToSM", "-a", "wx-a", "-w"]
    ]);
  });

  it("将钥匙串错误转换为不包含密钥的中文提示", async () => {
    const store = new MacosKeychainStore(async () => { throw new Error("saved-secret"); });

    await expect(store.save("wx-a", "saved-secret")).rejects.toThrow("无法写入 macOS 系统钥匙串");
    await expect(store.save("wx-a", "saved-secret")).rejects.not.toThrow("saved-secret");
  });
});
