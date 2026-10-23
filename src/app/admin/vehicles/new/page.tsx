import { VehicleForm } from "@/components/admin/catalogue-forms";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function NewVehiclePage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: manufacturers } = await supabase.from("manufacturers").select("id, name").order("name");
  return (
    <div className="space-y-6">
      <PageHeader title="New vehicle" description="Vehicles start as drafts. Add variants and publish when the details are verified." />
      <Card>
        <CardContent className="pt-6">
          <VehicleForm
            id={null}
            manufacturers={manufacturers ?? []}
            defaults={{ manufacturerId: "", modelName: "", slug: "", category: "car", bodyType: "", description: "", highlights: "", summary: "", colours: "", warranty: "", popularity: 0, isDemo: false }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
