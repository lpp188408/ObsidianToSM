export interface WechatAccount {
  id: string;
  name: string;
  appId: string;
}

export interface ParsedAccounts {
  accounts: WechatAccount[];
  secrets: Map<string, string>;
}

export function parseAccountRows(input: string): ParsedAccounts {
  const accounts: WechatAccount[] = [];
  const secrets = new Map<string, string>();
  for (const [index, row] of input.split("\n").entries()) {
    if (!row.trim()) continue;
    const parts = row.split("|").map((part) => part.trim());
    if (parts.length !== 3 || parts.some((part) => !part)) throw new Error(`第 ${index + 1} 行格式错误，应为：名称|AppID|AppSecret`);
    const [name, appId, secret] = parts;
    if (secrets.has(appId)) throw new Error(`AppID 重复：${appId}`);
    accounts.push({ id: appId, name, appId });
    secrets.set(appId, secret);
  }
  return { accounts, secrets };
}
