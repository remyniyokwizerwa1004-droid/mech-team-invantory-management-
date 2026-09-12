/**
 * Creates the team's real storage structure, and the question each place
 * asks about the exact spot an item sits in.
 *
 *   npm run db:locations
 *
 * Matches on the short code, so running it twice updates rather than
 * duplicates. It only adds and updates; nothing is ever deleted, so running
 * it against a live database cannot lose anything.
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

type Place = {
  code: string;
  name: string;
  parentCode?: string;
  description?: string;
  detailLabel?: string;
  detailHint?: string;
  detailRequired?: boolean;
  contactName?: string;
};

const places: Place[] = [
  // --- Warehouse 1, the one with named partitions -------------------------
  {
    code: "WH1",
    name: "Warehouse 1",
    description: "Main store, divided into named areas.",
    detailLabel: "Which area",
    detailHint: "Better to pick one of the areas inside Warehouse 1 instead.",
  },
  {
    code: "WH1-SR",
    name: "Stock room",
    parentCode: "WH1",
    detailLabel: "Box label",
    detailHint: "Which labelled box, for example Box 14",
    detailRequired: true,
  },
  {
    code: "WH1-DR",
    name: "Drawers",
    parentCode: "WH1",
    detailLabel: "Drawer number",
    detailHint: "Which drawer or locker, for example Locker 04",
    detailRequired: true,
  },
  {
    code: "WH1-SH",
    name: "Main shelves",
    parentCode: "WH1",
    detailLabel: "Row or box",
    detailHint: "Which row, or the box label, for example Row 3 or Box 7",
    detailRequired: true,
  },
  {
    code: "WH1-MT",
    name: "Manager's table",
    parentCode: "WH1",
    detailLabel: "Where on the table",
    detailHint: "Describe the exact spot, for example the left tray",
    detailRequired: true,
  },

  // --- Warehouse 2 and the office, both described in words ----------------
  {
    code: "WH2",
    name: "Warehouse 2",
    description: "Open store. Items are placed by description.",
    detailLabel: "Exact position",
    detailHint: "Describe exactly where, for example back corner by the door",
    detailRequired: true,
  },
  {
    code: "OFF",
    name: "Office",
    description: "Items kept with whoever works in the office.",
    detailLabel: "Exact position",
    detailHint: "Describe exactly where, for example second cupboard, top shelf",
    detailRequired: true,
  },
];

async function main() {
  const idByCode = new Map<string, string>();

  // Parents first, so children have something to point at.
  for (const place of [...places].sort((a, b) =>
    (a.parentCode ? 1 : 0) - (b.parentCode ? 1 : 0),
  )) {
    const data = {
      name: place.name,
      description: place.description ?? null,
      parentId: place.parentCode ? idByCode.get(place.parentCode)! : null,
      detailLabel: place.detailLabel ?? null,
      detailHint: place.detailHint ?? null,
      detailRequired: place.detailRequired ?? false,
      contactName: place.contactName ?? null,
    };

    const saved = await prisma.storageLocation.upsert({
      where: { code: place.code },
      update: data,
      create: { ...data, code: place.code },
      select: { id: true },
    });

    idByCode.set(place.code, saved.id);
    console.log(`  ${place.parentCode ? "  " : ""}${place.name}`);
  }

  console.log(`\n${places.length} locations ready.`);
  console.log(
    "\nSet who to ask about items kept in the Office under Locations.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
