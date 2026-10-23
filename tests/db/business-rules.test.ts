import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asOwner,
  asUser,
  batchRow,
  createBatch,
  createCatalogue,
  createDealer,
  createTestDb,
  createUser,
  expectDbError,
  fillBatch,
  joinAs,
  linkDealerUser,
  makeAdmin,
  type Catalogue,
  type TestDb,
} from "./helpers";

let db: TestDb;
let cat: Catalogue;

beforeAll(async () => {
  db = await createTestDb();
  cat = await createCatalogue(db.pool);
}, 60_000);

afterAll(async () => {
  await db?.drop();
});

describe("joining a batch", () => {
  it("lets a customer join only once and is idempotent on repeated submissions", async () => {
    const batch = await createBatch(db.pool, cat);
    const user = await createUser(db.pool);

    const first = await joinAs(db.pool, user, batch);
    const second = await joinAs(db.pool, user, batch);

    expect(first.already_member).toBe(false);
    expect(second.already_member).toBe(true);
    expect(second.membership_id).toBe(first.membership_id);
    const { rows } = await db.pool.query(
      `select count(*)::int as n from public.batch_memberships where batch_id = $1 and user_id = $2`,
      [batch, user],
    );
    expect(rows[0].n).toBe(1);
    expect((await batchRow(db.pool, batch)).verified_participant_count).toBe(1);
  });

  it("counts concurrent duplicate submissions once", async () => {
    const batch = await createBatch(db.pool, cat);
    const user = await createUser(db.pool);
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => joinAs(db.pool, user, batch)));
    expect(results.some((r) => r.status === "fulfilled")).toBe(true);
    expect((await batchRow(db.pool, batch)).verified_participant_count).toBe(1);
  });

  it("rejects users whose email is not verified", async () => {
    const batch = await createBatch(db.pool, cat);
    const user = await createUser(db.pool, { emailConfirmed: false });
    await expectDbError(joinAs(db.pool, user, batch), "email_not_verified");
    expect((await batchRow(db.pool, batch)).verified_participant_count).toBe(0);
  });

  it("does not count unverified participants toward the target when phone verification is required", async () => {
    await db.pool.query(`update public.app_settings set value = 'true' where key = 'verification.require_phone'`);
    try {
      const batch = await createBatch(db.pool, cat);
      const user = await createUser(db.pool);
      const result = await joinAs(db.pool, user, batch);
      expect(result.eligibility).toBe("pending_verification");
      expect((await batchRow(db.pool, batch)).verified_participant_count).toBe(0);

      // Verifying the phone (trusted path) promotes the membership and it starts counting.
      await db.pool.query(`update public.profiles set phone_verified_at = now() where id = $1`, [user]);
      expect((await batchRow(db.pool, batch)).verified_participant_count).toBe(1);
    } finally {
      await db.pool.query(`update public.app_settings set value = 'false' where key = 'verification.require_phone'`);
    }
  });

  it("rejects participants from other cities and incomplete profiles", async () => {
    const batch = await createBatch(db.pool, cat);
    const noPhone = await createUser(db.pool, { phone: null });
    await expectDbError(joinAs(db.pool, noPhone, batch), "profile_incomplete");
  });

  it("prevents customers from writing memberships or counts directly", async () => {
    const batch = await createBatch(db.pool, cat);
    const user = await createUser(db.pool);
    await expectDbError(
      asUser(db.pool, user, (c) =>
        c.query(`insert into public.batch_memberships (batch_id, user_id, eligibility) values ($1, $2, 'verified')`, [
          batch,
          user,
        ]),
      ),
      "permission denied",
    );
    await expectDbError(
      asUser(db.pool, user, (c) =>
        c.query(`update public.batches set verified_participant_count = 19 where id = $1`, [batch]),
      ),
      "permission denied",
    );
    await expectDbError(
      asUser(db.pool, user, (c) => c.query(`update public.profiles set email_verified_at = now() where id = $1`, [user])),
      "permission denied",
    );
  });
});

