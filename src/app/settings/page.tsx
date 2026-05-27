import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateDisplayName } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-xl">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-full bg-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-ink-muted hover:text-primary"
          >
            ← Dashboard
          </Link>
        </header>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Profile</h2>
          <form
            action={updateDisplayName}
            className="mt-3 space-y-3 rounded-2xl border border-line bg-surface p-4"
          >
            <div>
              <label className="block text-xs uppercase tracking-wide text-ink-faint">
                Email
              </label>
              <div className="mt-1 text-sm text-ink">
                {profile?.email ?? user.email}
              </div>
            </div>
            <div>
              <label
                htmlFor="display_name"
                className="block text-xs uppercase tracking-wide text-ink-faint"
              >
                Display name
              </label>
              <input
                id="display_name"
                name="display_name"
                defaultValue={profile?.display_name ?? ""}
                placeholder="What other household members see"
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover"
            >
              Save
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
