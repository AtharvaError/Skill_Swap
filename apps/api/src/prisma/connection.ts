/**
 * node-postgres already treats sslmode=require/prefer/verify-ca as
 * verify-full, but warns that this will change in its next major version.
 * Hosted Postgres (Neon, Supabase) has valid certificates, so ask for
 * verify-full explicitly: same behaviour today, no warning, no surprise later.
 */
export function normalizeConnectionString(connectionString: string): string {
  return connectionString.replace(
    /([?&]sslmode=)(require|prefer|verify-ca)\b/,
    '$1verify-full',
  );
}
