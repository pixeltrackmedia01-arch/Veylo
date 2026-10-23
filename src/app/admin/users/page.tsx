import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const size = 50;
  const supabase = await createClient();
  let query = supabase.from("profiles").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * size, page * size - 1);
  const q = sp.q?.trim().replace(/[%_,()]/g, "");
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  const { data, count } = await query;
  const users = (data ?? []) as Profile[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / size));
  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Passwords and authentication secrets are never visible here." />
      <form method="get" className="flex gap-2">
        <Input name="q" defaultValue={sp.q} placeholder="Search name, email or phone" className="max-w-sm" aria-label="Search users" />
        <Button type="submit" variant="outline">Search</Button>
      </form>
      <Table>
        <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Verification</TableHead><TableHead>Status</TableHead><TableHead>Joined</TableHead></TableRow></TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell><Link href={`/admin/users/${u.id}`} className="font-semibold text-ink hover:text-primary">{u.full_name ?? "—"}</Link><div className="text-xs text-muted-foreground">{u.email} · {u.phone ?? "no phone"}</div></TableCell>
              <TableCell className="space-x-1 text-xs">
                <StatusBadge status={u.email_verified_at ? "verified" : "pending"} label={u.email_verified_at ? "Email ✓" : "Email pending"} />
                <StatusBadge status={u.phone_verified_at ? "verified" : "draft"} label={u.phone_verified_at ? "Mobile ✓" : "Mobile unverified"} />
              </TableCell>
              <TableCell>{u.is_suspended ? <StatusBadge status="suspended" /> : <StatusBadge status="active" />}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{formatDate(u.created_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pages > 1 ? (
        <div className="flex justify-center gap-2 text-sm">
          {page > 1 ? <Button asChild size="sm" variant="outline"><Link href={`?q=${sp.q ?? ""}&page=${page - 1}`}>Previous</Link></Button> : null}
          <span className="self-center">Page {page} of {pages}</span>
          {page < pages ? <Button asChild size="sm" variant="outline"><Link href={`?q=${sp.q ?? ""}&page=${page + 1}`}>Next</Link></Button> : null}
        </div>
      ) : null}
    </div>
  );
}
