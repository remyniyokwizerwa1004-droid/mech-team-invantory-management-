import Image from "next/image";

/**
 * The workshop photo, tinted, behind the top of a page.
 *
 * It spans the full window while whatever sits on it stays aligned to the
 * page's own content column, so a title lines up with the cards below it on
 * every page width. Place it as the first child of a `relative isolate`
 * element; it fills that element's height.
 *
 * The tint is darkest on the left, where headings start, so white text reads
 * over any part of the photo. The photo itself is pre-blurred so lettering on
 * the tool board never competes with the page.
 */
export function PhotoBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 overflow-hidden"
    >
      <Image
        src="/images/workshop-tool-wall.webp"
        alt=""
        fill
        sizes="100vw"
        fetchPriority="high"
        className="object-cover object-[center_40%]"
      />
      <div className="absolute inset-0 bg-linear-to-r from-hero/95 via-hero-mid/85 to-hero-light/70" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-hero/70 to-transparent" />
    </div>
  );
}
