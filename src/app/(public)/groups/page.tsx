import { Users } from "lucide-react";
import type { Metadata } from "next";
import { BatchCard } from "@/components/catalogue/batch-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SetupNotice } from "@/components/shared/setup-notice";
import { listPublicBatches } from "@/lib/data/catalogue";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Active buyer groups",
  description: "All active vehicle buyer groups in Surat, with verified participant counts and closing dates.",
  alternates: { canonical: "/groups" },
};

export default async function GroupsPage() {
  if (!isSupabaseConfigured()) return <div className="container-page py-12"><SetupNotice /></div>;
  const batches = await listPublicBatches({ status: "active" });
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold sm:text-4xl">Active buyer groups</h1>
      <p className="mt-2 text-muted-foreground">Open groups and groups currently in the dealer quotation stage.</p>
      {batches.length ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((b) => (
            <BatchCard key={b.id} batch={b} />
          ))}
        </div>
      ) : (
        <EmptyState className="mt-8" icon={Users} title="No active groups" description="New groups are added regularly." />
      )}
    </div>
  );
}
