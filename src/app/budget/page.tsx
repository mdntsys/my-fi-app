import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SharedHeader from "@/components/SharedHeader";
import BudgetTable from "@/components/BudgetTable";
import {
  activeBudgetsForMonth,
  currentMonth,
  monthBoundsFromKey,
  monthLabel,
  type BudgetRow,
} from "@/lib/budget-month";
import {
  groupOf,
  PFC_DETAILED,
  PLAID_PFC_PRIMARY,
} from "@/lib/plaid-categories";

export const dynamic = "force-dynamic";

type TxRow = {
  amount: number;
  category_detailed: string | null;
};

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const params = await searchParams;
  const month =
    params.month && /^\d{4}-\d{2}-01$/.test(params.month)
      ? params.month
      : currentMonth();
  const { start, end } = monthBoundsFromKey(month);

  // Default household — first one the user belongs to (created order).
  const { data: households } = await supabase
    .from("households")
    .select("id, name")
    .order("created_at", { ascending: true });
  const householdId = households?.[0]?.id ?? null;

  const [budgetsRes, txRes] = await Promise.all([
    supabase
      .from("budgets")
      .select("category_detailed, effective_month, monthly_limit"),
    supabase
      .from("transactions")
      .select("amount, category_detailed")
      .gte("date", start)
      .lt("date", end)
      .eq("pending", false),
  ]);

  const budgetRows = (budgetsRes.data ?? []) as BudgetRow[];
  const txs = (txRes.data ?? []) as TxRow[];
  const activeBudgets = activeBudgetsForMonth(budgetRows, month);

  // Sum spending by category_detailed. Keep the signed amount (Plaid uses
  // positive = outflow, negative = inflow); the display layer handles income
  // vs expense rendering. Note: category_override is a primary-level override
  // from the older single-level model; it doesn't map to a subcategory so we
  // ignore it here. The override still labels the row on /transactions.
  const spendByDetailed = new Map<string, number>();
  for (const t of txs) {
    const amount = Number(t.amount);
    if (Number.isNaN(amount)) continue;
    const detailed = t.category_detailed;
    if (!detailed) continue;
    spendByDetailed.set(detailed, (spendByDetailed.get(detailed) ?? 0) + amount);
  }

  // Build hierarchy: group → primary → [detailed]. Include every detailed
  // category that has either a budget OR spending.
  const tree = PLAID_PFC_PRIMARY.map((primary) => {
    const subs = Object.keys(PFC_DETAILED)
      .filter((d) => PFC_DETAILED[d] === primary)
      .map((d) => ({
        detailed: d,
        budget: activeBudgets.get(d) ?? null,
        spent: spendByDetailed.get(d) ?? 0,
      }))
      .filter((row) => row.budget !== null || row.spent !== 0);
    return { primary, subs };
  }).filter((c) => c.subs.length > 0);

  const groups = (["INCOME", "EXPENSES"] as const).map((g) => {
    const categories = tree.filter((c) => groupOf(c.primary) === g);
    return { group: g, categories };
  });

  return (
    <>
      <SharedHeader />
      <main className="flex flex-1 flex-col px-6 py-10">
        <div className="mx-auto w-full max-w-4xl">
          <div className="flex items-baseline justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">
              {monthLabel(month)}
            </h1>
            <span className="text-xs uppercase tracking-wide text-ink-faint">
              Budget
            </span>
          </div>

          {householdId ? (
            <BudgetTable
              month={month}
              householdId={householdId}
              groups={groups}
            />
          ) : (
            <p className="mt-8 text-sm text-ink-muted">
              Create a household first to start budgeting.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
