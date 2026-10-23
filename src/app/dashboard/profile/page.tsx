import { CircleCheck, CircleDashed } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth/session";
import { getActiveCities } from "@/lib/data/catalogue";
import { formatDate } from "@/lib/format";
import { PhoneVerification } from "./phone-verification";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const viewer = await requireViewer("/dashboard/profile");
  const cities = await getActiveCities();
  const p = viewer.profile;
  const otpEnabled = process.env.NEXT_PUBLIC_PHONE_OTP_ENABLED === "true";

  return (
    <div className="space-y-6">
      <PageHeader title="Profile & settings" description="We only collect what's needed to run your groups." />
      <Card>
        <CardHeader>
          <CardTitle>Verification</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-2">
            {p?.email_verified_at ? <CircleCheck className="size-5 text-success" aria-hidden="true" /> : <CircleDashed className="size-5 text-warning" aria-hidden="true" />}
            <div>
              <p className="font-medium text-ink">Email {p?.email_verified_at ? "verified" : "not verified"}</p>
              <p className="text-sm text-muted-foreground">
                {viewer.email}
                {p?.email_verified_at ? ` · ${formatDate(p.email_verified_at)}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            {p?.phone_verified_at ? <CircleCheck className="size-5 text-success" aria-hidden="true" /> : <CircleDashed className="size-5 text-muted-foreground" aria-hidden="true" />}
            <div className="space-y-2">
              <p className="font-medium text-ink">Mobile {p?.phone_verified_at ? "verified" : "not verified"}</p>
              <p className="text-sm text-muted-foreground">{p?.phone ?? "No number on file"}</p>
              {!p?.phone_verified_at && p?.phone ? (
                otpEnabled ? (
                  <PhoneVerification phone={p.phone} />
                ) : (
                  <p className="text-xs text-muted-foreground">Mobile OTP verification is not enabled for this deployment.</p>
                )
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            cities={cities.map((c) => ({ id: c.id, name: c.name }))}
            defaults={{
              fullName: p?.full_name ?? "",
              phone: p?.phone ?? "",
              cityId: p?.city_id ?? cities[0]?.id ?? "",
              preferredCategory: p?.preferred_category ?? null,
              purchaseTimeline: p?.purchase_timeline ?? null,
              notifyEmail: p?.notify_email ?? true,
              notifyBatchUpdates: p?.notify_batch_updates ?? true,
              notifyMarketing: p?.notify_marketing ?? false,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
