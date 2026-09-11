"use client";

import { Loader2, Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Select } from "@/components/ui/form";
import { TOOL_STATUS_LABELS, TOOL_STATUS_ORDER } from "@/lib/display";

export type FilterValues = {
  q: string;
  category: string;
  status: string;
  location: string;
};

export function InventoryFilters({
  values,
  categories,
  locations,
}: {
  values: FilterValues;
  categories: string[];
  locations: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState(values.q);

  // The server is the source of truth. If the URL changes from anywhere else
  // (back button, a cleared filter), take the new value.
  const lastPushed = useRef(values.q);

  useEffect(() => {
    if (values.q !== lastPushed.current) {
      lastPushed.current = values.q;
      setQuery(values.q);
    }
  }, [values.q]);

  function navigate(next: Partial<FilterValues>) {
    const merged = { ...values, ...next };
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }

    const search = params.toString();
    startTransition(() => {
      router.replace(search ? `${pathname}?${search}` : pathname, {
        scroll: false,
      });
    });
  }

  // Type freely; the URL catches up a beat later.
  useEffect(() => {
    if (query === values.q) return;

    const timer = setTimeout(() => {
      lastPushed.current = query;
      navigate({ q: query });
    }, 250);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const hasFilters = Boolean(
    values.q || values.category || values.status || values.location,
  );

  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-card">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by tool name, category or notes…"
          aria-label="Search the inventory"
          className="h-12 w-full rounded-lg border border-line bg-surface pr-10 pl-10 text-base text-ink placeholder:text-muted focus:border-brand"
        />

        {pending ? (
          <Loader2
            className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted"
            aria-hidden
          />
        ) : null}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Select
          aria-label="Filter by category"
          value={values.category}
          onChange={(event) => navigate({ category: event.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Filter by status"
          value={values.status}
          onChange={(event) => navigate({ status: event.target.value })}
        >
          <option value="">Any status</option>
          {TOOL_STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {TOOL_STATUS_LABELS[status]}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Filter by storage location"
          value={values.location}
          onChange={(event) => navigate({ location: event.target.value })}
        >
          <option value="">Anywhere</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.label}
            </option>
          ))}
        </Select>
      </div>

      {hasFilters ? (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            lastPushed.current = "";
            navigate({ q: "", category: "", status: "", location: "" });
          }}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-dark"
        >
          <X className="size-3.5" aria-hidden />
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
