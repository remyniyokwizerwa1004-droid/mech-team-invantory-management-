/**
 * Creates (or resets) a super admin account, and nothing else.
 *
 * The seed script is for filling a fresh database with example data to look
 * at. This is for the opposite situation: a real, empty production database
 * where you need exactly one account to sign in with, and no sample items.
 *
 *   npm run db:admin -- "Remy NIYOKWIZERWA" admin@example.com "a good password"
 *
 * Run it again with the same email to reset that person's password.
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  console.error(
    "Locally, copy .env.example to .env. For a hosted database, set it first:",
  );
  console.error('  $env:DATABASE_URL="postgres://..."');
  process.exit(1);
}

const [name, email, password] = process.argv.slice(2);

if (!name || !email || !password) {
  console.error("Usage:");
  console.error(
    '  npm run db:admin -- "Your Name" you@example.com "your password"',
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const normalised = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalised } });

  const user = await prisma.user.upsert({
    where: { email: normalised },
    update: {
      name,
      role: "SUPER_ADMIN",
      isActive: true,
      passwordHash: await bcrypt.hash(password, 10),
    },
    create: {
      name,
      email: normalised,
      role: "SUPER_ADMIN",
      isActive: true,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });

  console.log(existing ? "Updated existing account:" : "Created account:");
  console.log(`  ${user.name} <${user.email}>  SUPER_ADMIN`);
  console.log("\nSign in with that email and the password you just set.");

  const total = await prisma.user.count();
  if (total === 1) {
    console.log(
      "\nThis is the only account. Add the rest of the team from the Team page.",
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
