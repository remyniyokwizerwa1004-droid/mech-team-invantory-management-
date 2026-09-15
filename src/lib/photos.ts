import "server-only";

/**
 * Checks on photos arriving from a form.
 *
 * The browser already shrinks photos before sending them, but nothing it sends
 * can be trusted: the file type it claims is just a label. So the first bytes
 * of the file are inspected to confirm it really is a JPEG, PNG or WebP. SVG
 * is never accepted, because an SVG can carry script.
 */

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const MAX_THUMB_BYTES = 200 * 1024;

type ImageType = "image/jpeg" | "image/png" | "image/webp";

function sniff(bytes: Uint8Array): ImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  const ascii = (from: number, to: number) =>
    String.fromCharCode(...bytes.subarray(from, to));

  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return "image/webp";
  }

  return null;
}

export type PhotoUpload = {
  mimeType: ImageType;
  data: Uint8Array<ArrayBuffer>;
  thumb: Uint8Array<ArrayBuffer>;
  width: number;
  height: number;
};

/**
 * Reads the photo fields from a submitted form.
 *
 * Returns `null` when no photo was chosen, a `PhotoUpload` when a valid one
 * was, and an error message otherwise.
 */
export async function readPhotoUpload(
  formData: FormData,
): Promise<PhotoUpload | null | { error: string }> {
  const photo = formData.get("photo");
  const thumb = formData.get("photoThumb");

  if (!(photo instanceof File) || photo.size === 0) return null;

  if (!(thumb instanceof File) || thumb.size === 0) {
    return { error: "The photo did not finish preparing. Choose it again." };
  }

  if (photo.size > MAX_PHOTO_BYTES || thumb.size > MAX_THUMB_BYTES) {
    return { error: "That photo is too large. Choose it again so it can be shrunk first." };
  }

  const data = new Uint8Array(await photo.arrayBuffer());
  const small = new Uint8Array(await thumb.arrayBuffer());
  const mimeType = sniff(data);

  // The thumbnail is served with the full photo's type, so both must match.
  if (!mimeType || sniff(small) !== mimeType) {
    return { error: "That file is not a photo this app can store. Use a JPEG, PNG or WebP image." };
  }

  const width = Number(formData.get("photoWidth"));
  const height = Number(formData.get("photoHeight"));

  if (
    !Number.isInteger(width) || !Number.isInteger(height) ||
    width < 1 || height < 1 || width > 6000 || height > 6000
  ) {
    return { error: "The photo's size could not be read. Choose it again." };
  }

  return { mimeType, data, thumb: small, width, height };
}

/** The address of a photo. A new upload gets a new id, so it never goes stale. */
export function photoUrl(photoId: string, size: "full" | "thumb" = "full"): string {
  return size === "thumb" ? `/photos/${photoId}/thumb` : `/photos/${photoId}`;
}
