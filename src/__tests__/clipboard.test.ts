import { describe, expect, it } from "vitest";
import { createClipboardPayload, createImageClipboardPayload } from "../clipboard";

describe("createClipboardPayload", () => {
  it("creates html and plain text blobs", () => {
    const payload = createClipboardPayload("<p>hello</p>", "hello");

    expect(payload["text/html"].type).toBe("text/html");
    expect(payload["text/plain"].type).toBe("text/plain");
  });
});

describe("createImageClipboardPayload", () => {
  it("creates a PNG clipboard item", () => {
    const image = new Blob(["png"], { type: "image/png" });
    const payload = createImageClipboardPayload(image);

    expect(payload["image/png"]).toBe(image);
  });
});