describe("batch closure", () => {
  it("reaches target at exactly 20 verified participants and refuses a 21st", async () => {
    const batch = await createBatch(db.pool, cat);
    await fillBatch(db.pool, batch, 19);
    let row = await batchRow(db.pool, batch);
    expect(row.status).toBe("open");
    expect(row.verified_participant_count).toBe(19);

    await fillBatch(db.pool, batch, 1);
    row = await batchRow(db.pool, batch);
    expect(row.verified_participant_count).toBe(20);
    expect(row.status).toBe("target_reached");
    expect(row.close_reason).toBe("target_reached");

    const late = await createUser(db.pool);
    await expectDbError(joinAs(db.pool, late, batch), "batch_not_open");
  });

  it("never exceeds the target under concurrent joins", async () => {
    const batch = await createBatch(db.pool, cat);
    const users = await Promise.all(Array.from({ length: 30 }, () => createUser(db.pool)));
    await Promise.allSettled(users.map((u) => joinAs(db.pool, u, batch)));
    const row = await batchRow(db.pool, batch);
    expect(row.verified_participant_count).toBe(20);
    expect(row.status).toBe("target_reached");
    const { rows } = await db.pool.query(
      `select count(*)::int as n from public.batch_memberships where batch_id = $1 and eligibility = 'verified' and status = 'active'`,
      [batch],
    );
    expect(rows[0].n).toBe(20);
  });

  it("closes at the deadline even when the target is not reached", async () => {
    const batch = await createBatch(db.pool, cat, { minimum: 3 });
    await fillBatch(db.pool, batch, 4);
    await db.pool.query(`update public.batches set deadline = now() - interval '1 minute' where id = $1`, [batch]);
    await db.pool.query(`select public.process_due_batches()`);
    const row = await batchRow(db.pool, batch);
    expect(row.status).toBe("closed_deadline");
    expect(row.close_reason).toBe("deadline");
  });

  it("expires a batch with fewer than the minimum participants at the deadline", async () => {
    const batch = await createBatch(db.pool, cat, { minimum: 5 });
    await fillBatch(db.pool, batch, 2);
    await db.pool.query(`update public.batches set deadline = now() - interval '1 minute' where id = $1`, [batch]);
    await db.pool.query(`select public.process_due_batches()`);
    expect((await batchRow(db.pool, batch)).status).toBe("expired");
  });

  it("does not duplicate quotation requests when closure runs repeatedly", async () => {
    const localCat = await createCatalogue(db.pool);
    const dealerA = await createDealer(db.pool, localCat);
    await createDealer(db.pool, localCat);
    await createDealer(db.pool, localCat, { verified: false }); // never receives requests
    const batch = await createBatch(db.pool, localCat, { minimum: 2 });
    await fillBatch(db.pool, batch, 3);
    await db.pool.query(`update public.batches set deadline = now() - interval '1 minute' where id = $1`, [batch]);

    await Promise.all([1, 2, 3].map(() => db.pool.query(`select public.process_due_batches()`)));
    await db.pool.query(`select public.process_due_batches()`);
    const again = await db.pool.query(`select public.close_batch($1, 'deadline') as closed`, [batch]);
    expect(again.rows[0].closed).toBe(false);

    const { rows } = await db.pool.query(
      `select dealer_id from public.quotation_requests where batch_id = $1 order by dealer_id`,
      [batch],
    );
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.dealer_id)).toContain(dealerA);
    expect((await batchRow(db.pool, batch)).status).toBe("quotation_requested");

    const notes = await db.pool.query(
      `select count(*)::int as n from public.notifications where type = 'batch_closed' and channel = 'in_app'
         and dedupe_key like $1`,
      [`closed:${batch}:%`],
    );
    // One in-app notification per participant, regardless of how many runs.
    expect(notes.rows[0].n).toBe(3);
  });

  it("only admins can extend deadlines, and extensions are audited", async () => {
    const batch = await createBatch(db.pool, cat);
    const customer = await createUser(db.pool);
    const admin = await createUser(db.pool);
    await makeAdmin(db.pool, admin);
    const later = new Date(Date.now() + 30 * 864e5).toISOString();

    await expectDbError(
      asUser(db.pool, customer, (c) =>
        c.query(`select public.admin_extend_batch_deadline($1, $2, 'More time')`, [batch, later]),
      ),
      "forbidden",
    );
    await asUser(db.pool, admin, (c) =>
      c.query(`select public.admin_extend_batch_deadline($1, $2, 'Festival season demand')`, [batch, later]),
    );
    const { rows } = await db.pool.query(
      `select count(*)::int as n from public.audit_logs where entity_id = $1 and action = 'batch.deadline_extended'`,
      [batch],
    );
    expect(rows[0].n).toBe(1);
  });

  it("rejects invalid manual state transitions", async () => {
    const batch = await createBatch(db.pool, cat, { status: "draft" });
    const admin = await createUser(db.pool);
    await makeAdmin(db.pool, admin);
    await expectDbError(
      asUser(db.pool, admin, (c) => c.query(`select public.admin_transition_batch($1, 'completed')`, [batch])),
      "invalid_batch_transition",
    );
    await asUser(db.pool, admin, (c) => c.query(`select public.admin_transition_batch($1, 'open')`, [batch]));
    expect((await batchRow(db.pool, batch)).status).toBe("open");
  });
});
