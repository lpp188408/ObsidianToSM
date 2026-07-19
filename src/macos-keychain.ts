import { execFile } from "child_process";
import { promisify } from "util";

const SERVICE_NAME = "ObsidianToSM";
const execFileAsync = promisify(execFile);

export type KeychainCommand = (args: string[]) => Promise<string>;

export class MacosKeychainStore {
  constructor(private readonly execute: KeychainCommand = runSecurity) {}

  async save(accountId: string, secret: string): Promise<void> {
    try {
      await this.execute(["add-generic-password", "-U", "-s", SERVICE_NAME, "-a", accountId, "-w", secret]);
    } catch {
      throw new Error("无法写入 macOS 系统钥匙串");
    }
  }

  async read(accountId: string): Promise<string> {
    try {
      return (await this.execute(["find-generic-password", "-s", SERVICE_NAME, "-a", accountId, "-w"])).trim();
    } catch {
      throw new Error("未在 macOS 系统钥匙串中找到该公众号的 AppSecret");
    }
  }
}

async function runSecurity(args: string[]): Promise<string> {
  if (process.platform !== "darwin") throw new Error("当前系统不是 macOS");
  const { stdout } = await execFileAsync("/usr/bin/security", args);
  return stdout;
}
