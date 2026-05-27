import { createClient } from "@/lib/supabase/server";
import { formatUsd, monthBounds, titleCase } from "@/lib/format";

type Row = {
  category: string;
  spent: number;
  budget: number;
};

export default async function MonthSpendByCategory() {
  const supabase = await createClient();
  const { start, end } = monthBounds();

  const [{ data: txs }, { data: budgetRows }] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, category_primary, category_override")
      .gte("date", start)
      .lt("date", end)
      .eq("pending", false),
    supabase.from("budgets").select("category_primary, monthly_limit"),
  ]);

  // Sum budgets across all of the user's households (RLS scopes to those they're members of)
  const budgetByCategory = new Map<string, number>();
  for (const b of budgetRows ?? []) {
    const cat = b.category_primary as string;
    const limit = Number(b.monthly_limit);
    budgetByCategory.set(cat, (budgetByCategory.get(cat) ?? 0) + limit);
  }

  // Sum month spend by effective category
  const spendByCategory = new Map<string, number>();
  for (const t of txs ?? []) {
    const cat =
      (t.category_override as string | null) ??
      (t.category_primary as string | null) ??
      "UNCATEGORIZED";
    const amount = Number(t.amount);
    if (Number.isNaN(amount) || amount <= 0) continue;
    spendByCategory.set(cat, (spendByCategory.get(cat) ?? 0) + amount);
  }

  const allCategories = new Set<string>([
    ...spendByCategory.keys(),
    ...budgetByCategory.keys(),
  ]);

  if (allCategories.size === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No spending or budgets yet for the current month.
      </p>
    );
  }

  const rows: Row[] = [...allCategories].map((cat) => ({
    category: cat,
    spent: spendByCategory.get(cat) ?? 0,
    budget: budgetByCategory.get(cat) ?? 0,
  }));
  rows.sort((a, b) => {
    // Categories with budgets first, then by spent desc
    if ((b.budget > 0 ? 1 : 0) - (a.budget > 0 ? 1 : 0) !== 0) {
      return (b.budget > 0 ? 1 : 0) - (a.budget > 0 ? 1 : 0);
    }
    return b.spent - a.spent;
  });

  const totalSpent = [...spendByCategory.values()].reduce((s, n) => s + n, 0);
  const totalBudget = [...budgetByCategory.values()].reduce((s, n) => s + n, 0);

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-xs uppercase tracking-wide text-ink-muted">
            Month-to-date
          </span>
          <div className="text-lg font-semibold text-ink">
            {formatUsd(totalSpent)}
          </div>
        </div>
        {totalBudget > 0 && (
          <div className="text-right">
            <span className="text-xs uppercase tracking-wide text-ink-muted">
              Of budget
            </span>
            <div className="text-sm text-ink-muted">
              {formatUsd(totalBudget)}
            </div>
          </div>
        )}
      </div>
      <ul className="mt-4 space-y-3">
        {rows.map((r) => {
          const hasBudget = r.budget > 0;
          const pct = hasBudget
            ? Math.min((r.spent / r.budget) * 100, 100)
            : 0;
          const over = hasBudget && r.spent > r.budget;
          return (
            <li key={r.category}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-ink">{titleCase(r.category)}</span>
                <span className={over ? "text-danger" : "text-ink-muted"}>
                  {formatUsd(r.spent)}
                  {hasBudget ? ` / ${formatUsd(r.budget)}` : ""}
                </span>
              </div>
              {hasBudget ? (
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className={`h-full rounded-full ${
                      over ? "bg-danger" : "bg-primary"
                    }`}
                    style={{ width: `${pct.toFixed(1)}%` }}
                  />
                </div>
              ) : (
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted opacity-50">
                  <div
                    className="h-full rounded-full bg-ink-faint"
                    style={{
                      width:
                        totalSpent > 0
                          ? `${Math.min((r.spent / totalSpent) * 100, 100).toFixed(1)}%`
                          : "0%",
                    }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
