import "server-only";

import { randomUUID } from "node:crypto";

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const SIGNATURES: { mime: string; ext: string; test: (b: Uint8Array) => boolean }[] = [
  { mime: "application/pdf", ext: "pdf", test: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
  { mime: "image/png", ext: "png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/webp",
    ext: "webp",
    test: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
];

export type UploadKind = "document" | "image";

/**
 * Validates an uploaded file by size and by its actual content signature (not
 * the browser-provided MIME type or filename), and returns a random safe name.
 */
export async function validateUpload(file: File, kind: UploadKind) {
  if (!(file instanceof File) || file.size === 0) return { ok: false as const, error: "Choose a file to upload." };
  const max = kind === "image" ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;
  if (file.size > max) return { ok: false as const, error: `File is too large (max ${Math.round(max / 1024 / 1024)} MB).` };
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const match = SIGNATURES.find((s) => s.test(head));
  const allowed = kind === "image" ? ["image/png", "image/jpeg", "image/webp"] : ["application/pdf", "image/png", "image/jpeg"];
  if (!match || !allowed.includes(match.mime)) {
    return { ok: false as const, error: kind === "image" ? "Upload a JPG, PNG or WebP image." : "Upload a PDF, JPG or PNG file." };
  }
  return { ok: true as const, mime: match.mime, filename: `${randomUUID()}.${match.ext}`, bytes: await file.arrayBuffer() };
}
