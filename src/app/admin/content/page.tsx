import { FaqForm, ContentPageForm, SettingForm } from "@/components/admin/content-forms";
import { ActionButton } from "@/components/shared/action-button";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_PAGES } from "@/content/pages";
import { deleteFaqAction } from "@/lib/actions/admin-ops";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ContentPage, Faq } from "@/lib/types";
import { categoryMeta } from "@/components/faq/faq-categories";

const EDITABLE_PAGES = ["about", "privacy", "terms", "disclaimer"];
const SETTINGS = [
  "contact.public",
  "home.hero",
  "home.hero_image",
  "home.ticker",
  "verification.require_phone",
  "batches.default_target",
  "batches.default_minimum",
];

export default async function ContentAdminPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: faqs }, { data: pages }, { data: settings }, { data: vehicleRows }] = await Promise.all([
    supabase.from("faqs").select("*").order("category").order("sort_order"),
    supabase.from("content_pages").select("*"),
    supabase.from("app_settings").select("key, value, description").in("key", SETTINGS),
    supabase.from("vehicles").select("id, model_name, manufacturer:manufacturers(name)").order("model_name"),
  ]);
  const vehicles = ((vehicleRows ?? []) as unknown as { id: string; model_name: string; manufacturer: { name: string } | null }[])
    .map((v) => ({ id: v.id, name: `${v.manufacturer?.name ?? ""} ${v.model_name}`.trim() }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const vehicleName = new Map(vehicles.map((v) => [v.id, v.name]));
  const toForm = (f: Faq) => ({
    question: f.question,
    answer: f.answer,
    category: f.category,
    sortOrder: f.sort_order,
    isPublished: f.is_published,
    featured: f.featured,
    vehicleId: f.vehicle_id ?? "",
    slug: f.slug ?? "",
  });
  return (
    <div className="space-y-6">
      <PageHeader title="Content & settings" description="Edit FAQs, homepage copy, legal pages and contact details. Changes are audited." />
      <Card>
        <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          {SETTINGS.map((k) => {
            const s = settings?.find((x) => x.key === k);
            return s ? <SettingForm key={k} settingKey={k} value={s.value} description={s.description} /> : null;
          })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Pages</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {EDITABLE_PAGES.map((slug) => {
            const stored = (pages as ContentPage[] | null)?.find((p) => p.slug === slug);
            const d = DEFAULT_PAGES[slug];
            return (
              <details key={slug} className="rounded-xl border p-4">
                <summary className="cursor-pointer font-semibold text-ink">/{slug} {stored ? "(customised)" : "(default copy)"}</summary>
                <div className="mt-4">
                  <ContentPageForm
                    initial={{
                      slug,
                      title: stored?.title ?? d.title,
                      summary: stored?.summary ?? d.summary,
                      body: stored?.body ?? d.body,
                      requiresLegalReview: stored?.requires_legal_review ?? d.requiresLegalReview,
                      isPublished: stored?.is_published ?? true,
                    }}
                  />
                </div>
              </details>
            );
          })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {((faqs ?? []) as Faq[]).map((f) => (
            <details key={f.id} className="rounded-xl border p-4">
              <summary className="cursor-pointer font-medium text-ink">
                <span className="mr-2 rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">{categoryMeta(f.category).label}</span>
                {f.question}
                {f.is_published ? "" : " (hidden)"}
                {f.featured ? " · home page" : ""}
                {f.vehicle_id ? ` · ${vehicleName.get(f.vehicle_id) ?? "car"}` : ""}
                <span className="ml-2 text-xs text-muted-foreground">👍 {f.helpful_count} · 👎 {f.not_helpful_count}</span>
              </summary>
              <div className="mt-4 space-y-2">
                <FaqForm id={f.id} initial={toForm(f)} vehicles={vehicles} />
                <ActionButton size="sm" variant="ghost" action={deleteFaqAction.bind(null, f.id)} confirm={{ title: "Delete this FAQ?", destructive: true, confirmLabel: "Delete" }}>Delete</ActionButton>
              </div>
            </details>
          ))}
          <div className="rounded-xl border border-dashed p-4">
            <p className="mb-3 font-semibold text-primary">Add FAQ</p>
            <FaqForm
              id={null}
              vehicles={vehicles}
              initial={{ question: "", answer: "", category: "how_it_works", sortOrder: 100, isPublished: true, featured: false, vehicleId: "", slug: "" }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
