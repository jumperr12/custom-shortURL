import { PrismaClient } from "@prisma/client";

// prisma doesn't actually open connections until the first query, so this is
// already lazy in practice. the global guard is just for next dev's hmr — without
// it each reload spawns a new client and leaks pg connections.
const g = globalThis as unknown as { __db?: PrismaClient };

export const db =
  g.__db ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") g.__db = db;
