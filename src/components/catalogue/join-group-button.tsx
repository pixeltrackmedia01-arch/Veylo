"use client";

import { CircleCheck, LoaderCircle, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { joinBatchAction, leaveBatchAction } from "@/lib/actions/customer";

interface Props {
  batchId: string;
  slug: string;
  joinable: boolean;
  signedIn: boolean;
  membership: { status: string; eligibility: string } | null;
  batchOpen: boolean;
}

export function JoinGroupButton({ batchId, slug, joinable, signedIn, membership, batchOpen }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isMember = membership?.status === "active";

  if (!signedIn) {
    return (
      <div className="space-y-2">
        <Button asChild size="lg" className="w-full" disabled={!joinable}>
          <Link href={`/signup?next=${encodeURIComponent(`/groups/${slug}`)}`}>Join this group — free</Link>
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link href={`/login?next=${encodeURIComponent(`/groups/${slug}`)}`}>
            <LogIn aria-hidden="true" /> Already have an account? Log in
          </Link>
        </Button>
      </div>
    );
  }

  if (isMember) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-xl bg-success-soft p-4 text-sm">
          <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
          <div>
            <p className="font-semibold text-ink">You&apos;re in this group</p>
            <p className="text-foreground/75">
              {membership?.eligibility === "verified"
                ? "You count as a verified participant."
                : "Complete your verification to count toward the target."}
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/dashboard/groups/${batchId}`}>Open in my dashboard</Link>
        </Button>
        {batchOpen ? (
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                if (!window.confirm("Leave this group? You can rejoin while it's open.")) return;
                const res = await leaveBatchAction(batchId);
                if (res.ok) toast.success(res.message ?? "Left group");
                else toast.error(res.error);
                router.refresh();
              })
            }
          >
            Leave group
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <Button
      size="lg"
      className="w-full"
      disabled={!joinable || pending}
      onClick={() =>
        startTransition(async () => {
          const res = await joinBatchAction(batchId);
          if (res.ok) toast.success(res.message ?? "Joined");
          else {
            toast.error(res.error);
            if (res.error.includes("profile")) router.push("/dashboard/profile");
          }
          router.refresh();
        })
      }
    >
      {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
      {joinable ? "Join this group — free" : "Not open for joining"}
    </Button>
  );
}
