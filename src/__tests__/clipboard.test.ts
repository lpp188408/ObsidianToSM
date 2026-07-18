import { describe, expect, it } from "vitest";
import { createClipboardPayload } from "../clipboard";

describe("createClipboardPayload", () => {
  it("creates html and plain text blobs", () => {
    const payload = createClipboardPayload("<p>hello</p>", "hello");

    expect(payload["text/html"].type).toBe("text/html");
    expect(payload["text/plain"].type).toBe("text/plain");
  });
});
