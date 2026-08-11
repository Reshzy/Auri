import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("SKIP: DATABASE_URL not set");
    process.exit(0);
  }

  const sql = postgres(url, { max: 1, prepare: true, ssl: false });
  try {
    const tables = await sql<{ table_name: string }[]>`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'
      order by table_name
    `;

    console.log(
      "Public tables:",
      tables.map((row) => row.table_name).join(", ") || "(none)",
    );

    const drizzleJournal = await sql<{ exists: boolean }[]>`
      select exists (
        select 1
        from information_schema.tables
        where table_schema = 'drizzle'
          and table_name = '__drizzle_migrations'
      ) as exists
    `;

    console.log(
      "Drizzle migrations table:",
      drizzleJournal[0]?.exists ? "present" : "absent",
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error("Inspect failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
