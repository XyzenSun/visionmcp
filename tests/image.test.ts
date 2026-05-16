import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { inferMimeType, loadImage, parseBase64Image } from "../src/image.js";
import { parseAnalyzeImageInput } from "../src/schema.js";

const PNG_1X1 = "iVBORw0KGgo=";

describe("parseAnalyzeImageInput", () => {
  it("rejects missing image input", () => {
    expect(() => parseAnalyzeImageInput({})).toThrow(/Exactly one/);
  });

  it("rejects both image inputs", () => {
    expect(() => parseAnalyzeImageInput({ image_path: "a.png", image_base64: PNG_1X1 })).toThrow(/Exactly one/);
  });

  it("rejects remote URL image_path values", () => {
    expect(() => parseAnalyzeImageInput({ image_path: "https://example.com/a.png" })).toThrow(/local file path/);
  });
});

describe("image loading", () => {
  it("parses raw base64", () => {
    expect(parseBase64Image(PNG_1X1)).toEqual({ base64: PNG_1X1, mimeType: "image/png" });
  });

  it("parses data URLs", () => {
    expect(parseBase64Image(`data:image/jpeg;base64,${PNG_1X1}`)).toEqual({
      base64: PNG_1X1,
      mimeType: "image/jpeg",
    });
  });

  it("rejects invalid base64", () => {
    expect(() => parseBase64Image("not base64!")) .toThrow(/Invalid base64/);
  });

  it("infers MIME type from file extensions", () => {
    expect(inferMimeType("photo.jpg")).toBe("image/jpeg");
    expect(inferMimeType("photo.webp")).toBe("image/webp");
    expect(inferMimeType("photo.gif")).toBe("image/gif");
  });

  it("defaults unknown MIME types to image/png", () => {
    expect(inferMimeType("photo.unknown")).toBe("image/png");
  });

  it("loads local image files", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vision-mcp-"));
    const filePath = join(directory, "image.png");
    await writeFile(filePath, Buffer.from(PNG_1X1, "base64"));

    await expect(loadImage({ image_path: filePath })).resolves.toEqual({
      base64: PNG_1X1,
      mimeType: "image/png",
    });
  });
});
