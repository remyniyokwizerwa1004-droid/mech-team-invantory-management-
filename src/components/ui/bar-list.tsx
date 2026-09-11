import Link from "next/link";

/**
 * Horizontal magnitude comparison in one hue, darkest is not "different", just
 * bigger. A single series, so it needs no legend: the card title says what is
 * being counted.
 *
 * The value sits in its own right-hand column rather than riding the tip of the
 * bar, which means a long number next to a short bar can never be clipped.
 */
export function BarList({
  items,
  unitLabel,
}: {
  items: Array<{ id: string; label: string; value: number; href?: string }>;
  unitLabel?: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const percent = Math.round((item.value / max) * 100);

        const row = (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-body">{item.label}</span>
              <span className="tabular shrink-0 text-sm font-medium text-ink">
                {item.value}
                {unitLabel ? (
                  <span className="ml-1 font-normal text-muted">{unitLabel}</span>
                ) : null}
              </span>
            </div>

            <div className="mt-1.5 h-2 w-full rounded-full bg-surface-sunken">
              <div
                className="h-2 rounded-r-[4px] bg-brand"
                style={{ width: `${Math.max(percent, 2)}%` }}
              />
            </div>
          </>
        );

        return (
          <li key={item.id}>
            {item.href ? (
              <Link href={item.href} className="block rounded-lg">
                {row}
              </Link>
            ) : (
              row
            )}
          </li>
        );
      })}
    </ul>
  );
}
