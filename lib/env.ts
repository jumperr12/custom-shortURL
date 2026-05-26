import { z } from "zod";

// schema kept here for documentation + a typed getter, but we do NOT validate at
// import time. `next build` evaluates server modules with no env, so eager
// validation would crash every CI build. validate lazily, when something actually
// reads env.
const schema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be >= 16 chars (try: openssl rand -base64 32)"),
  AUTH_URL: z.string().url().optional(),
  APP_URL: z.string().url(),
  GEOIP_DB_PATH: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let _env: Env | null = null;

// call this from request handlers / workers, not from module top-level.
export function env(): Env {
  if (_env) return _env;
  _env = schema.parse(process.env);
  return _env;
}
