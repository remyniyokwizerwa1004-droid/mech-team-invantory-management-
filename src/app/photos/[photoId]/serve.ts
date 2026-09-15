import "server-only";

import { prisma } from "@/lib/db";

/**
 * Sends one stored photo.
 *
 * Photos are public, like the inventory they belong to. Each has a
 * permanent address that changes whenever the photo is replaced, so the
 * response can be cached for a year by the browser and by Vercel's CDN, and
 * the database is only read the first time an image is asked for.
 */
export async function servePhoto(
  photoId: string,
  size: "full" | "thumb",
): Promise<Response> {
  // Only the requested size is read, so a list of thumbnails never pulls
  // full-size images out of the database.
  const photo =
    size === "full"
      ? await prisma.toolPhoto
          .findUnique({ where: { id: photoId }, select: { data: true, mimeType: true } })
          .then((row) => row && { bytes: row.data, mimeType: row.mimeType })
      : await prisma.toolPhoto
          .findUnique({ where: { id: photoId }, select: { thumb: true, mimeType: true } })
          .then((row) => row && { bytes: row.thumb, mimeType: row.mimeType });

  if (!photo) {
    return new Response("Photo not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const { bytes } = photo;

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": photo.mimeType,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      // Never let a browser second-guess the type and run the file as
      // something other than an image.
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
