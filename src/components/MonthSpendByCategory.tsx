import { createClient } from "@/lib/supabase/server";
import { formatUsd, monthBounds, titleCase } from "@/lib/format";

export default async function MonthSpendByCategory() {
  const supabase = await createClient();
  const { start, end } = monthBounds();

  const { data, error } = await supabase
    .from("transactions")
    .select("amount, category_primary, category_override")
    .gte("date", start)
    .lt("date", end)
    .eq("pending", false);

  if (error) {
    return <p className="text-sm text-danger">Failed to load spending.</p>;
  }
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No spending recorded for the current month yet.
      </p>
    );
  }

  const totals = new Map<string, number>();
  for (const row of data) {
    const category =
      row.category_override ?? row.category_primary ?? "UNCATEGORIZED";
    const amount = Number(row.amount);
    if (Number.isNaN(amount) || amount <= 0) continue; // only outflows
    totals.set(category, (totals.get(category) ?? 0) + amount);
  }

  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const grandTotal = sorted.reduce((sum, [, n]) => sum + n, 0);
  if (sorted.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No outflows recorded for the current month yet.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wide text-ink-muted">
          Month-to-date
        </span>
        <span className="text-lg font-semibold text-ink">
          {formatUsd(grandTotal)}
        </span>
      </div>
      <ul className="mt-4 space-y-3">
        {sorted.map(([category, total]) => {
          const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
          return (
            <li key={category}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-ink">{titleCase(category)}</span>
                <span className="text-ink-muted">{formatUsd(total)}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${pct.toFixed(1)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
