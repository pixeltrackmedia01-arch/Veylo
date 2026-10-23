import Link from "next/link";
import { LEAD_COPY } from "@/components/cars/lead-dialog";
import { ActionButton } from "@/components/shared/action-button";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { setLeadStatusAction } from "@/lib/actions/admin-ops";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Lead, LeadStatus } from "@/lib/types";

const STATUSES: LeadStatus[] = ["new", "contacted", "converted", "closed"];

type LeadRow = Lead & {
  vehicle: { model_name: string; slug: string; manufacturer: { name: string } } | null;
  variant: { name: string } | null;
};

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select("*, vehicle:vehicles(model_name, slug, manufacturer:manufacturers(name)), variant:vehicle_variants(name)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (status && STATUSES.includes(status as LeadStatus)) query = query.eq("status", status);
  const { data } = await query;
  const leads = (data ?? []) as LeadRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="On-road price, test drive, call-back, loan, insurance and best-price requests from car pages. Call within one working day."
      />
      <div className="flex flex-wrap gap-2 text-sm">
        {[undefined, ...STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/admin/leads?status=${s}` : "/admin/leads"}
            className={`rounded-full border px-3 py-1.5 capitalize ${status === s || (!status && !s) ? "border-primary bg-primary text-white" : "bg-white hover:border-primary"}`}
          >
            {s ?? "All"}
          </Link>
        ))}
      </div>
      <ul className="space-y-3">
        {leads.map((l) => (
          <li key={l.id} className="rounded-2xl border bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-ink">
                {LEAD_COPY[l.kind]?.cta ?? l.kind}
                {l.vehicle ? (
                  <>
                    {" · "}
                    <Link href={`/cars/${l.vehicle.slug}`} className="text-primary hover:underline">
                      {l.vehicle.manufacturer.name} {l.vehicle.model_name}
                      {l.variant ? ` ${l.variant.name}` : ""}
                    </Link>
                  </>
                ) : null}
              </p>
              <StatusBadge
                status={l.status === "closed" ? "inactive" : l.status === "new" ? "new" : l.status === "converted" ? "verified" : "submitted"}
                label={l.status}
              />
            </div>
            <p className="mt-1 text-sm text-ink">
              {l.name} ·{" "}
              <a href={`tel:+91${l.phone}`} className="font-semibold text-primary">
                +91 {l.phone}
              </a>
              {l.email ? ` · ${l.email}` : ""}
              {l.city ? ` · ${l.city}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">{formatDateTime(l.created_at)}</p>
            {l.message ? <p className="mt-3 text-sm whitespace-pre-line">{l.message}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {STATUSES.filter((s) => s !== l.status).map((s) => (
                <ActionButton key={s} size="sm" variant={s === "closed" ? "ghost" : "outline"} action={setLeadStatusAction.bind(null, l.id, s)}>
                  Mark {s}
                </ActionButton>
              ))}
            </div>
          </li>
        ))}
        {!leads.length ? <li className="text-sm text-muted-foreground">No leads yet.</li> : null}
      </ul>
    </div>
  );
}
