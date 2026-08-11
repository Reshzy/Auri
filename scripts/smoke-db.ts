import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { profiles } from "../src/db/schema/profiles";
import { getDatabaseConnectionOptions } from "../src/lib/env";

config({ path: ".env.local" });
config();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("SKIP: DATABASE_URL not set");
    process.exit(0);
  }

  const options = getDatabaseConnectionOptions(url);
  const client = postgres(url, {
    max: 1,
    prepare: options.prepare,
    ssl: options.ssl,
  });
  const db = drizzle(client);
  const id = randomUUID();

  try {
    await db.insert(profiles).values({
      id,
      clerkUserId: `clerk_smoke_${id}`,
      employeeName: "smoke-test",
    });
    const rows = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
    if (!rows[0] || rows[0].employeeName !== "smoke-test") {
      throw new Error("Smoke insert/select failed");
    }
    await db.delete(profiles).where(eq(profiles.id, id));
    const after = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
    if (after[0]) {
      throw new Error("Smoke cleanup failed");
    }
    console.log("Smoke DB CRUD: PASS");
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error("Smoke failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
