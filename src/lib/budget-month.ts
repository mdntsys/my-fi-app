// Month-scoped budget helpers. Budgets live at (household, category_detailed,
// effective_month) with carry-forward: for any month M, the active row is the
// most recent one with effective_month <= M.

export type Month = string; // YYYY-MM-01

export function currentMonth(now: Date = new Date()): Month {
  return monthOf(now);
}

export function monthOf(d: Date): Month {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function monthBoundsFromKey(month: Month): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

// Build the label from the parsed Y/M to avoid TZ shift. new Date("2026-05-01")
// would parse as UTC midnight and render as "April 2026" in negative-UTC zones.
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
export function monthLabel(month: Month): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function isPastMonth(month: Month, now: Date = new Date()): boolean {
  return month < currentMonth(now);
}

export type BudgetRow = {
  category_detailed: string;
  effective_month: Month;
  monthly_limit: number;
};

// Resolves the active budget for each category in `month` using carry-forward.
// Returns a map of category_detailed → active limit. Categories with no row
// at or before `month` are absent from the map (treated as "unbudgeted").
export function activeBudgetsForMonth(
  rows: BudgetRow[],
  month: Month,
): Map<string, number> {
  const byCategory = new Map<string, BudgetRow>();
  for (const r of rows) {
    if (r.effective_month > month) continue;
    const prev = byCategory.get(r.category_detailed);
    if (!prev || r.effective_month > prev.effective_month) {
      byCategory.set(r.category_detailed, r);
    }
  }
  const out = new Map<string, number>();
  for (const [k, r] of byCategory) out.set(k, Number(r.monthly_limit));
  return out;
}

export type EditScope = "this_month" | "ongoing";
