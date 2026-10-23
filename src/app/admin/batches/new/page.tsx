import { BatchForm } from "@/components/admin/batch-forms";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { isoDaysFromNow, isoToISTLocal } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function NewBatchPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: variants }, { data: cities }, { data: settings }] = await Promise.all([
    supabase.from("vehicle_variants").select("id, name, vehicle:vehicles(model_name, status, manufacturer:manufacturers(name))").order("name"),
    supabase.from("cities").select("id, name").eq("is_active", true).order("name"),
    supabase.from("app_settings").select("key, value").in("key", ["batches.default_target", "batches.default_minimum"]),
  ]);
  const setting = (k: string, d: number) => Number(settings?.find((s) => s.key === k)?.value ?? d);
  const options = (variants ?? []).map((v) => {
    const veh = v.vehicle as unknown as { model_name: string; status: string; manufacturer: { name: string } };
    return { id: v.id, label: `${veh.manufacturer.name} ${veh.model_name} ${v.name}${veh.status !== "published" ? " (vehicle not published)" : ""}` };
  }).sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="space-y-6">
      <PageHeader title="New batch" description="Batches are created as drafts and must be opened explicitly. Status and counts are always controlled by the system." />
      <Card>
        <CardContent className="pt-6">
          <BatchForm
            variants={options}
            cities={cities ?? []}
            defaults={{
              variantId: "",
              cityId: cities?.[0]?.id ?? "",
              title: "",
              slug: "",
              deliveryArea: "Surat city and SUDA limits",
              eligibilityRules: "",
              targetParticipants: setting("batches.default_target", 20),
              minimumParticipants: setting("batches.default_minimum", 5),
              deadline: isoToISTLocal(isoDaysFromNow(30)),
              isDemo: false,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
