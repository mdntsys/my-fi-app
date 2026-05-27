import { createClient } from "@/lib/supabase/server";
import { BUDGETABLE_PRIMARY } from "@/lib/plaid-categories";
import { formatUsd, titleCase } from "@/lib/format";
import { upsertBudget, deleteBudget } from "@/app/households/budget-actions";

export default async function HouseholdBudgets({
  householdId,
  isOwner,
}: {
  householdId: string;
  isOwner: boolean;
}) {
  const supabase = await createClient();
  const { data: budgets } = await supabase
    .from("budgets")
    .select("category_primary, monthly_limit")
    .eq("household_id", householdId)
    .order("category_primary", { ascending: true });

  const existing = new Map(
    (budgets ?? []).map((b) => [b.category_primary as string, Number(b.monthly_limit)]),
  );
  const remaining = BUDGETABLE_PRIMARY.filter((c) => !existing.has(c));

  const upsertAction = upsertBudget.bind(null, householdId);

  return (
    <div>
      {budgets && budgets.length > 0 ? (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {budgets.map((b) => {
            const deleteAction = async (): Promise<void> => {
              "use server";
              return deleteBudget(householdId, b.category_primary as string);
            };
            return (
              <li
                key={b.category_primary}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <div className="text-sm font-medium text-ink">
                    {titleCase(b.category_primary as string)}
                  </div>
                  <div className="text-xs text-ink-muted">
                    {formatUsd(b.monthly_limit)} / month
                  </div>
                </div>
                {isOwner && (
                  <form action={deleteAction}>
                    <button
                      type="submit"
                      className="text-xs text-danger hover:underline"
                    >
                      Remove
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">
          No budgets set for this household yet.
        </p>
      )}

      {isOwner && remaining.length > 0 && (
        <form
          action={upsertAction}
          className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-4"
        >
          <select
            name="category"
            required
            defaultValue=""
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
          >
            <option value="" disabled>
              Category…
            </option>
            {remaining.map((c) => (
              <option key={c} value={c}>
                {titleCase(c)}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <span className="text-sm text-ink-muted">$</span>
            <input
              name="monthly_limit"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="0.00"
              className="w-28 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
            />
            <span className="text-sm text-ink-muted">/ mo</span>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover"
          >
            Add
          </button>
        </form>
      )}
    </div>
  );
}
