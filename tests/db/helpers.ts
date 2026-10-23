import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client, Pool, type PoolClient } from "pg";

/**
 * Database integration harness.
 *
 * Creates a throwaway database on the PostgreSQL server in TEST_DATABASE_URL,
 * loads a minimal Supabase stub (auth schema, roles, storage) and applies every
 * migration in supabase/migrations. Each test impersonates users exactly the
 * way PostgREST does: `set local role authenticated` plus JWT claims.
 */

const root = path.resolve(__dirname, "../..");
export const adminUrl = process.env.TEST_DATABASE_URL;

export interface TestDb {
  pool: Pool;
  name: string;
  drop: () => Promise<void>;
}

function withDatabase(url: string, db: string) {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
}

export async function createTestDb(): Promise<TestDb> {
  if (!adminUrl) throw new Error("TEST_DATABASE_URL is not set");
  const name = `gd_test_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`create database ${name}`);
  await admin.end();

  const url = withDatabase(adminUrl, name);
  const setup = new Client({ connectionString: url });
  await setup.connect();
  await setup.query(readFileSync(path.join(root, "supabase/tests/supabase_stub.sql"), "utf8"));
  const dir = path.join(root, "supabase/migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await setup.query(readFileSync(path.join(dir, file), "utf8"));
  }
  await setup.end();

  const pool = new Pool({ connectionString: url, max: 30 });
  // Connections are force-closed when the database is dropped after the suite.
  pool.on("error", () => undefined);
  return {
    pool,
    name,
    drop: async () => {
      await pool.end();
      const c = new Client({ connectionString: adminUrl });
      await c.connect();
      await c.query(`drop database if exists ${name} with (force)`);
      await c.end();
    },
  };
}

/** Run as the database owner (trusted context, like migrations or the service role). */
export async function asOwner<T>(pool: Pool, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    return await fn(c);
  } finally {
    c.release();
  }
}

/** Run a callback as an authenticated end user (RLS + column grants apply). */
export async function asUser<T>(pool: Pool, userId: string | null, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query(`set local role ${userId ? "authenticated" : "anon"}`);
    await c.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify(userId ? { sub: userId, role: "authenticated" } : { role: "anon" }),
    ]);
    const result = await fn(c);
    await c.query("commit");
    return result;
  } catch (error) {
    await c.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    c.release();
  }
}

let counter = 0;

export interface UserOptions {
  emailConfirmed?: boolean;
  phone?: string | null;
  city?: string;
  fullName?: string;
}

export async function createUser(pool: Pool, opts: UserOptions = {}): Promise<string> {
  counter += 1;
  const n = `${Date.now()}${counter}`;
  const phone = opts.phone === undefined ? `+91${n.slice(-10).padStart(10, "9")}` : opts.phone;
  const { rows } = await pool.query(
    `insert into auth.users (email, email_confirmed_at, raw_user_meta_data)
     values ($1, $2, $3) returning id`,
    [
      `user${n}@example.test`,
      opts.emailConfirmed === false ? null : new Date(),
      { full_name: opts.fullName ?? `Test User ${counter}`, phone, city: opts.city ?? "surat" },
    ],
  );
  return rows[0].id as string;
}

export async function makeAdmin(pool: Pool, userId: string) {
  await pool.query(`insert into public.user_roles (user_id, role) values ($1, 'admin') on conflict do nothing`, [userId]);
}

export interface Catalogue {
  cityId: string;
  manufacturerId: string;
  vehicleId: string;
  variantId: string;
}

export async function createCatalogue(pool: Pool): Promise<Catalogue> {
  const suffix = Math.random().toString(36).slice(2, 8);
  const city = await pool.query(`select id from public.cities where slug = 'surat'`);
  const m = await pool.query(
    `insert into public.manufacturers (name, slug, categories) values ($1, $2, '{car}') returning id`,
    [`Maker ${suffix}`, `maker-${suffix}`],
  );
  const v = await pool.query(
    `insert into public.vehicles (manufacturer_id, model_name, slug, category, status)
     values ($1, $2, $3, 'car', 'published') returning id`,
    [m.rows[0].id, `Model ${suffix}`, `model-${suffix}`],
  );
  const vv = await pool.query(
    `insert into public.vehicle_variants (vehicle_id, name, slug, status) values ($1, 'Base', 'base', 'published') returning id`,
    [v.rows[0].id],
  );
  return { cityId: city.rows[0].id, manufacturerId: m.rows[0].id, vehicleId: v.rows[0].id, variantId: vv.rows[0].id };
}

export async function createBatch(
  pool: Pool,
  cat: Catalogue,
  opts: { target?: number; minimum?: number; deadline?: Date; status?: "open" | "draft" } = {},
): Promise<string> {
  const slug = `batch-${Math.random().toString(36).slice(2, 10)}`;
  const { rows } = await pool.query(
    `insert into public.batches (slug, variant_id, city_id, title, delivery_area, target_participants,
       minimum_participants, deadline, status, opened_at)
     values ($1, $2, $3, $4, 'Surat', $5, $6, $7, $8, now()) returning id`,
    [
      slug,
      cat.variantId,
      cat.cityId,
      `Test batch ${slug}`,
      opts.target ?? 20,
      opts.minimum ?? 5,
      opts.deadline ?? new Date(Date.now() + 7 * 864e5),
      opts.status ?? "open",
    ],
  );
  return rows[0].id as string;
}

export async function createDealer(pool: Pool, cat: Catalogue, opts: { verified?: boolean } = {}): Promise<string> {
  const slug = `dealer-${Math.random().toString(36).slice(2, 10)}`;
  const { rows } = await pool.query(
    `insert into public.dealers (name, slug, branch_address, city_id, authorization_status)
     values ($1, $2, 'Test address', $3, $4) returning id`,
    [`Dealer ${slug}`, slug, cat.cityId, opts.verified === false ? "pending" : "verified"],
  );
  await pool.query(`insert into public.dealer_brands (dealer_id, manufacturer_id) values ($1, $2)`, [
    rows[0].id,
    cat.manufacturerId,
  ]);
  return rows[0].id as string;
}

export async function linkDealerUser(pool: Pool, dealerId: string, userId: string) {
  await pool.query(`insert into public.dealer_users (dealer_id, user_id) values ($1, $2)`, [dealerId, userId]);
  await pool.query(`insert into public.user_roles (user_id, role) values ($1, 'dealer') on conflict do nothing`, [userId]);
}

export async function joinAs(pool: Pool, userId: string, batchId: string) {
  return asUser(pool, userId, async (c) => (await c.query(`select public.join_batch($1) as r`, [batchId])).rows[0].r);
}

export async function fillBatch(pool: Pool, batchId: string, count: number): Promise<string[]> {
  const users: string[] = [];
  for (let i = 0; i < count; i++) {
    const u = await createUser(pool);
    await joinAs(pool, u, batchId);
    users.push(u);
  }
  return users;
}

export async function batchRow(pool: Pool, batchId: string) {
  return (await pool.query(`select * from public.batches where id = $1`, [batchId])).rows[0];
}

/** Expect a promise to reject with a PostgreSQL error containing `fragment`. */
export async function expectDbError(promise: Promise<unknown>, fragment: string) {
  try {
    await promise;
  } catch (error) {
    const message = (error as Error).message;
    if (!message.includes(fragment)) {
      throw new Error(`Expected error containing "${fragment}" but got "${message}"`);
    }
    return;
  }
  throw new Error(`Expected error containing "${fragment}" but the call succeeded`);
}
