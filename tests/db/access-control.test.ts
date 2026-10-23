import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asUser,
  createBatch,
  createCatalogue,
  createDealer,
  createTestDb,
  createUser,
  expectDbError,
  fillBatch,
  linkDealerUser,
  makeAdmin,
  type Catalogue,
  type TestDb,
} from "./helpers";

let db: TestDb;

interface World {
  cat: Catalogue;
  batch: string;
  participants: string[];
  outsider: string;
  admin: string;
  dealerA: string;
  dealerB: string;
  dealerUserA: string;
  dealerUserB: string;
  requestA: string;
  requestB: string;
}

let w: World;

async function q<T = Record<string, unknown>>(pool: Pool, user: string | null, sql: string, params: unknown[] = []) {
  return asUser(pool, user, async (c) => (await c.query(sql, params)).rows as T[]);
}

/** Dealer drafts an itemised quotation and submits it. Returns the quotation id. */
async function dealerSubmitsQuote(pool: Pool, dealerUser: string, requestId: string, exShowroom = 800000) {
  const [quote] = await q<{ id: string }>(pool, dealerUser, `select (public.start_quotation($1)).id as id`, [requestId]);
  await q(pool, dealerUser, `update public.dealer_quotations set valid_until = current_date + 10 where id = $1`, [quote.id]);
  await q(
    pool,
    dealerUser,
    `insert into public.quotation_line_items (quotation_id, category, label, amount, is_included) values
       ($1, 'ex_showroom', 'Ex-showroom', $2, true),
       ($1, 'registration_road_tax', 'RTO', 50000, true),
       ($1, 'insurance', 'Insurance', 30000, true),
       ($1, 'accessories', 'Optional kit', 10000, false),
       ($1, 'discount', 'Group discount', 5000, true)`,
    [quote.id, exShowroom],
  );
  await q(pool, dealerUser, `select public.submit_quotation($1)`, [quote.id]);
  return quote.id;
}

beforeAll(async () => {
  db = await createTestDb();
  const cat = await createCatalogue(db.pool);
  const dealerA = await createDealer(db.pool, cat);
  const dealerB = await createDealer(db.pool, cat);
  const dealerUserA = await createUser(db.pool);
  const dealerUserB = await createUser(db.pool);
  await linkDealerUser(db.pool, dealerA, dealerUserA);
  await linkDealerUser(db.pool, dealerB, dealerUserB);
  const admin = await createUser(db.pool);
  await makeAdmin(db.pool, admin);
  const outsider = await createUser(db.pool);

  const batch = await createBatch(db.pool, cat, { target: 3, minimum: 2 });
  const participants = await fillBatch(db.pool, batch, 3); // closes & requests quotes automatically
  const requests = await db.pool.query(`select id, dealer_id from public.quotation_requests where batch_id = $1`, [batch]);
  const requestA = requests.rows.find((r) => r.dealer_id === dealerA).id;
  const requestB = requests.rows.find((r) => r.dealer_id === dealerB).id;

  w = { cat, batch, participants, outsider, admin, dealerA, dealerB, dealerUserA, dealerUserB, requestA, requestB };
}, 60_000);

afterAll(async () => {
  await db?.drop();
});

