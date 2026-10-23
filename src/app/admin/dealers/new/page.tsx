import { DealerForm } from "@/components/admin/dealer-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function NewDealerPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: cities }, { data: manufacturers }] = await Promise.all([
    supabase.from("cities").select("id, name").order("name"),
    supabase.from("manufacturers").select("id, name").order("name"),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Add dealer" description="New dealers start with pending authorisation. Verify their brand authorisation documents before marking them verified." />
      <Card>
        <CardContent className="pt-6">
          <DealerForm id={null} cities={cities ?? []} manufacturers={manufacturers ?? []} defaults={{ name: "", slug: "", branchAddress: "", cityId: cities?.[0]?.id ?? "", contactPerson: "", businessEmail: "", businessPhone: "", manufacturerIds: [], isActive: true, isDemo: false, internalNotes: "" }} />
        </CardContent>
      </Card>
    </div>
  );
}
