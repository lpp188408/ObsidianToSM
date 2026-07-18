import { describe, expect, it } from "vitest";
import { parseAccountRows } from "../accounts";

describe("parseAccountRows", () => {
  it("解析多行账号且不把密钥放入账号元数据", () => {
    const result = parseAccountRows("技术笔记|wx-a|secret-a\n读书会|wx-b|secret-b");
    expect(result.accounts).toEqual([{ id: "wx-a", name: "技术笔记", appId: "wx-a" }, { id: "wx-b", name: "读书会", appId: "wx-b" }]);
    expect(result.secrets.get("wx-a")).toBe("secret-a");
  });

  it("拒绝格式错误和重复 AppID", () => {
    expect(() => parseAccountRows("技术笔记|wx-a")).toThrow("第 1 行格式错误");
    expect(() => parseAccountRows("技术笔记|wx-a|a\n重复|wx-a|b")).toThrow("AppID 重复：wx-a");
  });
});
