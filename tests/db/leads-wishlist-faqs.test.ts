import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, createCatalogue, createTestDb, createUser, expectDbError, makeAdmin, type Catalogue, type TestDb } from "./helpers";

let db: TestDb;
let cat: Catalogue;

beforeAll(async () => {
  db = await createTestDb();
  cat = await createCatalogue(db.pool);
}, 60_000);

afterAll(async () => {
  await db?.drop();
});

const lead = (phone: string, extra: { vehicle?: string; variant?: string } = {}) =>
  `select public.submit_lead('on_road_price', 'Asha Patel', '${phone}', 'Surat', ${extra.vehicle ? `'${extra.vehicle}'` : "null"}, ${extra.variant ? `'${extra.variant}'` : "null"}, null, null) as id`;

describe("leads", () => {
  it("lets anonymous visitors submit a lead and normalises the number", async () => {
    const { rows } = await asUser(db.pool, null, (c) => c.query(lead("+91 98250-11111", { vehicle: cat.vehicleId, variant: cat.variantId })));
    const stored = await db.pool.query(`select phone, kind, vehicle_id from public.leads where id = $1`, [rows[0].id]);
    expect(stored.rows[0]).toMatchObject({ phone: "9825011111", kind: "on_road_price", vehicle_id: cat.vehicleId });
  });

  it("rejects invalid numbers and mismatched variants", async () => {
    await expectDbError(asUser(db.pool, null, (c) => c.query(lead("12345"))), "invalid_phone");
    const other = await createCatalogue(db.pool);
    await expectDbError(
      asUser(db.pool, null, (c) => c.query(lead("9825022222", { vehicle: cat.vehicleId, variant: other.variantId }))),
      "invalid_variant",
    );
  });

  it("rate-limits repeated submissions from one number", async () => {
    for (let i = 0; i < 6; i++) await asUser(db.pool, null, (c) => c.query(lead("9825033333")));
    await expectDbError(asUser(db.pool, null, (c) => c.query(lead("9825033333"))), "rate_limited");
  });

  it("only admins can read or update leads; nobody inserts directly", async () => {
    const customer = await createUser(db.pool);
    const admin = await createUser(db.pool);
    await makeAdmin(db.pool, admin);
    const visible = await asUser(db.pool, customer, (c) => c.query(`select count(*)::int as n from public.leads`));
    expect(visible.rows[0].n).toBe(0);
    const adminView = await asUser(db.pool, admin, (c) => c.query(`select count(*)::int as n from public.leads`));
    expect(adminView.rows[0].n).toBeGreaterThan(0);
    await expectDbError(
      asUser(db.pool, customer, (c) => c.query(`insert into public.leads (kind, name, phone) values ('callback', 'X Y', '9825044444')`)),
      "permission denied",
    );
  });
});

describe("saved vehicles", () => {
  it("users see and change only their own saved cars", async () => {
    const a = await createUser(db.pool);
    const b = await createUser(db.pool);
    await asUser(db.pool, a, (c) => c.query(`insert into public.saved_vehicles (user_id, vehicle_id) values ($1, $2)`, [a, cat.vehicleId]));
    const seenByB = await asUser(db.pool, b, (c) => c.query(`select count(*)::int as n from public.saved_vehicles`));
    expect(seenByB.rows[0].n).toBe(0);
    await expectDbError(
      asUser(db.pool, b, (c) => c.query(`insert into public.saved_vehicles (user_id, vehicle_id) values ($1, $2)`, [a, cat.vehicleId])),
      "row-level security",
    );
  });
});

describe("FAQ feedback", () => {
  it("counts one vote per question per browser per day", async () => {
    const { rows } = await db.pool.query(
      `insert into public.faqs (question, answer, category, slug) values ('Test question?', 'Test answer.', 'joining', 'test-q') returning id`,
    );
    const id = rows[0].id;
    for (let i = 0; i < 3; i++) await asUser(db.pool, null, (c) => c.query(`select public.faq_feedback($1, true, 'browser-1')`, [id]));
    await asUser(db.pool, null, (c) => c.query(`select public.faq_feedback($1, false, 'browser-2')`, [id]));
    const counts = await db.pool.query(`select helpful_count, not_helpful_count from public.faqs where id = $1`, [id]);
    expect(counts.rows[0]).toEqual({ helpful_count: 1, not_helpful_count: 1 });
  });
});

describe("contact messages", () => {
  const send = (email: string) =>
    `select public.submit_contact_message('Asha Patel', '${email}', null, 'Question about groups', 'How do groups close? Thanks.') as id`;

  it("lets visitors send a message without the service-role key, rate-limited per email", async () => {
    await asUser(db.pool, null, (c) => c.query(send("Visitor@Example.test")));
    const stored = await db.pool.query(`select email from public.contact_messages where email = 'visitor@example.test'`);
    expect(stored.rows).toHaveLength(1);
    for (let i = 0; i < 4; i++) await asUser(db.pool, null, (c) => c.query(send("visitor@example.test")));
    await expectDbError(asUser(db.pool, null, (c) => c.query(send("visitor@example.test"))), "rate_limited");
    await expectDbError(asUser(db.pool, null, (c) => c.query(send("not-an-email"))), "invalid_email");
  });

  it("visitors still cannot read or insert messages directly", async () => {
    const visible = await asUser(db.pool, null, (c) => c.query(`select count(*)::int as n from public.contact_messages`).catch(() => ({ rows: [{ n: 0 }] })));
    expect(visible.rows[0].n).toBe(0);
    await expectDbError(
      asUser(db.pool, null, (c) =>
        c.query(`insert into public.contact_messages (name, email, subject, message) values ('X Y', 'x@y.co', 'Subject', 'Message body here')`),
      ),
      "permission denied",
    );
  });
});
