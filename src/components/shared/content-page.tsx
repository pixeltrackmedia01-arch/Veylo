import { TriangleAlert } from "lucide-react";
import { Markdown } from "@/components/shared/markdown";
import { DEFAULT_PAGES } from "@/content/pages";
import { getContentPage } from "@/lib/data/catalogue";
import { formatDate } from "@/lib/format";

/** Renders an admin-overridable content page, falling back to bundled copy. */
export async function ContentPageView({ slug }: { slug: string }) {
  const fallback = DEFAULT_PAGES[slug];
  const stored = await getContentPage(slug).catch(() => null);
  const page = stored
    ? { title: stored.title, summary: stored.summary, body: stored.body, requiresLegalReview: stored.requires_legal_review, updated: stored.updated_at }
    : { ...fallback, updated: null as string | null };

  return (
    <article className="container-page max-w-3xl py-12 sm:py-16">
      <h1 className="text-3xl font-extrabold sm:text-4xl">{page.title}</h1>
      {page.summary ? <p className="mt-3 text-lg text-muted-foreground">{page.summary}</p> : null}
      {page.updated ? <p className="mt-2 text-xs text-muted-foreground">Last updated {formatDate(page.updated)}</p> : null}
      {page.requiresLegalReview ? (
        <p className="mt-6 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          This page contains business-specific legal text that requires review by a qualified professional before launch.
        </p>
      ) : null}
      <div className="mt-8">
        <Markdown source={page.body} />
      </div>
    </article>
  );
}
