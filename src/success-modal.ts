import { App, Modal } from "obsidian";

export class SuccessModal extends Modal {
  constructor(app: App, private readonly title: string, private readonly message: string) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.empty();
    this.contentEl.createEl("h3", { text: this.title });
    this.contentEl.createEl("p", { text: this.message });
    const actions = this.contentEl.createDiv({ cls: "modal-button-container" });
    const confirm = actions.createEl("button", { cls: "mod-cta", text: "确认" });
    confirm.addEventListener("click", () => this.close());
    confirm.focus();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
