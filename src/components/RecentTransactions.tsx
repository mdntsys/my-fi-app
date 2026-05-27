import { createClient } from "@/lib/supabase/server";
import { formatUsd, formatDate, titleCase } from "@/lib/format";

export default async function RecentTransactions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, name, merchant_name, amount, date, pending, category_primary, category_override, accounts(name, mask)",
    )
    .order("date", { ascending: false })
    .limit(25);

  if (error) {
    return <p className="text-sm text-danger">Failed to load transactions.</p>;
  }
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No transactions yet. They&apos;ll appear here after the first sync.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
      {data.map((t) => {
        const rawAccount = t.accounts as unknown;
        const accountObj = Array.isArray(rawAccount) ? rawAccount[0] : rawAccount;
        const account = accountObj as { name: string; mask: string | null } | null;
        const category = t.category_override ?? t.category_primary;
        return (
          <li
            key={t.id}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-ink">
                {t.merchant_name ?? t.name}
                {t.pending && (
                  <span className="ml-2 rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-ink">
                    pending
                  </span>
                )}
              </div>
              <div className="text-xs text-ink-muted">
                {formatDate(t.date)}
                {category ? ` · ${titleCase(category)}` : ""}
                {account
                  ? ` · ${account.name}${account.mask ? ` ••${account.mask}` : ""}`
                  : ""}
              </div>
            </div>
            <div
              className={`text-sm font-medium ${
                Number(t.amount) < 0 ? "text-success" : "text-ink"
              }`}
            >
              {formatUsd(t.amount)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
