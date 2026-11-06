import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  baristaBarPool?: Pool;
};

let localPool: Pool | undefined = globalForDb.baristaBarPool;

function getConfiguredPoolSize(): number {
  const rawValue = process.env.DB_POOL_MAX;
  if (!rawValue) return 1;

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
    console.warn("DB_POOL_MAX must be an integer between 1 and 20. Using 1.");
    return 1;
  }

  return parsed;
}

export function getPool(): Pool {
  if (localPool) {
    return localPool;
  }

  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL est manquante. Configure-la dans baristabar/.env.local avec la chaîne PostgreSQL de Supabase.",
    );
  }

  if (!/^postgres(?:ql)?:\/\//i.test(connectionString)) {
    throw new Error(
      "DATABASE_URL doit être une chaîne de connexion PostgreSQL valide.",
    );
  }

  localPool = new Pool({
    connectionString,
    max: getConfiguredPoolSize(),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
  });

  // Réutiliser le même pool lors du rechargement des modules en développement.
  globalForDb.baristaBarPool = localPool;

  localPool.on("error", (error) => {
    // Ne jamais journaliser la chaîne de connexion ni les identifiants.
    console.error("Erreur du pool PostgreSQL :", error.message);
  });

  return localPool;
}
