/**
 * Seeds a realistic starting point: one account for each role, a
 * nested set of storage locations, a stocked tool list, and enough request and
 * ticket history that the dashboard has something to show.
 *
 * Safe to run more than once. Every record has a fixed id and is upserted, so
 * re-running updates the demo rows instead of duplicating them.
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";
import type {
  RequestStatus,
  TicketSeverity,
  TicketStatus,
  ToolStatus,
  Urgency,
} from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const DEMO_PASSWORD = "ChangeMe123!";

// ---------------------------------------------------------------------------

const locations = [
  { id: "loc_workshop", name: "Main Workshop", code: "WS", parentId: null },
  { id: "loc_ws_wall_a", name: "Tool Wall A", code: "WS-A", parentId: "loc_workshop" },
  { id: "loc_ws_wall_b", name: "Tool Wall B", code: "WS-B", parentId: "loc_workshop" },
  { id: "loc_ws_cabinet", name: "Consumables Cabinet", code: "WS-C", parentId: "loc_workshop" },
  { id: "loc_bay", name: "Robotics Bay", code: "RB", parentId: null },
  { id: "loc_bay_cart1", name: "Robot Cart 1", code: "RB-1", parentId: "loc_bay" },
  { id: "loc_bay_cart2", name: "Robot Cart 2", code: "RB-2", parentId: "loc_bay" },
  { id: "loc_store", name: "Store Room", code: "SR", parentId: null },
  { id: "loc_store_shelf1", name: "Shelf 1", code: "SR-1", parentId: "loc_store" },
  { id: "loc_store_shelf2", name: "Shelf 2", code: "SR-2", parentId: "loc_store" },
];

const users = [
  {
    id: "usr_admin",
    name: "Remy NIYOKWIZERWA",
    email: "admin@mechteam.local",
    role: "SUPER_ADMIN" as const,
  },
  {
    id: "usr_manager",
    name: "Kastar",
    email: "manager@mechteam.local",
    role: "INVENTORY_MANAGER" as const,
  },
];

type SeedTool = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  status: ToolStatus;
  notes: string | null;
  storageLocationId: string;
};

const tools: SeedTool[] = [
  {
    id: "tool_hexkeys",
    name: "Hex key set (metric, 1.5–10 mm)",
    category: "Hand Tools",
    quantity: 6,
    unit: "sets",
    lowStockThreshold: 2,
    status: "AVAILABLE",
    notes: "Two sets live permanently on the robot carts.",
    storageLocationId: "loc_ws_wall_a",
  },
  {
    id: "tool_torque",
    name: "Torque wrench (2–24 Nm)",
    category: "Hand Tools",
    quantity: 2,
    unit: "pcs",
    lowStockThreshold: 2,
    status: "LOW_STOCK",
    notes: "Calibration due every 12 months. Last checked March.",
    storageLocationId: "loc_ws_wall_a",
  },
  {
    id: "tool_screwdriver",
    name: "Precision screwdriver set",
    category: "Hand Tools",
    quantity: 4,
    unit: "sets",
    lowStockThreshold: 1,
    status: "AVAILABLE",
    notes: null,
    storageLocationId: "loc_ws_wall_a",
  },
  {
    id: "tool_pliers",
    name: "Needle-nose pliers",
    category: "Hand Tools",
    quantity: 5,
    unit: "pcs",
    lowStockThreshold: 2,
    status: "AVAILABLE",
    notes: null,
    storageLocationId: "loc_ws_wall_b",
  },
  {
    id: "tool_circlip",
    name: "Circlip pliers (internal/external)",
    category: "Hand Tools",
    quantity: 1,
    unit: "sets",
    lowStockThreshold: 1,
    status: "LOW_STOCK",
    notes: "Needed for gearbox rebuilds.",
    storageLocationId: "loc_ws_wall_b",
  },
  {
    id: "tool_drill",
    name: "Cordless drill 18V",
    category: "Power Tools",
    quantity: 3,
    unit: "pcs",
    lowStockThreshold: 1,
    status: "AVAILABLE",
    notes: "Batteries charge on the bench in the Robotics Bay.",
    storageLocationId: "loc_bay_cart1",
  },
  {
    id: "tool_dremel",
    name: "Rotary tool with cutting discs",
    category: "Power Tools",
    quantity: 1,
    unit: "pcs",
    lowStockThreshold: 1,
    status: "LOW_STOCK",
    notes: null,
    storageLocationId: "loc_bay_cart1",
  },
  {
    id: "tool_heatgun",
    name: "Heat gun",
    category: "Power Tools",
    quantity: 2,
    unit: "pcs",
    lowStockThreshold: 1,
    status: "AVAILABLE",
    notes: "Used with heat-shrink tubing.",
    storageLocationId: "loc_bay_cart2",
  },
  {
    id: "tool_soldering",
    name: "Soldering station",
    category: "Electrical",
    quantity: 2,
    unit: "pcs",
    lowStockThreshold: 1,
    status: "AVAILABLE",
    notes: null,
    storageLocationId: "loc_bay_cart2",
  },
  {
    id: "tool_solder",
    name: "Solder wire 0.8 mm lead-free",
    category: "Consumables",
    quantity: 0,
    unit: "rolls",
    lowStockThreshold: 2,
    status: "FINISHED",
    notes: "Ran out during the arm rewiring job.",
    storageLocationId: "loc_ws_cabinet",
  },
  {
    id: "tool_heatshrink",
    name: "Heat-shrink tubing assortment",
    category: "Consumables",
    quantity: 3,
    unit: "packs",
    lowStockThreshold: 2,
    status: "AVAILABLE",
    notes: null,
    storageLocationId: "loc_ws_cabinet",
  },
  {
    id: "tool_zipties",
    name: "Cable ties 200 mm",
    category: "Consumables",
    quantity: 8,
    unit: "packs",
    lowStockThreshold: 3,
    status: "AVAILABLE",
    notes: null,
    storageLocationId: "loc_ws_cabinet",
  },
  {
    id: "tool_loctite",
    name: "Threadlocker (medium strength)",
    category: "Consumables",
    quantity: 1,
    unit: "bottles",
    lowStockThreshold: 2,
    status: "LOW_STOCK",
    notes: "Used on every motor mount bolt.",
    storageLocationId: "loc_ws_cabinet",
  },
  {
    id: "tool_ipa",
    name: "Isopropyl alcohol 99%",
    category: "Consumables",
    quantity: 0,
    unit: "litres",
    lowStockThreshold: 1,
    status: "FINISHED",
    notes: null,
    storageLocationId: "loc_ws_cabinet",
  },
  {
    id: "tool_multimeter",
    name: "Digital multimeter",
    category: "Measurement",
    quantity: 3,
    unit: "pcs",
    lowStockThreshold: 1,
    status: "AVAILABLE",
    notes: null,
    storageLocationId: "loc_ws_wall_b",
  },
  {
    id: "tool_calipers",
    name: "Digital calipers 150 mm",
    category: "Measurement",
    quantity: 2,
    unit: "pcs",
    lowStockThreshold: 1,
    status: "AVAILABLE",
    notes: null,
    storageLocationId: "loc_ws_wall_b",
  },
  {
    id: "tool_scope",
    name: "Portable oscilloscope",
    category: "Measurement",
    quantity: 1,
    unit: "pcs",
    lowStockThreshold: 1,
    status: "LOW_STOCK",
    notes: "Shared with the electronics team. Sign it out before taking it.",
    storageLocationId: "loc_store_shelf2",
  },
  {
    id: "tool_m3",
    name: "M3 socket cap screws (10 mm)",
    category: "Fasteners",
    quantity: 400,
    unit: "pcs",
    lowStockThreshold: 100,
    status: "AVAILABLE",
    notes: null,
    storageLocationId: "loc_store_shelf1",
  },
  {
    id: "tool_m5",
    name: "M5 socket cap screws (16 mm)",
    category: "Fasteners",
    quantity: 60,
    unit: "pcs",
    lowStockThreshold: 100,
    status: "LOW_STOCK",
    notes: "Main chassis fastener. Keep well stocked.",
    storageLocationId: "loc_store_shelf1",
  },
  {
    id: "tool_nylocs",
    name: "M5 nyloc nuts",
    category: "Fasteners",
    quantity: 250,
    unit: "pcs",
    lowStockThreshold: 80,
    status: "AVAILABLE",
    notes: null,
    storageLocationId: "loc_store_shelf1",
  },
  {
    id: "tool_servo",
    name: "Servo motor (arm joint, 40 kg·cm)",
    category: "Robot Spares",
    quantity: 4,
    unit: "pcs",
    lowStockThreshold: 2,
    status: "AVAILABLE",
    notes: "Fits joints 2 and 3 on the teleop arm.",
    storageLocationId: "loc_store_shelf2",
  },
  {
    id: "tool_belt",
    name: "Drive belt GT2 (6 mm)",
    category: "Robot Spares",
    quantity: 2,
    unit: "pcs",
    lowStockThreshold: 3,
    status: "LOW_STOCK",
    notes: null,
    storageLocationId: "loc_store_shelf2",
  },
  {
    id: "tool_camera",
    name: "Teleop head camera module",
    category: "Robot Spares",
    quantity: 1,
    unit: "pcs",
    lowStockThreshold: 1,
    status: "LOW_STOCK",
    notes: "Long lead time. Order well before it is needed.",
    storageLocationId: "loc_store_shelf2",
  },
  {
    id: "tool_battery",
    name: "LiPo battery 6S 5000 mAh",
    category: "Robot Spares",
    quantity: 6,
    unit: "pcs",
    lowStockThreshold: 3,
    status: "AVAILABLE",
    notes: "Store at storage charge. Check swelling monthly.",
    storageLocationId: "loc_bay_cart2",
  },
  {
    id: "tool_gloves",
    name: "Nitrile gloves (size L)",
    category: "Safety",
    quantity: 5,
    unit: "boxes",
    lowStockThreshold: 2,
    status: "AVAILABLE",
    notes: null,
    storageLocationId: "loc_ws_cabinet",
  },
  {
    id: "tool_goggles",
    name: "Safety goggles",
    category: "Safety",
    quantity: 8,
    unit: "pcs",
    lowStockThreshold: 4,
    status: "AVAILABLE",
    notes: null,
    storageLocationId: "loc_ws_wall_a",
  },
  {
    id: "tool_extinguisher",
    name: "LiPo fire safety bag",
    category: "Safety",
    quantity: 2,
    unit: "pcs",
    lowStockThreshold: 2,
    status: "LOW_STOCK",
    notes: "One per charging station.",
    storageLocationId: "loc_bay_cart2",
  },
  {
    id: "tool_oldcrimper",
    name: "Manual wire crimper (old model)",
    category: "Hand Tools",
    quantity: 1,
    unit: "pcs",
    lowStockThreshold: 1,
    status: "RETIRED",
    notes: "Replaced by the ratcheting crimper. Kept as a backup only.",
    storageLocationId: "loc_store_shelf1",
  },
];

// Days ago -> Date, so the seeded history always looks recent.
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

const requests: Array<{
  id: string;
  toolId: string | null;
  itemName: string;
  quantityRequested: number;
  unit: string;
  reason: string;
  urgency: Urgency;
  status: RequestStatus;
  requestedById: string;
  approvedById: string | null;
  createdAt: Date;
  events: Array<{
    toStatus: RequestStatus;
    fromStatus: RequestStatus | null;
    note: string;
    actorId: string;
    createdAt: Date;
  }>;
}> = [
  {
    id: "req_solder",
    toolId: "tool_solder",
    itemName: "Solder wire 0.8 mm lead-free",
    quantityRequested: 5,
    unit: "rolls",
    reason: "Completely out. Two rewiring jobs are blocked.",
    urgency: "CRITICAL",
    status: "ORDERED",
    requestedById: "usr_manager",
    approvedById: "usr_manager",
    createdAt: daysAgo(9),
    events: [
      {
        fromStatus: null,
        toStatus: "REQUESTED",
        note: "Raised after the last roll ran out mid-job.",
        actorId: "usr_manager",
        createdAt: daysAgo(9),
      },
      {
        fromStatus: "REQUESTED",
        toStatus: "APPROVED",
        note: "Approved. Supplier has stock.",
        actorId: "usr_manager",
        createdAt: daysAgo(8),
      },
      {
        fromStatus: "APPROVED",
        toStatus: "ORDERED",
        note: "PO 2291 raised. Expected within the week.",
        actorId: "usr_manager",
        createdAt: daysAgo(6),
      },
    ],
  },
  {
    id: "req_m5",
    toolId: "tool_m5",
    itemName: "M5 socket cap screws (16 mm)",
    quantityRequested: 500,
    unit: "pcs",
    reason: "Below the reorder point and used on every chassis build.",
    urgency: "HIGH",
    status: "APPROVED",
    requestedById: "usr_manager",
    approvedById: "usr_admin",
    createdAt: daysAgo(4),
    events: [
      {
        fromStatus: null,
        toStatus: "REQUESTED",
        note: "Stock down to 60 pcs.",
        actorId: "usr_manager",
        createdAt: daysAgo(4),
      },
      {
        fromStatus: "REQUESTED",
        toStatus: "APPROVED",
        note: "Approved against the maintenance budget.",
        actorId: "usr_admin",
        createdAt: daysAgo(3),
      },
    ],
  },
  {
    id: "req_ipa",
    toolId: "tool_ipa",
    itemName: "Isopropyl alcohol 99%",
    quantityRequested: 4,
    unit: "litres",
    reason: "Needed for contact cleaning before every camera reseat.",
    urgency: "NORMAL",
    status: "REQUESTED",
    requestedById: "usr_manager",
    approvedById: null,
    createdAt: daysAgo(2),
    events: [
      {
        fromStatus: null,
        toStatus: "REQUESTED",
        note: "",
        actorId: "usr_manager",
        createdAt: daysAgo(2),
      },
    ],
  },
  {
    id: "req_camera",
    toolId: "tool_camera",
    itemName: "Teleop head camera module",
    quantityRequested: 2,
    unit: "pcs",
    reason: "Only one spare left and the lead time is six weeks.",
    urgency: "HIGH",
    status: "REQUESTED",
    requestedById: "usr_manager",
    approvedById: null,
    createdAt: daysAgo(1),
    events: [
      {
        fromStatus: null,
        toStatus: "REQUESTED",
        note: "Worth ordering ahead of the next deployment.",
        actorId: "usr_manager",
        createdAt: daysAgo(1),
      },
    ],
  },
  {
    id: "req_labeller",
    toolId: null,
    itemName: "Cable label printer",
    quantityRequested: 1,
    unit: "pcs",
    reason:
      "Not in inventory yet. Hand-written labels keep coming off the looms.",
    urgency: "LOW",
    status: "REJECTED",
    requestedById: "usr_manager",
    approvedById: "usr_admin",
    createdAt: daysAgo(14),
    events: [
      {
        fromStatus: null,
        toStatus: "REQUESTED",
        note: "",
        actorId: "usr_manager",
        createdAt: daysAgo(14),
      },
      {
        fromStatus: "REQUESTED",
        toStatus: "REJECTED",
        note: "Deferred to next quarter's budget. Revisit in January.",
        actorId: "usr_admin",
        createdAt: daysAgo(12),
      },
    ],
  },
  {
    id: "req_gloves",
    toolId: "tool_gloves",
    itemName: "Nitrile gloves (size L)",
    quantityRequested: 4,
    unit: "boxes",
    reason: "Routine restock.",
    urgency: "LOW",
    status: "RECEIVED",
    requestedById: "usr_manager",
    approvedById: "usr_manager",
    createdAt: daysAgo(25),
    events: [
      {
        fromStatus: null,
        toStatus: "REQUESTED",
        note: "",
        actorId: "usr_manager",
        createdAt: daysAgo(25),
      },
      {
        fromStatus: "REQUESTED",
        toStatus: "APPROVED",
        note: "",
        actorId: "usr_manager",
        createdAt: daysAgo(24),
      },
      {
        fromStatus: "APPROVED",
        toStatus: "ORDERED",
        note: "PO 2210.",
        actorId: "usr_manager",
        createdAt: daysAgo(22),
      },
      {
        fromStatus: "ORDERED",
        toStatus: "RECEIVED",
        note: "Delivered and added to the consumables cabinet.",
        actorId: "usr_manager",
        createdAt: daysAgo(18),
      },
    ],
  },
];

const tickets: Array<{
  id: string;
  toolId: string;
  title: string;
  description: string;
  severity: TicketSeverity;
  status: TicketStatus;
  openedById: string;
  assignedToId: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  events: Array<{
    type: "OPENED" | "STATUS_CHANGED" | "ASSIGNED" | "COMMENT";
    fromValue: string | null;
    toValue: string | null;
    note: string;
    actorId: string;
    createdAt: Date;
  }>;
}> = [
  {
    id: "tkt_torque",
    toolId: "tool_torque",
    title: "Torque wrench clicks early",
    description:
      "The 2–24 Nm wrench releases around 15 Nm when it is set to 20 Nm. Checked against the second wrench and the readings do not agree. It should not be used on motor mounts until it is recalibrated.",
    severity: "HIGH",
    status: "IN_PROGRESS",
    openedById: "usr_manager",
    assignedToId: "usr_manager",
    createdAt: daysAgo(5),
    resolvedAt: null,
    events: [
      {
        type: "OPENED",
        fromValue: null,
        toValue: "OPEN",
        note: "Flagged during the joint 2 rebuild.",
        actorId: "usr_manager",
        createdAt: daysAgo(5),
      },
      {
        type: "ASSIGNED",
        fromValue: null,
        toValue: "Kastar",
        note: "",
        actorId: "usr_manager",
        createdAt: daysAgo(5),
      },
      {
        type: "STATUS_CHANGED",
        fromValue: "OPEN",
        toValue: "IN_PROGRESS",
        note: "Booked in with the calibration service. Tagged do-not-use.",
        actorId: "usr_manager",
        createdAt: daysAgo(4),
      },
    ],
  },
  {
    id: "tkt_drill",
    toolId: "tool_drill",
    title: "Drill battery will not hold charge",
    description:
      "Battery pack B runs flat after about ten minutes of light use. The other two packs are fine, so it looks like the cells rather than the charger.",
    severity: "MEDIUM",
    status: "OPEN",
    openedById: "usr_manager",
    assignedToId: null,
    createdAt: daysAgo(2),
    resolvedAt: null,
    events: [
      {
        type: "OPENED",
        fromValue: null,
        toValue: "OPEN",
        note: "",
        actorId: "usr_manager",
        createdAt: daysAgo(2),
      },
    ],
  },
  {
    id: "tkt_camera",
    toolId: "tool_camera",
    title: "Head camera drops frames above 30 fps",
    description:
      "The spare camera module produces visible frame drops when the teleop feed is set above 30 fps. Reproduced on two different carts, so it is the module and not the cabling.",
    severity: "CRITICAL",
    status: "OPEN",
    openedById: "usr_manager",
    assignedToId: "usr_manager",
    createdAt: daysAgo(1),
    resolvedAt: null,
    events: [
      {
        type: "OPENED",
        fromValue: null,
        toValue: "OPEN",
        note: "This is our only spare, so it matters.",
        actorId: "usr_manager",
        createdAt: daysAgo(1),
      },
      {
        type: "ASSIGNED",
        fromValue: null,
        toValue: "Kastar",
        note: "Please try the older firmware first.",
        actorId: "usr_manager",
        createdAt: daysAgo(1),
      },
    ],
  },
  {
    id: "tkt_solder",
    toolId: "tool_soldering",
    title: "Soldering station tip not heating",
    description:
      "Station 2 showed a temperature error and would not reach 350 C. The tip and the heating element were both replaced.",
    severity: "MEDIUM",
    status: "RESOLVED",
    openedById: "usr_manager",
    assignedToId: "usr_manager",
    createdAt: daysAgo(20),
    resolvedAt: daysAgo(16),
    events: [
      {
        type: "OPENED",
        fromValue: null,
        toValue: "OPEN",
        note: "",
        actorId: "usr_manager",
        createdAt: daysAgo(20),
      },
      {
        type: "ASSIGNED",
        fromValue: null,
        toValue: "Kastar",
        note: "",
        actorId: "usr_manager",
        createdAt: daysAgo(19),
      },
      {
        type: "STATUS_CHANGED",
        fromValue: "OPEN",
        toValue: "IN_PROGRESS",
        note: "Spare tip ordered.",
        actorId: "usr_manager",
        createdAt: daysAgo(19),
      },
      {
        type: "STATUS_CHANGED",
        fromValue: "IN_PROGRESS",
        toValue: "RESOLVED",
        note: "Tip and element replaced. Holds 350 C steadily now.",
        actorId: "usr_manager",
        createdAt: daysAgo(16),
      },
    ],
  },
  {
    id: "tkt_crimper",
    toolId: "tool_oldcrimper",
    title: "Crimper jaws misaligned",
    description:
      "The jaws no longer close squarely and crimps pull out under light load.",
    severity: "LOW",
    status: "CLOSED",
    openedById: "usr_manager",
    assignedToId: "usr_manager",
    createdAt: daysAgo(40),
    resolvedAt: daysAgo(35),
    events: [
      {
        type: "OPENED",
        fromValue: null,
        toValue: "OPEN",
        note: "",
        actorId: "usr_manager",
        createdAt: daysAgo(40),
      },
      {
        type: "STATUS_CHANGED",
        fromValue: "OPEN",
        toValue: "CLOSED",
        note: "Not worth repairing. Tool retired and replaced.",
        actorId: "usr_manager",
        createdAt: daysAgo(35),
      },
    ],
  },
];

// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding…");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: { name: user.name, email: user.email, role: user.role, isActive: true },
      create: { ...user, passwordHash },
    });
  }
  console.log(`  ${users.length} users`);

  // Parents first, so a child's parentId always points at a row that exists.
  for (const location of locations.filter((l) => l.parentId === null)) {
    await prisma.storageLocation.upsert({
      where: { id: location.id },
      update: { name: location.name, code: location.code },
      create: location,
    });
  }
  for (const location of locations.filter((l) => l.parentId !== null)) {
    await prisma.storageLocation.upsert({
      where: { id: location.id },
      update: { name: location.name, code: location.code, parentId: location.parentId },
      create: location,
    });
  }
  console.log(`  ${locations.length} storage locations`);

  for (const tool of tools) {
    await prisma.tool.upsert({
      where: { id: tool.id },
      update: { ...tool, createdById: "usr_manager" },
      create: { ...tool, createdById: "usr_manager" },
    });

    // One "added to inventory" entry so every tool has a history from day one.
    await prisma.inventoryLog.upsert({
      where: { id: `log_${tool.id}_created` },
      update: {},
      create: {
        id: `log_${tool.id}_created`,
        toolId: tool.id,
        action: "CREATED",
        newValue: `${tool.quantity} ${tool.unit}`,
        note: "Initial stock take",
        performedById: "usr_manager",
        createdAt: daysAgo(30),
      },
    });
  }
  console.log(`  ${tools.length} tools`);

  // A handful of recent changes so the activity feed is not empty.
  const activity = [
    {
      id: "log_solder_out",
      toolId: "tool_solder",
      action: "QUANTITY_UPDATED" as const,
      field: "quantity",
      oldValue: "2 rolls",
      newValue: "0 rolls",
      note: "Used up on the arm rewiring job.",
      performedById: "usr_manager",
      createdAt: daysAgo(9),
    },
    {
      id: "log_solder_status",
      toolId: "tool_solder",
      action: "STATUS_CHANGED" as const,
      field: "status",
      oldValue: "LOW_STOCK",
      newValue: "FINISHED",
      note: null,
      performedById: "usr_manager",
      createdAt: daysAgo(9),
    },
    {
      id: "log_m5_down",
      toolId: "tool_m5",
      action: "QUANTITY_UPDATED" as const,
      field: "quantity",
      oldValue: "160 pcs",
      newValue: "60 pcs",
      note: "Chassis rebuild on cart 2.",
      performedById: "usr_manager",
      createdAt: daysAgo(5),
    },
    {
      id: "log_scope_moved",
      toolId: "tool_scope",
      action: "LOCATION_CHANGED" as const,
      field: "storageLocation",
      oldValue: "Main Workshop › Tool Wall B",
      newValue: "Store Room › Shelf 2",
      note: "Moved so the electronics team can find it.",
      performedById: "usr_manager",
      createdAt: daysAgo(3),
    },
    {
      id: "log_crimper_retired",
      toolId: "tool_oldcrimper",
      action: "STATUS_CHANGED" as const,
      field: "status",
      oldValue: "AVAILABLE",
      newValue: "RETIRED",
      note: "Jaws misaligned beyond repair.",
      performedById: "usr_admin",
      createdAt: daysAgo(35),
    },
    {
      id: "log_gloves_restock",
      toolId: "tool_gloves",
      action: "RESTOCKED" as const,
      field: "quantity",
      oldValue: "1 boxes",
      newValue: "5 boxes",
      note: "Received against request for nitrile gloves.",
      performedById: "usr_manager",
      createdAt: daysAgo(18),
    },
  ];

  for (const entry of activity) {
    await prisma.inventoryLog.upsert({
      where: { id: entry.id },
      update: {},
      create: entry,
    });
  }
  console.log(`  ${activity.length} recent activity entries`);

  for (const request of requests) {
    const { events, ...data } = request;

    await prisma.procurementRequest.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });

    for (const [index, event] of events.entries()) {
      await prisma.procurementEvent.upsert({
        where: { id: `${data.id}_ev${index}` },
        update: {},
        create: { id: `${data.id}_ev${index}`, requestId: data.id, ...event },
      });
    }
  }
  console.log(`  ${requests.length} procurement requests`);

  for (const ticket of tickets) {
    const { events, ...data } = ticket;

    await prisma.repairTicket.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });

    for (const [index, event] of events.entries()) {
      await prisma.ticketEvent.upsert({
        where: { id: `${data.id}_ev${index}` },
        update: {},
        create: { id: `${data.id}_ev${index}`, ticketId: data.id, ...event },
      });
    }
  }
  console.log(`  ${tickets.length} repair tickets`);

  console.log("\nDone. Sign in with any of these:");
  for (const user of users) {
    console.log(`  ${user.email.padEnd(26)} ${DEMO_PASSWORD}   (${user.role})`);
  }
  console.log("\nChange these passwords before anyone outside the team gets the link.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

