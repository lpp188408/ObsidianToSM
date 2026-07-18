import { describe, expect, it } from "vitest";
import { resolveEmbeds } from "../assets";

describe("resolveEmbeds", () => {
  it("replaces Obsidian image embeds with HTML image data URLs", async () => {
    const markdown = "before ![[cover.png|120x80]] after";
    const result = await resolveEmbeds(markdown, async (path) => `data:image/png;base64,${path}`);

    expect(result).toBe('before <img src="data:image/png;base64,cover.png" width="120" height="80" /> after');
  });
});
