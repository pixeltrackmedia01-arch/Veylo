import { FaqForm, ContentPageForm, SettingForm } from "@/components/admin/content-forms";
import { ActionButton } from "@/components/shared/action-button";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_PAGES } from "@/content/pages";
import { deleteFaqAction } from "@/lib/actions/admin-ops";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ContentPage, Faq } from "@/lib/types";

const EDITABLE_PAGES = ["about", "privacy", "terms", "disclaimer"];
const SETTINGS = ["contact.public", "home.hero", "verification.require_phone", "batches.default_target", "batches.default_minimum"];

export default async function ContentAdminPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: faqs }, { data: pages }, { data: settings }] = await Promise.all([
    supabase.from("faqs").select("*").order("sort_order"),
    supabase.from("content_pages").select("*"),
    supabase.from("app_settings").select("key, value, description").in("key", SETTINGS),
  ]);
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
              <summary className="cursor-pointer font-medium text-ink">{f.question} {f.is_published ? "" : "(hidden)"}</summary>
              <div className="mt-4 space-y-2">
                <FaqForm id={f.id} initial={{ question: f.question, answer: f.answer, category: f.category, sortOrder: f.sort_order, isPublished: f.is_published }} />
                <ActionButton size="sm" variant="ghost" action={deleteFaqAction.bind(null, f.id)} confirm={{ title: "Delete this FAQ?", destructive: true, confirmLabel: "Delete" }}>Delete</ActionButton>
              </div>
            </details>
          ))}
          <div className="rounded-xl border border-dashed p-4">
            <p className="mb-3 font-semibold text-primary">Add FAQ</p>
            <FaqForm id={null} initial={{ question: "", answer: "", category: "general", sortOrder: 100, isPublished: true }} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
