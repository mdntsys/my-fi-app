import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatUsd, titleCase } from "@/lib/format";
import { toggleAccountHousehold, disconnectItem } from "./actions";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [accountsRes, householdsRes, assignmentsRes, itemsRes] =
    await Promise.all([
      supabase
        .from("accounts")
        .select(
          "id, name, mask, type, subtype, current_balance, plaid_item_id, plaid_items(id, institution_name)",
        )
        .order("updated_at", { ascending: false }),
      supabase.from("households").select("id, name"),
      supabase
        .from("account_household_assignments")
        .select("account_id, household_id"),
      supabase
        .from("plaid_items")
        .select("id, institution_name")
        .eq("user_id", user.id),
    ]);

  const accounts = accountsRes.data ?? [];
  const households = householdsRes.data ?? [];
  const assignments = assignmentsRes.data ?? [];
  const items = itemsRes.data ?? [];

  const assignedSet = new Set(
    assignments.map((a) => `${a.account_id}:${a.household_id}`),
  );

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-full bg-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-ink-muted hover:text-primary"
          >
            ← Dashboard
          </Link>
        </header>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Connected institutions</h2>
          {items.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">
              No institutions yet. Connect one from the dashboard.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
              {items.map((it) => {
                const disconnectAction = async (): Promise<void> => {
                  "use server";
                  return disconnectItem(it.id);
                };
                return (
                  <li
                    key={it.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <span className="text-sm font-medium text-ink">
                      {it.institution_name ?? "Unknown institution"}
                    </span>
                    <form action={disconnectAction}>
                      <button
                        type="submit"
                        className="text-xs text-danger hover:underline"
                      >
                        Disconnect
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Accounts</h2>
          {accounts.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">
              No accounts yet. Connect a bank from the dashboard.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {accounts.map((a) => {
                const rawInst = a.plaid_items as unknown;
                const instObj = Array.isArray(rawInst) ? rawInst[0] : rawInst;
                const inst = instObj as { institution_name: string | null } | null;
                return (
                  <li
                    key={a.id}
                    className="rounded-2xl border border-line bg-surface px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-ink">
                          {a.name}
                          {a.mask ? (
                            <span className="ml-2 text-xs text-ink-faint">
                              ••{a.mask}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-ink-muted">
                          {inst?.institution_name ?? "Unknown"} ·{" "}
                          {titleCase(a.subtype ?? a.type ?? "")}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-ink">
                        {formatUsd(a.current_balance)}
                      </div>
                    </div>
                    {households.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                        <span className="text-xs uppercase tracking-wide text-ink-faint">
                          Households
                        </span>
                        {households.map((h) => {
                          const isAssigned = assignedSet.has(`${a.id}:${h.id}`);
                          const action = async (
                            formData: FormData,
                          ): Promise<void> => {
                            "use server";
                            return toggleAccountHousehold(a.id, h.id, formData);
                          };
                          return (
                            <form key={h.id} action={action}>
                              <input
                                type="hidden"
                                name="assigned"
                                value={isAssigned ? "false" : "true"}
                              />
                              <button
                                type="submit"
                                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                                  isAssigned
                                    ? "border-primary bg-primary-soft text-ink"
                                    : "border-line bg-surface text-ink-muted hover:border-primary hover:text-primary"
                                }`}
                              >
                                {h.name}
                              </button>
                            </form>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
