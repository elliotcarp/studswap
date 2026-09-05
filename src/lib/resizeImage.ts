// Resizes and re-encodes an image client-side before it's uploaded: caps the
// longest side at MAX_DIMENSION and always re-encodes as JPEG. Photos
// straight off a phone can be an unsupported format (e.g. HEIC, which
// /api/upload's allowlist rejects) or bigger than the server's size limit —
// doing this in the browser means the user never has to notice or fix that
// themselves. Throws if the browser can't decode the source file at all
// (e.g. HEIC in a browser with no HEIC codec) — PhotoGridEditor surfaces
// that as a "couldn't read this photo" error rather than a generic one.
const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.85;

export async function resizeImageFile(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Could not encode image"))),
        "image/jpeg",
        JPEG_QUALITY
      );
    });

    const newName = file.name.replace(/\.[^./\\]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