describe("quotation visibility", () => {
  it("computes totals from line items on the server", async () => {
    const quoteId = await dealerSubmitsQuote(db.pool, w.dealerUserA, w.requestA);
    const { rows } = await db.pool.query(`select total_payable, total_discount, status from public.dealer_quotations where id = $1`, [quoteId]);
    expect(Number(rows[0].total_payable)).toBe(800000 + 50000 + 30000 - 5000);
    expect(Number(rows[0].total_discount)).toBe(5000);
    expect(rows[0].status).toBe("submitted");
  });

  it("shows customers only approved-and-published quotations", async () => {
    const [quote] = await q<{ id: string }>(db.pool, w.admin,
      `select id from public.dealer_quotations where dealer_id = $1`, [w.dealerA]);
    const participant = w.participants[0];

    // Submitted: invisible to participants.
    expect(await q(db.pool, participant, `select id from public.dealer_quotations`)).toHaveLength(0);
    expect(await q(db.pool, participant, `select id from public.quotation_line_items`)).toHaveLength(0);

    await q(db.pool, w.admin, `select public.admin_review_quotation($1, 'approve', 'Checked against brochure')`, [quote.id]);
    // Approved but not published: still invisible.
    expect(await q(db.pool, participant, `select id from public.dealer_quotations`)).toHaveLength(0);

    await q(db.pool, w.admin, `select public.admin_review_quotation($1, 'publish')`, [quote.id]);
    const visible = await q<{ id: string }>(db.pool, participant, `select id from public.dealer_quotations`);
    expect(visible.map((r) => r.id)).toEqual([quote.id]);
    expect(await q(db.pool, participant, `select id from public.quotation_line_items`)).toHaveLength(5);

    // Non-participants and anonymous visitors never see quotations.
    expect(await q(db.pool, w.outsider, `select id from public.dealer_quotations`)).toHaveLength(0);
    await expectDbError(q(db.pool, null, `select id from public.dealer_quotations`), "permission denied");
  });

  it("keeps draft quotations hidden from participants", async () => {
    const [draft] = await q<{ id: string }>(db.pool, w.dealerUserB, `select (public.start_quotation($1)).id as id`, [w.requestB]);
    const rows = await q<{ id: string }>(db.pool, w.participants[1], `select id from public.dealer_quotations where id = $1`, [draft.id]);
    expect(rows).toHaveLength(0);
  });

  it("prevents dealers from approving or publishing their own quotations", async () => {
    const [own] = await q<{ id: string }>(db.pool, w.dealerUserB, `select id from public.dealer_quotations where dealer_id = $1`, [w.dealerB]);
    await expectDbError(
      q(db.pool, w.dealerUserB, `select public.admin_review_quotation($1, 'approve')`, [own.id]),
      "forbidden",
    );
    await expectDbError(
      q(db.pool, w.dealerUserB, `update public.dealer_quotations set status = 'published' where id = $1`, [own.id]),
      "permission denied",
    );
    await expectDbError(
      q(db.pool, w.dealerUserB, `update public.dealer_quotations set total_payable = 1 where id = $1`, [own.id]),
      "permission denied",
    );
  });

  it("locks line items once a quotation is published", async () => {
    const [published] = await q<{ id: string }>(db.pool, w.admin,
      `select id from public.dealer_quotations where status = 'published'`);
    // RLS hides locked rows from the update entirely, so nothing changes.
    const changed = await asUser(db.pool, w.dealerUserA, async (c) =>
      (await c.query(`update public.quotation_line_items set amount = 1 where quotation_id = $1`, [published.id])).rowCount,
    );
    expect(changed).toBe(0);
    await expectDbError(
      q(db.pool, w.dealerUserA,
        `insert into public.quotation_line_items (quotation_id, category, label, amount) values ($1, 'other_charge', 'x', 1)`,
        [published.id]),
      "quotation_locked",
    );
    const { rows } = await db.pool.query(`select min(amount) as m from public.quotation_line_items where quotation_id = $1`, [published.id]);
    expect(Number(rows[0].m)).toBeGreaterThan(1);
  });
});

describe("customer privacy", () => {
  it("prevents customers from reading other customers' profiles, memberships and notifications", async () => {
    const [me, other] = w.participants;
    const profiles = await q<{ id: string }>(db.pool, me, `select id from public.profiles`);
    expect(profiles.map((p) => p.id)).toEqual([me]);
    const memberships = await q<{ user_id: string }>(db.pool, me, `select user_id from public.batch_memberships`);
    expect(new Set(memberships.map((m) => m.user_id))).toEqual(new Set([me]));
    const notes = await q<{ user_id: string }>(db.pool, me, `select user_id from public.notifications`);
    expect(notes.every((n) => n.user_id === me)).toBe(true);
    expect(await q(db.pool, me, `select id from public.profiles where id = $1`, [other])).toHaveLength(0);
  });

  it("exposes no participant data to anonymous visitors", async () => {
    await expectDbError(q(db.pool, null, `select * from public.batch_memberships`), "permission denied");
    await expectDbError(q(db.pool, null, `select * from public.profiles`), "permission denied");
    const batches = await q<Record<string, unknown>>(db.pool, null, `select * from public.batches where id = $1`, [w.batch]);
    expect(batches).toHaveLength(1);
    expect(batches[0].verified_participant_count).toBe(3);
  });

  it("only shares contact details a customer sends with an enquiry, and only with that dealer", async () => {
    const [published] = await q<{ id: string }>(db.pool, w.admin, `select id from public.dealer_quotations where status = 'published'`);
    const [enquiry] = await q<{ id: string }>(db.pool, w.participants[0],
      `select (public.create_enquiry($1, 'Please call me', true)).id as id`, [published.id]);

    const seenByA = await q(db.pool, w.dealerUserA, `select id, customer_phone from public.dealer_enquiries`);
    expect(seenByA).toHaveLength(1);
    expect(await q(db.pool, w.dealerUserB, `select id from public.dealer_enquiries`)).toHaveLength(0);
    expect(await q(db.pool, w.participants[1], `select id from public.dealer_enquiries`)).toHaveLength(0);
    // Dealers never read profiles directly.
    expect(await q(db.pool, w.dealerUserA, `select id from public.profiles where id = $1`, [w.participants[0]])).toHaveLength(0);
    expect(enquiry.id).toBeTruthy();
  });

  it("does not let non-participants enquire on a quotation", async () => {
    const [published] = await q<{ id: string }>(db.pool, w.admin, `select id from public.dealer_quotations where status = 'published'`);
    await expectDbError(
      q(db.pool, w.outsider, `select public.create_enquiry($1, null, true)`, [published.id]),
      "not_a_verified_participant",
    );
  });
});

