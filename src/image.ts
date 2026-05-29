import { extname } from "node:path";
import { readFile, stat } from "node:fs/promises";

import type { AnalyzeImageInput } from "./schema.js";

export type LoadedImage = {
  base64: string;
  mimeType: string;
};

export const MAX_IMAGE_BYTES = 100 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const DATA_URL_PATTERN = /^data:([^;,]+);base64,(.*)$/s;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

export async function loadImage(input: AnalyzeImageInput): Promise<LoadedImage> {
  if (input.image_path) {
    return loadImagePath(input.image_path, input.mime_type);
  }

  if (input.image_base64) {
    return parseBase64Image(input.image_base64, input.mime_type);
  }

  throw new Error("Exactly one of image_path or image_base64 must be provided");
}

async function loadImagePath(imagePath: string, mimeType?: string): Promise<LoadedImage> {
  if (/^https?:\/\//i.test(imagePath)) {
    throw new Error("image_path must be a local file path, not an HTTP or HTTPS URL");
  }

  try {
    const { size } = await stat(imagePath);

    if (size > MAX_IMAGE_BYTES) {
      throw new Error("image file exceeds the 100MB limit");
    }

    const file = await readFile(imagePath);
    return {
      base64: file.toString("base64"),
      mimeType: mimeType ?? inferMimeType(imagePath),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read local image file: ${reason}`);
  }
}

export function parseBase64Image(value: string, mimeType?: string): LoadedImage {
  const trimmed = value.trim();
  const dataUrlMatch = DATA_URL_PATTERN.exec(trimmed);

  if (dataUrlMatch) {
    const [, dataUrlMimeType, data] = dataUrlMatch;
    const base64 = normalizeBase64(data);
    return {
      base64,
      mimeType: mimeType ?? dataUrlMimeType,
    };
  }

  return {
    base64: normalizeBase64(trimmed),
    mimeType: mimeType ?? "image/png",
  };
}

export function inferMimeType(filePath: string): string {
  return MIME_BY_EXTENSION[extname(filePath).toLowerCase()] ?? "image/png";
}

function normalizeBase64(value: string): string {
  const compact = value.replace(/\s/g, "");

  if (!compact || compact.length % 4 !== 0 || !BASE64_PATTERN.test(compact)) {
    throw new Error("Invalid base64 image input");
  }

  try {
    Buffer.from(compact, "base64");
    return compact;
  } catch {
    throw new Error("Invalid base64 image input");
  }
}
