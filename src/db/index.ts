import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import * as relations from "@/db/relations";
import { getDatabaseConnectionOptions, getDatabaseUrl } from "@/lib/env";

const fullSchema = { ...schema, ...relations };

type AuriDb = ReturnType<typeof drizzle<typeof fullSchema>>;

const globalForDb = globalThis as unknown as {
  auriPostgres?: ReturnType<typeof postgres>;
  auriDb?: AuriDb;
};

function createPostgresClient() {
  const url = getDatabaseUrl();
  const options = getDatabaseConnectionOptions(url);
  return postgres(url, {
    prepare: options.prepare,
    ssl: options.ssl,
    max: 10,
  });
}

export function getDb(): AuriDb {
  if (!globalForDb.auriDb) {
    const client = globalForDb.auriPostgres ?? createPostgresClient();
    globalForDb.auriPostgres = client;
    globalForDb.auriDb = drizzle(client, { schema: fullSchema });
  }
  return globalForDb.auriDb;
}

/** Prefer getDb() in app code. Exported for tests that mock the accessor. */
export const db = new Proxy({} as AuriDb, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
