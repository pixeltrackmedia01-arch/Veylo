import { expect, test } from "@playwright/test";
import { E2E_DB, signUp, sql, uniqueEmail } from "./utils";

test.skip(!E2E_DB, "E2E_DATABASE_URL not set");

test("customer signs up, joins an open group once, and cannot reach admin", async ({ page }) => {
  const email = uniqueEmail("customer");
  await signUp(page, email, { next: "/dashboard" });
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /Hello/ })).toBeVisible();

  const [batch] = await sql<{ id: string; slug: string; verified_participant_count: number }>(
    `select id, slug, verified_participant_count from public.batches
     where status = 'open' and verified_participant_count < target_participants - 1 order by verified_participant_count limit 1`,
  );
  await page.goto(`/groups/${batch.slug}`);
  await page.getByRole("button", { name: /Join this group/ }).click();
  await expect(page.getByText("You're in this group")).toBeVisible();

  const [after] = await sql<{ verified_participant_count: number }>(`select verified_participant_count from public.batches where id = $1`, [batch.id]);
  expect(after.verified_participant_count).toBe(batch.verified_participant_count + 1);

  // Reloading and revisiting never double-counts.
  await page.reload();
  await expect(page.getByText("You're in this group")).toBeVisible();
  const [again] = await sql<{ n: number }>(
    `select count(*)::int as n from public.batch_memberships m join public.profiles p on p.id = m.user_id where m.batch_id = $1 and p.email = $2`,
    [batch.id, email],
  );
  expect(again.n).toBe(1);

  await page.goto("/dashboard");
  await expect(page.getByText("Active groups")).toBeVisible();

  const res = await page.goto("/admin");
  expect(res?.status()).toBe(404);
});
