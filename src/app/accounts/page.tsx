import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatUsd, titleCase, formatRelativeTime } from "@/lib/format";
import {
  toggleAccountHousehold,
  disconnectItem,
  syncItemNow,
} from "./actions";
import ReconnectButton from "@/components/ReconnectButton";
import SharedHeader from "@/components/SharedHeader";

export const dynamic = "force-dynamic";

type AccountRow = {
  id: string;
  plaid_item_id: string;
  name: string;
  mask: string | null;
  type: string | null;
  subtype: string | null;
  current_balance: number | null;
};

type ItemRow = {
  id: string;
  institution_name: string | null;
  created_at: string;
};

type SyncStateRow = {
  item_id: string;
  last_synced_at: string | null;
  last_error: string | null;
};

export default async function AccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [itemsRes, accountsRes, syncStateRes, householdsRes, assignmentsRes] =
    await Promise.all([
      supabase
        .from("plaid_items")
        .select("id, institution_name, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("accounts")
        .select(
          "id, plaid_item_id, name, mask, type, subtype, current_balance",
        )
        .order("name", { ascending: true }),
      supabase
        .from("plaid_sync_state")
        .select("item_id, last_synced_at, last_error"),
      supabase.from("households").select("id, name"),
      supabase
        .from("account_household_assignments")
        .select("account_id, household_id"),
    ]);

  const items: ItemRow[] = itemsRes.data ?? [];
  const accounts: AccountRow[] = accountsRes.data ?? [];
  const syncStates: SyncStateRow[] = syncStateRes.data ?? [];
  const households = householdsRes.data ?? [];
  const assignments = assignmentsRes.data ?? [];

  const accountsByItem = new Map<string, AccountRow[]>();
  for (const a of accounts) {
    const arr = accountsByItem.get(a.plaid_item_id) ?? [];
    arr.push(a);
    accountsByItem.set(a.plaid_item_id, arr);
  }

  const syncStateByItem = new Map<string, SyncStateRow>();
  for (const s of syncStates) syncStateByItem.set(s.item_id, s);

  const assignedSet = new Set(
    assignments.map((a) => `${a.account_id}:${a.household_id}`),
  );

  return (
    <>
      <SharedHeader />
      <main className="flex flex-1 flex-col px-6 py-10">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>

          <section className="mt-8">
          {items.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No institutions connected yet. Connect one from the dashboard.
            </p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const itemAccounts = accountsByItem.get(item.id) ?? [];
                const state = syncStateByItem.get(item.id);
                const syncAction = async (): Promise<void> => {
                  "use server";
                  return syncItemNow(item.id);
                };
                const disconnectAction = async (): Promise<void> => {
                  "use server";
                  return disconnectItem(item.id);
                };

                return (
                  <li
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-line bg-surface"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-surface-muted px-4 py-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-ink">
                          {item.institution_name ?? "Unknown institution"}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                          <span>
                            {itemAccounts.length}{" "}
                            {itemAccounts.length === 1 ? "account" : "accounts"}
                          </span>
                          <span>
                            {state?.last_synced_at
                              ? `Synced ${formatRelativeTime(state.last_synced_at)}`
                              : "Not synced yet"}
                          </span>
                          {state?.last_error && (
                            <span className="rounded bg-danger/10 px-2 py-0.5 text-danger">
                              error
                            </span>
                          )}
                        </div>
                        {state?.last_error && (
                          <p
                            className="mt-2 max-w-md truncate text-xs text-danger"
                            title={state.last_error}
                          >
                            {state.last_error}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {state?.last_error ? (
                          <ReconnectButton itemId={item.id} />
                        ) : (
                          <form action={syncAction}>
                            <button
                              type="submit"
                              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-primary hover:text-primary"
                            >
                              Sync now
                            </button>
                          </form>
                        )}
                        <form action={disconnectAction}>
                          <button
                            type="submit"
                            className="text-xs text-danger hover:underline"
                          >
                            Disconnect
                          </button>
                        </form>
                      </div>
                    </div>

                    {itemAccounts.length > 0 ? (
                      <ul className="divide-y divide-line">
                        {itemAccounts.map((a) => (
                          <li key={a.id} className="px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-ink">
                                  {a.name}
                                  {a.mask ? (
                                    <span className="ml-2 text-xs text-ink-faint">
                                      ••{a.mask}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="text-xs text-ink-muted">
                                  {titleCase(a.subtype ?? a.type ?? "")}
                                </div>
                              </div>
                              <div className="shrink-0 text-sm font-medium text-ink">
                                {formatUsd(a.current_balance)}
                              </div>
                            </div>
                            {households.length > 0 && (
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="text-[10px] uppercase tracking-wide text-ink-faint">
                                  Households
                                </span>
                                {households.map((h) => {
                                  const isAssigned = assignedSet.has(
                                    `${a.id}:${h.id}`,
                                  );
                                  const action = async (
                                    formData: FormData,
                                  ): Promise<void> => {
                                    "use server";
                                    return toggleAccountHousehold(
                                      a.id,
                                      h.id,
                                      formData,
                                    );
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
                                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
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
                        ))}
                      </ul>
                    ) : (
                      <p className="px-4 py-3 text-xs text-ink-muted">
                        No accounts in this institution yet — try syncing.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          </section>
        </div>
      </main>
    </>
  );
}
