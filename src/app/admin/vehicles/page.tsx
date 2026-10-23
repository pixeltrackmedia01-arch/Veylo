import { Plus } from "lucide-react";
import Link from "next/link";
import { ManufacturerForm } from "@/components/admin/catalogue-forms";
import { PageHeader } from "@/components/shared/page-header";
import { DemoBadge, StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, NativeSelect } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function AdminVehiclesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("vehicles")
    .select("id, model_name, slug, category, status, is_demo, updated_at, manufacturer:manufacturers(name), variants:vehicle_variants(id)")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (sp.status) query = query.eq("status", sp.status);
  if (sp.q) query = query.ilike("model_name", `%${sp.q.replace(/[%_]/g, "")}%`);
  const [{ data: vehicles }, { data: manufacturers }] = await Promise.all([
    query,
    supabase.from("manufacturers").select("id, name, categories").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicles"
        description="Manage manufacturers, models, variants, verified specifications, images and reference prices."
        actions={<Button asChild><Link href="/admin/vehicles/new"><Plus aria-hidden="true" /> New vehicle</Link></Button>}
      />
      <form className="flex flex-wrap gap-2" method="get">
        <Input name="q" defaultValue={sp.q} placeholder="Search model" className="max-w-xs" aria-label="Search model" />
        <NativeSelect name="status" defaultValue={sp.status ?? ""} className="max-w-48" aria-label="Status">
          <option value="">All statuses</option>
          {["draft", "published", "unpublished", "archived"].map((s) => <option key={s} value={s}>{s}</option>)}
        </NativeSelect>
        <Button type="submit" variant="outline">Filter</Button>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vehicle</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Variants</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(vehicles ?? []).map((v) => (
            <TableRow key={v.id}>
              <TableCell>
                <Link href={`/admin/vehicles/${v.id}`} className="font-semibold text-ink hover:text-primary">
                  {(v.manufacturer as unknown as { name: string } | null)?.name} {v.model_name}
                </Link>
                {v.is_demo ? <DemoBadge className="ml-2" /> : null}
              </TableCell>
              <TableCell>{v.category === "car" ? "Car" : "Two-wheeler"}</TableCell>
              <TableCell>{(v.variants as unknown[]).length}</TableCell>
              <TableCell><StatusBadge status={v.status} /></TableCell>
              <TableCell className="text-muted-foreground">{formatDate(v.updated_at)}</TableCell>
            </TableRow>
          ))}
          {!vehicles?.length ? (
            <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No vehicles found.</TableCell></TableRow>
          ) : null}
        </TableBody>
      </Table>

      <Card>
        <CardHeader>
          <CardTitle>Manufacturers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{(manufacturers ?? []).map((m) => m.name).join(" · ") || "None yet."}</p>
          <ManufacturerForm />
        </CardContent>
      </Card>
    </div>
  );
}
