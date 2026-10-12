/**
 * Database seed — ResourceHub
 * ---------------------------------------------------------------------------
 * Creates a small, realistic dataset so the app can be demonstrated end to end:
 *   • 1 administrator + 3 members (email/password, hashed the same way Better
 *     Auth hashes credentials, so you can sign in with them immediately)
 *   • a catalogue of resources across every resource type
 *   • reservations covering each status, including a couple of conflicts-free
 *     "upcoming" bookings and some history
 *
 * Run with:  npm run db:seed   (or `npx prisma db seed`)
 *
 * The script is intentionally destructive: it clears the domain tables before
 * inserting, which keeps re-runs idempotent and avoids tripping the database
 * overlap (exclusion) constraint.
 */

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Sri Lanka Standard Time is a fixed UTC+05:30 offset (no daylight saving). */
const SLT_OFFSET_MINUTES = 5 * 60 + 30;

/**
 * Returns the UTC `Date` for a wall-clock time in Asia/Colombo.
 * @param dayOffset days from today (SLT); may be negative for history
 * @param hour      hour of day in SLT (0-23)
 * @param minute    minute of hour in SLT (0-59)
 */
function slt(dayOffset: number, hour: number, minute = 0): Date {
  const now = new Date();
  const sltNow = new Date(now.getTime() + SLT_OFFSET_MINUTES * 60_000);

  const day = sltNow.getUTCDate() + dayOffset;
  const utcMs =
    Date.UTC(sltNow.getUTCFullYear(), sltNow.getUTCMonth(), day, hour, minute) -
    SLT_OFFSET_MINUTES * 60_000;

  return new Date(utcMs);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** Fixed, readable ids keep the seed idempotent and the data easy to eyeball. */
const id = (prefix: string, key: string) => `seed-${prefix}-${key}`;

/* -------------------------------------------------------------------------- */
/* Seed data                                                                  */
/* -------------------------------------------------------------------------- */

type SeedUser = {
  key: string;
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "MEMBER";
};

const SEED_USERS: SeedUser[] = [
  {
    key: "admin",
    name: "Anjali Perera",
    email: "admin@resourcehub.dev",
    password: "Admin@12345",
    role: "ADMIN",
  },
  {
    key: "member-kasun",
    name: "Kasun Silva",
    email: "kasun@resourcehub.dev",
    password: "Member@12345",
    role: "MEMBER",
  },
  {
    key: "member-dilani",
    name: "Dilani Fernando",
    email: "dilani@resourcehub.dev",
    password: "Member@12345",
    role: "MEMBER",
  },
  {
    key: "member-ruwan",
    name: "Ruwan Jayasuriya",
    email: "ruwan@resourcehub.dev",
    password: "Member@12345",
    role: "MEMBER",
  },
];

type SeedResource = {
  key: string;
  name: string;
  type:
    | "MEETING_ROOM"
    | "CONFERENCE_ROOM"
    | "TRAINING_ROOM"
    | "WORKSPACE"
    | "EQUIPMENT"
    | "VEHICLE"
    | "OTHER";
  location: string;
  capacity: number;
  description: string;
  isActive?: boolean;
};

const SEED_RESOURCES: SeedResource[] = [
  {
    key: "boardroom-a",
    name: "Boardroom A",
    type: "MEETING_ROOM",
    location: "3rd Floor · West Wing",
    capacity: 12,
    description:
      "Our flagship meeting room with a wall-mounted display, video-conferencing kit, and whiteboard.",
  },
  {
    key: "huddle-1",
    name: "Huddle Room 1",
    type: "MEETING_ROOM",
    location: "2nd Floor · East Wing",
    capacity: 4,
    description: "Compact room for quick one-to-ones and stand-ups.",
  },
  {
    key: "conference-grand",
    name: "Grand Conference Hall",
    type: "CONFERENCE_ROOM",
    location: "Ground Floor · Atrium",
    capacity: 60,
    description:
      "Large hall for client presentations and all-hands, with a stage and dual projectors.",
  },
  {
    key: "training-101",
    name: "Training Room 101",
    type: "TRAINING_ROOM",
    location: "1st Floor · Learning Centre",
    capacity: 20,
    description:
      "Classroom layout with individual workstations and a teaching projector.",
  },
  {
    key: "hot-desk-bay",
    name: "Hot-desk Bay",
    type: "WORKSPACE",
    location: "2nd Floor · Open Area",
    capacity: 8,
    description: "Flexible desks for visiting colleagues or focused work.",
  },
  {
    key: "projector-4k",
    name: "Portable 4K Projector",
    type: "EQUIPMENT",
    location: "IT Store · Room 12",
    capacity: 1,
    description: "Epson 4K projector available to borrow for on-site events.",
  },
  {
    key: "company-van",
    name: "Company Van",
    type: "VEHICLE",
    location: "Basement Car Park · Bay 3",
    capacity: 7,
    description: "Toyota HiAce for team transport and site visits.",
  },
  {
    key: "podcast-mic",
    name: "Podcast Recording Kit",
    type: "EQUIPMENT",
    location: "IT Store · Room 12",
    capacity: 1,
    description: "Two condenser microphones, an interface, and headphones.",
  },
  {
    key: "oldsound-booth",
    name: "Legacy Sound Booth",
    type: "OTHER",
    location: "Basement · Studio B",
    capacity: 2,
    description: "Decommissioned booth kept for archival reference only.",
    isActive: false,
  },
];

type SeedReservation = {
  key: string;
  resourceKey: string;
  userKey: string;
  title: string;
  notes: string | null;
  start: Date;
  end: Date;
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";
  rejectionReason?: string | null;
  decided?: boolean;
  cancelled?: boolean;
};

/**
 * Active (PENDING/CONFIRMED) reservations must never overlap on the same
 * resource — the database enforces this with an exclusion constraint.
 */
function buildReservations(): SeedReservation[] {
  return [
    {
      key: "boardroom-weekly-sync",
      resourceKey: "boardroom-a",
      userKey: "member-kasun",
      title: "Weekly team sync",
      notes: "Standing agenda: sprint review and blockers.",
      start: slt(1, 9, 0),
      end: slt(1, 10, 0),
      status: "CONFIRMED",
      decided: true,
    },
    {
      key: "boardroom-design-review",
      resourceKey: "boardroom-a",
      userKey: "member-dilani",
      title: "Design review",
      notes: "Reviewing the new onboarding flow.",
      start: slt(1, 11, 0),
      end: slt(1, 12, 0),
      status: "PENDING",
    },
    {
      key: "huddle-recruitment",
      resourceKey: "huddle-1",
      userKey: "member-ruwan",
      title: "Recruitment interview",
      notes: "Backend engineer, second round.",
      start: slt(2, 10, 0),
      end: slt(2, 11, 0),
      status: "CONFIRMED",
      decided: true,
    },
    {
      key: "conference-client-demo",
      resourceKey: "conference-grand",
      userKey: "admin",
      title: "Client demo — Aurora project",
      notes: "Set up the stage and both projectors by 08:30.",
      start: slt(3, 9, 0),
      end: slt(3, 11, 0),
      status: "CONFIRMED",
      decided: true,
    },
    {
      key: "training-security",
      resourceKey: "training-101",
      userKey: "member-kasun",
      title: "Security awareness training",
      notes: "Mandatory annual session for the engineering team.",
      start: slt(4, 13, 30),
      end: slt(4, 16, 30),
      status: "PENDING",
    },
    {
      key: "van-site-visit",
      resourceKey: "company-van",
      userKey: "member-dilani",
      title: "Site visit — Kandy branch",
      notes: "Leaving at 07:00 sharp.",
      start: slt(5, 7, 0),
      end: slt(5, 15, 0),
      status: "CONFIRMED",
      decided: true,
    },
    {
      key: "projector-event",
      resourceKey: "projector-4k",
      userKey: "member-ruwan",
      title: "Quarterly town hall projector",
      notes: "Borrowing for the main hall.",
      start: slt(6, 8, 0),
      end: slt(6, 12, 0),
      status: "PENDING",
    },
    {
      key: "huddle-podcast-rejected",
      resourceKey: "huddle-1",
      userKey: "member-ruwan",
      title: "Podcast recording session",
      notes: "Needs a quiet room for two hours.",
      start: slt(7, 14, 0),
      end: slt(7, 16, 0),
      status: "REJECTED",
      rejectionReason:
        "Huddle Room 1 is not sound-proofed — please book the studio instead.",
      decided: true,
    },
    {
      key: "training-cancelled",
      resourceKey: "training-101",
      userKey: "member-dilani",
      title: "Vendor workshop (postponed)",
      notes: null,
      start: slt(8, 10, 0),
      end: slt(8, 12, 0),
      status: "CANCELLED",
      cancelled: true,
    },
    {
      key: "boardroom-past",
      resourceKey: "boardroom-a",
      userKey: "member-kasun",
      title: "Sprint retrospective",
      notes: "Completed successfully.",
      start: slt(-3, 15, 0),
      end: slt(-3, 16, 0),
      status: "CONFIRMED",
      decided: true,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Run                                                                        */
/* -------------------------------------------------------------------------- */

async function main() {
  console.log("🌱  Seeding ResourceHub…");

  // Reset domain data. Reservations first (they reference both users and
  // resources), then resources, then auth records and users.
  await prisma.reservation.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();

  // --- Users (with credential accounts) ------------------------------------
  const userIdByKey = new Map<string, string>();
  const adminId = id("user", "admin");

  for (const user of SEED_USERS) {
    const userId = id("user", user.key);
    userIdByKey.set(user.key, userId);

    const passwordHash = await hashPassword(user.password);

    await prisma.user.create({
      data: {
        id: userId,
        name: user.name,
        email: user.email,
        emailVerified: true,
        role: user.role,
        accounts: {
          create: {
            id: id("account", user.key),
            accountId: userId,
            providerId: "credential",
            password: passwordHash,
          },
        },
      },
    });
  }

  // --- Resources ------------------------------------------------------------
  const resourceIdByKey = new Map<string, string>();

  for (const resource of SEED_RESOURCES) {
    const resourceId = id("resource", resource.key);
    resourceIdByKey.set(resource.key, resourceId);

    await prisma.resource.create({
      data: {
        id: resourceId,
        name: resource.name,
        type: resource.type,
        location: resource.location,
        capacity: resource.capacity,
        description: resource.description,
        isActive: resource.isActive ?? true,
      },
    });
  }

  // --- Reservations ---------------------------------------------------------
  let created = 0;

  for (const reservation of buildReservations()) {
    const resourceId = resourceIdByKey.get(reservation.resourceKey);
    const userId = userIdByKey.get(reservation.userKey);

    if (!resourceId || !userId) {
      throw new Error(`Unknown seed reference for ${reservation.key}`);
    }

    await prisma.reservation.create({
      data: {
        id: id("reservation", reservation.key),
        resourceId,
        userId,
        title: reservation.title,
        notes: reservation.notes,
        startTime: reservation.start,
        endTime: reservation.end,
        status: reservation.status,
        rejectionReason: reservation.rejectionReason ?? null,
        ...(reservation.decided
          ? {
              decidedAt: addMinutes(reservation.start, -60),
              decidedById: adminId,
            }
          : {}),
        ...(reservation.cancelled
          ? { cancelledAt: addMinutes(reservation.start, -120) }
          : {}),
      },
    });

    created += 1;
  }

  console.log(
    `✅  Seeded ${SEED_USERS.length} users, ${SEED_RESOURCES.length} resources, ${created} reservations.`,
  );
  console.log("\n   Sign in with:");
  console.log("     admin@resourcehub.dev  / Admin@12345    (ADMIN)");
  console.log("     kasun@resourcehub.dev  / Member@12345   (MEMBER)");
}

main()
  .catch((error) => {
    console.error("❌  Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
