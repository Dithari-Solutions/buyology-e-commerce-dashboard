export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: "image/jpeg" | "image/webp";
}

export async function compressImage(
  file: File,
  opts: CompressOptions = {}
): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.85,
    mimeType = "image/jpeg",
  } = opts;

  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(maxWidth / bitmap.width, maxHeight / bitmap.height, 1);
  const targetW = Math.round(bitmap.width * ratio);
  const targetH = Math.round(bitmap.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close?.();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, mimeType, quality)
  );
  if (!blob || blob.size >= file.size) return file;

  const ext = mimeType === "image/webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.${ext}`, { type: mimeType });
}
