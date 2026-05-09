// Compress an image client-side before upload.
// - Resizes to max dimension (default 1600px)
// - Re-encodes as JPEG (default quality 0.82)
// - Skips if file is already small and under 250KB
export async function compressImage(
  file: File,
  opts: { maxDim?: number; quality?: number; mimeType?: string } = {}
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size < 250 * 1024) return file;

  const maxDim = opts.maxDim ?? 1600;
  const quality = opts.quality ?? 0.82;
  const mimeType = opts.mimeType ?? "image/jpeg";

  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  let { width, height } = img;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, mimeType, quality)
  );
  if (!blob || blob.size >= file.size) return file;

  const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
  return new File([blob], newName, { type: mimeType, lastModified: Date.now() });
}

export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map((f) => compressImage(f).catch(() => f)));
}