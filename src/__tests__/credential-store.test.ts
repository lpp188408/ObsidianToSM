import { describe, expect, it } from "vitest";
import { CredentialStore, type KeychainAdapter } from "../credential-store";

const fakeKeychain: KeychainAdapter = {
  isAvailable: () => true,
  encrypt: (value) => `encrypted:${value}`,
  decrypt: (value) => value.replace("encrypted:", "")
};

describe("CredentialStore", () => {
  it("只写入密文并可读取原始密钥", async () => {
    let encrypted: Record<string, string> = {};
    const store = new CredentialStore(fakeKeychain, () => encrypted, async (next) => { encrypted = next; });

    await store.save("wx-a", "plain-secret");

    expect(encrypted["wx-a"]).toBe("encrypted:plain-secret");
    expect(JSON.stringify(encrypted)).not.toMatch(/^plain-secret$/);
    expect(store.read("wx-a")).toBe("plain-secret");
  });

  it("钥匙串不可用时拒绝保存", async () => {
    const store = new CredentialStore({ ...fakeKeychain, isAvailable: () => false }, () => ({}), async () => undefined);
    await expect(store.save("wx-a", "secret")).rejects.toThrow("系统钥匙串不可用");
  });
});
