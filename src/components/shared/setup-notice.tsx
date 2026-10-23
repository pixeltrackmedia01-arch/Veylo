import { Alert } from "@/components/ui/alert";

/** Shown when the app runs without Supabase credentials (e.g. a fresh clone). */
export function SetupNotice() {
  return (
    <Alert variant="warning" title="Supabase is not configured" className="my-6">
      Copy <code>.env.example</code> to <code>.env.local</code>, add your Supabase project URL and anon key, apply the
      migrations in <code>supabase/migrations</code>, and restart the server. See the README for step-by-step setup.
    </Alert>
  );
}
