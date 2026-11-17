// Hosting currently configures no D1 database. A deployment may supply DB;
// getDb checks for absence before constructing the Drizzle client.
declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
  }
}
