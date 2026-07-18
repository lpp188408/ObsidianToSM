export interface KeychainAdapter {
  isAvailable(): boolean;
  encrypt(value: string): string;
  decrypt(value: string): string;
}

export class CredentialStore {
  constructor(
    private readonly keychain: KeychainAdapter,
    private readonly readData: () => Record<string, string>,
    private readonly writeData: (data: Record<string, string>) => Promise<void>
  ) {}

  async save(accountId: string, secret: string): Promise<void> {
    this.ensureAvailable();
    const next = { ...this.readData(), [accountId]: this.keychain.encrypt(secret) };
    await this.writeData(next);
  }

  read(accountId: string): string {
    this.ensureAvailable();
    const encrypted = this.readData()[accountId];
    if (!encrypted) throw new Error("未找到该公众号的 AppSecret");
    return this.keychain.decrypt(encrypted);
  }

  async remove(accountId: string): Promise<void> {
    const next = { ...this.readData() };
    delete next[accountId];
    await this.writeData(next);
  }

  private ensureAvailable(): void {
    if (!this.keychain.isAvailable()) throw new Error("系统钥匙串不可用，无法安全保存 AppSecret");
  }
}