describe("dealer isolation", () => {
  it("prevents dealers from reading other dealerships' requests and quotations", async () => {
    const reqs = await q<{ dealer_id: string }>(db.pool, w.dealerUserB, `select dealer_id from public.quotation_requests`);
    expect(reqs.every((r) => r.dealer_id === w.dealerB)).toBe(true);
    const quotes = await q<{ dealer_id: string }>(db.pool, w.dealerUserB, `select dealer_id from public.dealer_quotations`);
    expect(quotes.every((r) => r.dealer_id === w.dealerB)).toBe(true);
    await expectDbError(
      q(db.pool, w.dealerUserB, `select public.start_quotation($1)`, [w.requestA]),
      "forbidden",
    );
  });
});

describe("sales and commissions", () => {
  let saleId: string;
  let enquiryId: string;

  it("lets the dealer record a booking and claim a sale", async () => {
    const [enq] = await q<{ id: string }>(db.pool, w.admin, `select id from public.dealer_enquiries limit 1`);
    enquiryId = enq.id;
    await q(db.pool, w.dealerUserA, `select public.record_booking($1, current_date, 'BK-1')`, [enquiryId]);
    const [sale] = await q<{ id: string }>(db.pool, w.dealerUserA,
      `select (public.submit_sale_claim($1, current_date, 'INV-1', 'SALE-1', array[$2::text])).id as id`, [enquiryId, `${enquiryId}/invoice.pdf`]);
    saleId = sale.id;
    const [row] = await q<{ status: string; claimed_by_role: string }>(db.pool, w.admin,
      `select status, claimed_by_role from public.sale_verifications where id = $1`, [saleId]);
    expect(row).toEqual({ status: "claimed", claimed_by_role: "dealer" });
  });

  it("rejects evidence paths outside the sale's own folder", async () => {
    await expectDbError(
      q(db.pool, w.dealerUserA, `select public.submit_sale_claim($1, current_date, null, null, array['../other/x.pdf'])`, [enquiryId]),
      "invalid_evidence_path",
    );
  });

  it("does not let dealers verify their own sales", async () => {
    await expectDbError(q(db.pool, w.dealerUserA, `select public.admin_review_sale($1, 'verify')`, [saleId]), "forbidden");
    await expectDbError(
      q(db.pool, w.dealerUserA, `update public.sale_verifications set status = 'verified' where id = $1`, [saleId]),
      "permission denied",
    );
  });

  it("does not let an admin who belongs to the dealership verify its sale", async () => {
    const conflicted = await createUser(db.pool);
    await makeAdmin(db.pool, conflicted);
    await linkDealerUser(db.pool, w.dealerA, conflicted);
    await expectDbError(q(db.pool, conflicted, `select public.admin_review_sale($1, 'verify')`, [saleId]), "conflict_of_interest");
  });

  it("does not let customers verify sales", async () => {
    await expectDbError(q(db.pool, w.participants[0], `select public.admin_review_sale($1, 'verify')`, [saleId]), "forbidden");
  });

  it("creates a commission from the configured agreement when an admin verifies the sale", async () => {
    // General agreement and a more specific dealer agreement: the dealer one must win.
    await db.pool.query(
      `insert into public.commission_agreements (name, calc_type, fixed_amount, effective_from, status)
       values ('General fixed', 'fixed', 1000, current_date - 30, 'active')`,
    );
    await db.pool.query(
      `insert into public.commission_agreements (name, dealer_id, calc_type, percentage, basis_label, cap_amount, effective_from, status)
       values ('Dealer A percentage', $1, 'percentage', 0.75, 'Ex-showroom on invoice', 50000, current_date - 30, 'active')`,
      [w.dealerA],
    );
    // An expired dealer agreement must be ignored.
    await db.pool.query(
      `insert into public.commission_agreements (name, dealer_id, calc_type, fixed_amount, effective_from, effective_to, status)
       values ('Old', $1, 'fixed', 99999, current_date - 400, current_date - 200, 'active')`,
      [w.dealerA],
    );

    const [res] = await q<{ r: { status: string; commission_id: string | null; commission_error: string | null } }>(
      db.pool, w.admin, `select public.admin_review_sale($1, 'verify', 'Invoice checked', 800000) as r`, [saleId]);
    expect(res.r.status).toBe("verified");
    expect(res.r.commission_error).toBeNull();

    const [commission] = await q<Record<string, string>>(db.pool, w.admin,
      `select calc_type, basis_amount, calculated_amount, final_amount, status from public.commissions where sale_verification_id = $1`, [saleId]);
    expect(commission.calc_type).toBe("percentage");
    expect(Number(commission.basis_amount)).toBe(800000);
    expect(Number(commission.calculated_amount)).toBe(6000); // 0.75% of 8,00,000
    expect(commission.status).toBe("pending");
  });

  it("does not let clients alter commission amounts or mark them paid", async () => {
    const [c] = await q<{ id: string }>(db.pool, w.admin, `select id from public.commissions limit 1`);
    await expectDbError(
      q(db.pool, w.admin, `update public.commissions set calculated_amount = 1 where id = $1`, [c.id]),
      "permission denied",
    );
    await expectDbError(
      q(db.pool, w.dealerUserA, `select public.admin_update_commission($1, 'paid', null, current_date)`, [c.id]),
      "forbidden",
    );
    const dealerView = await q(db.pool, w.dealerUserB, `select id from public.commissions`);
    expect(dealerView).toHaveLength(0);
  });

  it("requires a reason for manual adjustments and audits them", async () => {
    const [c] = await q<{ id: string }>(db.pool, w.admin, `select id from public.commissions limit 1`);
    await expectDbError(q(db.pool, w.admin, `select public.admin_adjust_commission($1, -500, '')`, [c.id]), "reason_required");
    await q(db.pool, w.admin, `select public.admin_adjust_commission($1, -500, 'Agreed goodwill credit')`, [c.id]);
    const [row] = await q<{ final_amount: string }>(db.pool, w.admin, `select final_amount from public.commissions where id = $1`, [c.id]);
    expect(Number(row.final_amount)).toBe(5500);
    const audit = await q(db.pool, w.admin, `select id from public.audit_logs where entity_id = $1 and action = 'commission.adjusted'`, [c.id]);
    expect(audit).toHaveLength(1);
  });

  it("enforces commission status transitions and payment dates", async () => {
    const [c] = await q<{ id: string }>(db.pool, w.admin, `select id from public.commissions limit 1`);
    await expectDbError(q(db.pool, w.admin, `select public.admin_update_commission($1, 'paid')`, [c.id]), "invalid_commission_transition");
    await q(db.pool, w.admin, `select public.admin_update_commission($1, 'invoiced', 'INV-GD-1')`, [c.id]);
    await expectDbError(q(db.pool, w.admin, `select public.admin_update_commission($1, 'paid')`, [c.id]), "payment_date_required");
    await q(db.pool, w.admin, `select public.admin_update_commission($1, 'paid', null, current_date, 'UTR123')`, [c.id]);
    await expectDbError(q(db.pool, w.admin, `select public.admin_update_commission($1, 'pending')`, [c.id]), "invalid_commission_transition");
  });
});

describe("audit log integrity", () => {
  it("is read-only for everyone, including admins", async () => {
    await expectDbError(q(db.pool, w.admin, `delete from public.audit_logs`), "permission denied");
    await expectDbError(
      q(db.pool, w.admin, `insert into public.audit_logs (action, entity_type) values ('fake', 'x')`),
      "permission denied",
    );
    expect(await q(db.pool, w.participants[0], `select id from public.audit_logs`)).toHaveLength(0);
  });
});
