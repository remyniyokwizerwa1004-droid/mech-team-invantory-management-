"use client";

import { MapPin, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Field, Input, Select } from "@/components/ui/form";

/** A location plus the question it wants asked about the exact spot. */
export type LocationChoice = {
  id: string;
  label: string;
  detailLabel: string;
  detailHint: string;
  detailRequired: boolean;
  contactName: string | null;
};

/**
 * The storage location dropdown and the exact-spot field that follows it.
 *
 * The exact-spot question changes with the place chosen: a drawer unit asks
 * for a drawer number, a warehouse floor for a description. Leaving the
 * location empty is allowed; `unplacedNote` explains who people will be told
 * to ask in the meantime.
 */
export function LocationPicker({
  locations,
  defaultLocationId = "",
  defaultDetail = "",
  errors,
  unplacedNote,
}: {
  locations: LocationChoice[];
  defaultLocationId?: string;
  defaultDetail?: string;
  errors?: { storageLocationId?: string; locationDetail?: string };
  unplacedNote: ReactNode;
}) {
  const [locationId, setLocationId] = useState(defaultLocationId);
  const selected = locations.find((location) => location.id === locationId);

  return (
    <div className="space-y-4">
      <Field
        label="Storage location"
        htmlFor="storageLocationId"
        hint="The building or area to go to. You can leave this until it is put away."
        // If the exact-spot field is not on screen, its error still has to be.
        error={errors?.storageLocationId ?? (selected ? undefined : errors?.locationDetail)}
      >
        <Select
          id="storageLocationId"
          name="storageLocationId"
          value={locationId}
          onChange={(event) => setLocationId(event.target.value)}
        >
          <option value="">Not put away yet</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.label}
            </option>
          ))}
        </Select>
      </Field>

      {selected ? (
        <Field
          label={selected.detailLabel}
          htmlFor="locationDetail"
          required={selected.detailRequired}
          hint={selected.detailHint}
          error={errors?.locationDetail}
        >
          <Input
            id="locationDetail"
            name="locationDetail"
            defaultValue={defaultDetail}
            placeholder={selected.detailHint}
          />
        </Field>
      ) : null}

      {selected?.contactName ? (
        <p className="flex items-start gap-2 rounded-lg border border-line bg-surface-sunken p-3 text-sm text-body">
          <UserRound className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <span>
            Anyone looking for this will be told to ask{" "}
            <span className="font-medium text-ink">{selected.contactName}</span>
            , who looks after this location.
          </span>
        </p>
      ) : null}

      {!selected ? (
        <p className="flex items-start gap-2 rounded-lg border border-warning-line bg-warning-soft p-3 text-sm text-warning">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{unplacedNote}</span>
        </p>
      ) : null}
    </div>
  );
}
