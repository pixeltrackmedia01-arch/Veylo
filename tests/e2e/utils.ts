import { expect, type Page } from "@playwright/test";
import { Client } from "pg";

export const E2E_DB = process.env.E2E_DATABASE_URL;

export async function sql<T = Record<string, unknown>>(query: string, params: unknown[] = []): Promise<T[]> {
  if (!E2E_DB) throw new Error("E2E_DATABASE_URL is required for this test");
  const c = new Client({ connectionString: E2E_DB });
  await c.connect();
  try {
    return (await c.query(query, params)).rows as T[];
  } finally {
    await c.end();
  }
}

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.test`;
}

export const PASSWORD = "Groupdrive-test-2026";

export async function signUp(page: Page, email: string, opts: { next?: string } = {}) {
  await page.goto(`/signup${opts.next ? `?next=${encodeURIComponent(opts.next)}` : ""}`);
  await page.getByLabel("Full name").fill("E2E Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mobile number").fill(`98${String(Date.now()).slice(-8)}`);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create free account" }).click();
}

export async function logIn(page: Page, email: string, password = PASSWORD, next?: string) {
  await page.goto(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

/** Sets a password for an existing (e.g. seeded demo) account via the Supabase Admin API. */
export async function setPassword(userId: string, password = PASSWORD) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  const res = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  expect(res.ok).toBeTruthy();
}
