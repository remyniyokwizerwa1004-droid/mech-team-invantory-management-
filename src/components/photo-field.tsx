"use client";

import { Camera, ImageOff, Loader2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Longest edge of the stored photo. Plenty to recognise a tool, small to send. */
const FULL_EDGE = 1600;
/** The square thumbnail used in lists. Twice the displayed size, for sharp screens. */
const THUMB_EDGE = 240;
/** Stay well inside the server's 2 MB check after shrinking. */
const FULL_BUDGET = 1_400_000;

type Prepared = {
  full: File;
  thumb: File;
  width: number;
  height: number;
  previewUrl: string;
};

async function loadBitmap(file: File): Promise<ImageBitmap> {
  try {
    // Phones store rotation separately from the pixels; honour it.
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return await createImageBitmap(file);
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Draws part of an image into a canvas of the given size and encodes it.
 * WebP where the browser can write it, JPEG otherwise.
 */
async function encode(
  bitmap: ImageBitmap,
  crop: { x: number; y: number; w: number; h: number },
  width: number,
  height: number,
  quality: number,
  type?: string,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("no canvas");

  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, crop.x, crop.y, crop.w, crop.h, 0, 0, width, height);

  if (type) {
    const blob = await canvasToBlob(canvas, type, quality);
    if (blob) return blob;
  }

  const webp = await canvasToBlob(canvas, "image/webp", quality);
  if (webp && webp.type === "image/webp") return webp;

  const jpeg = await canvasToBlob(canvas, "image/jpeg", quality);
  if (!jpeg) throw new Error("encode failed");
  return jpeg;
}

async function prepare(file: File): Promise<Prepared> {
  const bitmap = await loadBitmap(file);

  try {
    const scale = Math.min(1, FULL_EDGE / Math.max(bitmap.width, bitmap.height));
    const whole = { x: 0, y: 0, w: bitmap.width, h: bitmap.height };

    let width = Math.round(bitmap.width * scale);
    let height = Math.round(bitmap.height * scale);
    let full = await encode(bitmap, whole, width, height, 0.82);

    // A very detailed photo can still come out large; try once more, smaller.
    if (full.size > FULL_BUDGET) {
      const smaller = Math.min(1, 1100 / Math.max(bitmap.width, bitmap.height));
      width = Math.round(bitmap.width * smaller);
      height = Math.round(bitmap.height * smaller);
      full = await encode(bitmap, whole, width, height, 0.7, full.type);
    }

    // Centre-cropped square, so every row in a list lines up.
    const side = Math.min(bitmap.width, bitmap.height);
    const square = {
      x: Math.round((bitmap.width - side) / 2),
      y: Math.round((bitmap.height - side) / 2),
      w: side,
      h: side,
    };
    const thumb = await encode(bitmap, square, THUMB_EDGE, THUMB_EDGE, 0.78, full.type);

    const extension = full.type === "image/webp" ? "webp" : "jpg";

    return {
      full: new File([full], `photo.${extension}`, { type: full.type }),
      thumb: new File([thumb], `thumb.${extension}`, { type: full.type }),
      width,
      height,
      previewUrl: URL.createObjectURL(full),
    };
  } finally {
    bitmap.close();
  }
}

function setFiles(input: HTMLInputElement | null, file: File | null) {
  if (!input) return;
  const transfer = new DataTransfer();
  if (file) transfer.items.add(file);
  input.files = transfer.files;
}

function kilobytes(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * An optional photo for an item, taken from the device in use.
 *
 * The chosen photo never goes to the server as it is. It is shrunk here
 * first, and the shrunk copy plus a square thumbnail are placed in hidden
 * file inputs, so the ordinary form submission carries them. That keeps a
 * 6 MB phone photo from failing on a slow connection or a size limit.
 */
export function PhotoField({
  existingPhotoUrl,
  error,
}: {
  existingPhotoUrl: string | null;
  error?: string;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const fullInput = useRef<HTMLInputElement>(null);
  const thumbInput = useRef<HTMLInputElement>(null);

  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);

  // While a photo is still being shrunk, hold the form back. Otherwise a
  // quick save would go through without the photo and nobody would notice.
  const workingRef = useRef(false);
  useEffect(() => {
    workingRef.current = working;
  }, [working]);

  useEffect(() => {
    const form = picker.current?.form;
    if (!form) return;

    const hold = (event: Event) => {
      if (workingRef.current) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    form.addEventListener("submit", hold, true);
    return () => form.removeEventListener("submit", hold, true);
  }, []);

  useEffect(() => {
    return () => {
      if (prepared) URL.revokeObjectURL(prepared.previewUrl);
    };
  }, [prepared]);

  async function choose(file: File | undefined) {
    if (!file) return;

    setProblem(null);

    if (!file.type.startsWith("image/") && file.type !== "") {
      setProblem("That file is not a photo. Choose a picture instead.");
      return;
    }

    setWorking(true);

    try {
      const next = await prepare(file);
      setFiles(fullInput.current, next.full);
      setFiles(thumbInput.current, next.thumb);
      setPrepared(next);
      setRemoved(false);
    } catch {
      setFiles(fullInput.current, null);
      setFiles(thumbInput.current, null);
      setPrepared(null);
      setProblem(
        "This browser could not open that photo. Try a JPEG or PNG, or take the photo again from this page.",
      );
    } finally {
      setWorking(false);
      // Allow choosing the same file again after removing it.
      if (picker.current) picker.current.value = "";
    }
  }

  function remove() {
    setFiles(fullInput.current, null);
    setFiles(thumbInput.current, null);
    setPrepared(null);
    setProblem(null);
    if (existingPhotoUrl) setRemoved(true);
  }

  const showing = prepared?.previewUrl ?? (removed ? null : existingPhotoUrl);
  const message = problem ?? error;

  return (
    <div className="space-y-3">
      <input ref={fullInput} type="file" name="photo" hidden tabIndex={-1} aria-hidden />
      <input ref={thumbInput} type="file" name="photoThumb" hidden tabIndex={-1} aria-hidden />
      <input type="hidden" name="photoWidth" value={prepared?.width ?? ""} />
      <input type="hidden" name="photoHeight" value={prepared?.height ?? ""} />
      <input type="hidden" name="removePhoto" value={removed ? "1" : ""} />

      <div className="flex flex-wrap items-start gap-4">
        <div
          className={cn(
            "relative flex size-36 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-surface-sunken",
            showing ? "border-line" : "border-dashed border-line-strong",
          )}
        >
          {showing ? (
            // A local preview of an unsaved photo, or the stored one. Neither
            // benefits from image optimisation.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={showing} alt="Photo of this item" className="size-full object-cover" />
          ) : (
            <ImageOff className="size-6 text-muted" aria-hidden />
          )}

          {working ? (
            <span className="absolute inset-0 flex items-center justify-center bg-surface/80">
              <Loader2 className="size-5 animate-spin text-brand" aria-hidden />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <label
              htmlFor="photo-picker"
              className={buttonClasses({ variant: "secondary", size: "sm", className: "cursor-pointer" })}
            >
              <Camera className="size-3.5" aria-hidden />
              {showing ? "Choose a different photo" : "Add a photo"}
            </label>
            <input
              ref={picker}
              id="photo-picker"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => choose(event.target.files?.[0])}
            />

            {showing ? (
              <button
                type="button"
                onClick={remove}
                className={buttonClasses({ variant: "ghost", size: "sm" })}
              >
                <Trash2 className="size-3.5" aria-hidden />
                Remove photo
              </button>
            ) : null}
          </div>

          <p className="text-sm text-muted" aria-live="polite">
            {working
              ? "Preparing the photo…"
              : prepared
                ? `Ready to save, shrunk to ${kilobytes(prepared.full.size)}.`
                : removed
                  ? "The photo will be removed when you save."
                  : "Optional. On a phone you can take one now or pick one from your gallery."}
          </p>

          {message ? <p className="text-sm text-critical">{message}</p> : null}
        </div>
      </div>
    </div>
  );
}
