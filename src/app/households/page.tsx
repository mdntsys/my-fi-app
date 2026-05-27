import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createHousehold } from "./actions";
import SharedHeader from "@/components/SharedHeader";

export const dynamic = "force-dynamic";

export default async function HouseholdsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: households } = await supabase
    .from("households")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <SharedHeader />
      <main className="flex flex-1 flex-col px-6 py-10">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight">Households</h1>

          <section className="mt-8">
            <h2 className="text-lg font-semibold">Your households</h2>
            <div className="mt-3">
              {households && households.length > 0 ? (
                <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
                  {households.map((h) => (
                    <li
                      key={h.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <span className="text-sm font-medium text-ink">
                        {h.name}
                      </span>
                      <Link
                        href={`/households/${h.id}`}
                        className="text-sm text-primary hover:text-primary-hover"
                      >
                        Manage →
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-muted">
                  No households yet. Create one below.
                </p>
              )}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold">Create a household</h2>
            <form
              action={createHousehold}
              className="mt-3 flex gap-2 rounded-2xl border border-line bg-surface p-4"
            >
              <input
                name="name"
                required
                placeholder="The Perez Household"
                className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
              />
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover"
              >
                Create
              </button>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
