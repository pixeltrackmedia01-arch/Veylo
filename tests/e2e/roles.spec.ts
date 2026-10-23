import { expect, test } from "@playwright/test";
import { E2E_DB, logIn, setPassword, signUp, sql, uniqueEmail } from "./utils";

test.skip(!E2E_DB, "E2E_DATABASE_URL not set");

test("admin approves and publishes a quotation; only verified participants see it", async ({ browser }) => {
  const [{ started }] = await sql<{ started: string }>(`select now()::text as started`);
  // Admin account (granted via SQL exactly as documented for the first admin).
  const adminEmail = uniqueEmail("admin");
  const adminPage = await (await browser.newContext()).newPage();
  await signUp(adminPage, adminEmail, { next: "/dashboard" });
  await expect(adminPage).toHaveURL(/\/dashboard/);
  await sql(`select public.grant_admin_by_email($1)`, [adminEmail]);

  const [quote] = await sql<{ id: string; batch_id: string }>(
    `select id, batch_id from public.dealer_quotations where status = 'submitted' and is_demo order by created_at limit 1`,
  );
  test.skip(!quote, "No submitted demo quotation in seed data");

  // A verified participant of that batch (seeded demo account, given a password for the test).
  const [participant] = await sql<{ user_id: string; email: string }>(
    `select m.user_id, p.email from public.batch_memberships m join public.profiles p on p.id = m.user_id
     where m.batch_id = $1 and m.eligibility = 'verified' and m.status = 'active' limit 1`,
    [quote.batch_id],
  );
  await setPassword(participant.user_id);
  const custPage = await (await browser.newContext()).newPage();
  await logIn(custPage, participant.email, undefined, `/dashboard/groups/${quote.batch_id}`);
  await expect(custPage.getByRole("heading", { name: "Dealer quotations" })).toBeVisible();
  const before = await custPage.locator("text=Dealer-confirmed quotation").count();

  await adminPage.goto(`/admin/quotations/${quote.id}`);
  await adminPage.getByRole("button", { name: "Approve" }).click();
  await adminPage.getByRole("dialog").getByRole("button", { name: "Confirm" }).click();
  await expect(adminPage.getByRole("button", { name: "Publish" })).toBeVisible();
  // Approved but unpublished: still hidden from the participant.
  await custPage.reload();
  await expect(custPage.locator("text=Dealer-confirmed quotation")).toHaveCount(before);

  await adminPage.getByRole("button", { name: "Publish" }).click();
  await adminPage.getByRole("dialog").getByRole("button", { name: "Confirm" }).click();
  await expect(adminPage.getByText("Published to verified participants.")).toBeVisible();

  await custPage.reload();
  await expect(custPage.locator("text=Dealer-confirmed quotation")).toHaveCount(before + 1);

  const [audit] = await sql<{ n: number }>(
    `select count(*)::int as n from public.audit_logs where entity_id = $1 and action in ('quotation.approve', 'quotation.publish') and created_at >= $2::timestamptz`,
    [quote.id, started],
  );
  expect(audit.n).toBe(2);
});

test("dealer users only see their own dealership's requests", async ({ page }) => {
  const email = uniqueEmail("dealer");
  await signUp(page, email, { next: "/dashboard" });
  await expect(page).toHaveURL(/\/dashboard/);
  const [dealer] = await sql<{ id: string }>(`select id from public.dealers where slug = 'demo-motors-surat'`);
  const [other] = await sql<{ id: string; name: string }>(`select id, name from public.dealers where slug = 'sample-auto-hub'`);
  await sql(
    `insert into public.dealer_users (dealer_id, user_id) select $1, id from public.profiles where email = $2`,
    [dealer.id, email],
  );
  await sql(`insert into public.user_roles (user_id, role) select id, 'dealer' from public.profiles where email = $1 on conflict do nothing`, [email]);

  await page.goto("/dealer/requests");
  await expect(page.getByRole("heading", { name: "Quotation requests" })).toBeVisible();
  const [otherQuote] = await sql<{ id: string }>(`select id from public.dealer_quotations where dealer_id = $1 limit 1`, [other.id]);
  if (otherQuote) {
    const res = await page.goto(`/dealer/quotations/${otherQuote.id}`);
    expect(res?.status()).toBe(404);
  }
  const res = await page.goto("/admin");
  expect(res?.status()).toBe(404);
});
