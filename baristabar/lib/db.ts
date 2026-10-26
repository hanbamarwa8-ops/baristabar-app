import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  baristaBarPool?: Pool;
};

let localPool: Pool | undefined = globalForDb.baristaBarPool;

export function getPool(): Pool {
  if (localPool) {
    return localPool;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL est manquante dans baristabar/.env.local.",
    );
  }

  localPool = new Pool({
    connectionString,
  });

  // Éviter de recréer un pool à chaque rechargement en développement.
  globalForDb.baristaBarPool = localPool;

  localPool.on("error", (error) => {
    console.error("Erreur du pool PostgreSQL :", error.message);
  });

  return localPool;
}