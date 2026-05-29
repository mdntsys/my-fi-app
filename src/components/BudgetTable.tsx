"use client";

import { useMemo, useState, useTransition } from "react";
import { setBudget, removeBudget } from "@/app/budget/actions";
import { formatUsd } from "@/lib/format";
import {
  detailedFor,
  detailedName,
  PRIMARY_NAME,
  type PfcPrimary,
} from "@/lib/plaid-categories";
import { monthLabel, type EditScope } from "@/lib/budget-month";

// `spent` is the raw signed sum from Plaid (positive = outflow, negative = inflow).
// Display helpers below convert this into "actual" per income/expense semantics.
type Subcategory = {
  detailed: string;
  budget: number | null;
  spent: number;
};

// Convert raw signed spend into the "actual" value rendered against the budget.
// Income: a negative Plaid amount means money received, so flip the sign.
// Expense: only positive amounts count; negative entries (refunds) zero out
// rather than reducing spend so that refunds don't make a category appear
// under-spent.
function actualOf(spent: number, isIncome: boolean): number {
  return isIncome ? Math.max(0, -spent) : Math.max(0, spent);
}

// `budget - actual` for both. Income: positive remaining means you have more
// income to earn before hitting target. Expense: positive remaining means
// budget left. Negative means over (target exceeded for income = good; cap
// exceeded for expense = bad — color handled at render time).
function remainingOf(budget: number, actual: number): number {
  return budget - actual;
}

// Income: green once target is hit (remaining <= 0), neutral while earning.
// Expense: green while under cap, red when over.
function remainingColor(remaining: number, isIncome: boolean): string {
  if (isIncome) return remaining <= 0 ? "text-success" : "text-ink-muted";
  return remaining >= 0 ? "text-success" : "text-danger";
}

type Category = {
  primary: PfcPrimary;
  subs: Subcategory[];
};

type Group = {
  group: "INCOME" | "EXPENSES";
  categories: Category[];
};

type PendingEdit = {
  category: string;
  primary: PfcPrimary;
  detailedLabel: string;
  newLimit: number;
  isRemoval: boolean;
};

export default function BudgetTable({
  month,
  householdId,
  groups,
}: {
  month: string;
  householdId: string;
  groups: Group[];
}) {
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);

  return (
    <div className="mt-8 space-y-8">
      {groups.map((g) => (
        <GroupBlock
          key={g.group}
          group={g}
          onRequestEdit={(p) => setPendingEdit(p)}
        />
      ))}

      {pendingEdit && (
        <ScopeModal
          edit={pendingEdit}
          month={month}
          householdId={householdId}
          onClose={() => setPendingEdit(null)}
        />
      )}
    </div>
  );
}

function GroupBlock({
  group,
  onRequestEdit,
}: {
  group: Group;
  onRequestEdit: (p: PendingEdit) => void;
}) {
  const label = group.group === "INCOME" ? "Income" : "Expenses";
  const isIncome = group.group === "INCOME";

  // Group-level totals across categories.
  const totalBudget = group.categories.reduce(
    (s, c) => s + c.subs.reduce((t, x) => t + (x.budget ?? 0), 0),
    0,
  );
  const totalActual = group.categories.reduce(
    (s, c) => s + c.subs.reduce((t, x) => t + actualOf(x.spent, isIncome), 0),
    0,
  );
  const totalRemaining = remainingOf(totalBudget, totalActual);

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <header className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-line bg-surface-muted px-4 py-2 text-xs uppercase tracking-wide text-ink-muted">
        <span>{label}</span>
        <span className="w-28 text-right">Budget</span>
        <span className="w-24 text-right">Actual</span>
        <span className="w-24 text-right">Remaining</span>
      </header>

      {group.categories.length === 0 ? (
        <p className="px-4 py-4 text-sm text-ink-muted">
          {isIncome
            ? "No income categories yet. Add a budget below."
            : "No expense categories yet. Add a budget below."}
        </p>
      ) : (
        group.categories.map((c) => (
          <CategoryBlock
            key={c.primary}
            category={c}
            isIncome={isIncome}
            onRequestEdit={onRequestEdit}
          />
        ))
      )}

      <footer className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-t border-line bg-surface-muted px-4 py-2 text-sm font-semibold">
        <span>Total {label}</span>
        <span className="w-28 text-right">{formatUsd(totalBudget)}</span>
        <span className="w-24 text-right">{formatUsd(totalActual)}</span>
        <span className={`w-24 text-right ${remainingColor(totalRemaining, isIncome)}`}>
          {formatUsd(totalRemaining)}
        </span>
      </footer>
    </section>
  );
}

function CategoryBlock({
  category,
  isIncome,
  onRequestEdit,
}: {
  category: Category;
  isIncome: boolean;
  onRequestEdit: (p: PendingEdit) => void;
}) {
  const catBudget = category.subs.reduce((t, x) => t + (x.budget ?? 0), 0);
  const catActual = category.subs.reduce(
    (t, x) => t + actualOf(x.spent, isIncome),
    0,
  );
  const catRemaining = remainingOf(catBudget, catActual);

  const inScope = new Set(category.subs.map((s) => s.detailed));
  const allDetailed = useMemo(() => detailedFor(category.primary), [category.primary]);
  const unbudgeted = allDetailed.filter((d) => !inScope.has(d));

  return (
    <div className="border-t border-line first:border-t-0">
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3 text-sm font-semibold">
        <span>{PRIMARY_NAME[category.primary]}</span>
        <span className="w-28 text-right">{formatUsd(catBudget)}</span>
        <span className="w-24 text-right">{formatUsd(catActual)}</span>
        <span className={`w-24 text-right ${remainingColor(catRemaining, isIncome)}`}>
          {formatUsd(catRemaining)}
        </span>
      </div>

      <ul>
        {category.subs.map((s) => (
          <SubcategoryRow
            key={s.detailed}
            sub={s}
            primary={category.primary}
            isIncome={isIncome}
            onRequestEdit={onRequestEdit}
          />
        ))}
      </ul>

      {unbudgeted.length > 0 && (
        <AddSubcategory
          primary={category.primary}
          options={unbudgeted}
          onPick={(d) =>
            onRequestEdit({
              category: d,
              primary: category.primary,
              detailedLabel: detailedName(d),
              newLimit: 0,
              isRemoval: false,
            })
          }
        />
      )}
    </div>
  );
}

function SubcategoryRow({
  sub,
  primary,
  isIncome,
  onRequestEdit,
}: {
  sub: Subcategory;
  primary: PfcPrimary;
  isIncome: boolean;
  onRequestEdit: (p: PendingEdit) => void;
}) {
  const [draft, setDraft] = useState<string>(
    sub.budget !== null ? sub.budget.toFixed(2) : "",
  );

  function commit() {
    const parsed = parseFloat(draft);
    const current = sub.budget ?? null;
    if (Number.isNaN(parsed)) return;
    if (parsed < 0) return;
    if (current !== null && Math.abs(parsed - current) < 0.005) return;
    onRequestEdit({
      category: sub.detailed,
      primary,
      detailedLabel: detailedName(sub.detailed),
      newLimit: parsed,
      isRemoval: false,
    });
  }

  function remove() {
    onRequestEdit({
      category: sub.detailed,
      primary,
      detailedLabel: detailedName(sub.detailed),
      newLimit: 0,
      isRemoval: true,
    });
  }

  const actual = actualOf(sub.spent, isIncome);
  const remaining = sub.budget !== null ? remainingOf(sub.budget, actual) : null;

  return (
    <li className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-2 text-sm hover:bg-surface-muted/50">
      <span className="text-ink">{detailedName(sub.detailed)}</span>

      <div className="flex w-28 items-center justify-end gap-1">
        <span className="text-xs text-ink-faint">$</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="—"
          className="w-20 rounded border border-line bg-surface px-2 py-1 text-right text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary-soft"
        />
      </div>

      <span className="w-24 text-right text-ink">{formatUsd(actual)}</span>

      <span className="w-24 text-right">
        {remaining === null ? (
          <span className="text-ink-faint">—</span>
        ) : (
          <span className={remainingColor(remaining, isIncome)}>
            {formatUsd(remaining)}
          </span>
        )}
        {sub.budget !== null && (
          <button
            type="button"
            onClick={remove}
            className="ml-2 text-[10px] text-ink-faint hover:text-danger"
            title="Remove budget"
          >
            ✕
          </button>
        )}
      </span>
    </li>
  );
}

function AddSubcategory({
  primary,
  options,
  onPick,
}: {
  primary: PfcPrimary;
  options: string[];
  onPick: (d: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-line/60 px-4 py-2">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-ink-muted hover:text-primary"
        >
          + Budget another {PRIMARY_NAME[primary].toLowerCase()} item
        </button>
      ) : (
        <select
          autoFocus
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value;
            setOpen(false);
            if (v) onPick(v);
          }}
          onBlur={() => setOpen(false)}
          className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink focus:border-primary focus:outline-none"
        >
          <option value="" disabled>
            Pick a subcategory…
          </option>
          {options.map((d) => (
            <option key={d} value={d}>
              {detailedName(d)}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function ScopeModal({
  edit,
  month,
  householdId,
  onClose,
}: {
  edit: PendingEdit;
  month: string;
  householdId: string;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function submit(scope: EditScope) {
    const fd = new FormData();
    fd.set("household_id", householdId);
    fd.set("category", edit.category);
    fd.set("month", month);
    fd.set("scope", scope);
    if (!edit.isRemoval) fd.set("monthly_limit", String(edit.newLimit));
    startTransition(async () => {
      if (edit.isRemoval) await removeBudget(fd);
      else await setBudget(fd);
      onClose();
    });
  }

  const label = monthLabel(month);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-lg">
        <h2 className="text-base font-semibold">
          {edit.isRemoval ? "Remove budget" : "Apply this change to…"}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          <span className="font-medium text-ink">{edit.detailedLabel}</span>
          {edit.isRemoval
            ? ""
            : ` will be set to ${formatUsd(edit.newLimit)} / month.`}
        </p>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => submit("this_month")}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-left text-sm hover:border-primary disabled:opacity-50"
          >
            <div className="font-medium text-ink">Just {label}</div>
            <div className="text-xs text-ink-muted">
              Future months keep whatever they had before.
            </div>
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => submit("ongoing")}
            className="w-full rounded-lg border border-primary bg-primary-soft px-3 py-2 text-left text-sm hover:border-primary-hover disabled:opacity-50"
          >
            <div className="font-medium text-ink">
              {label} and all future months
            </div>
            <div className="text-xs text-ink-muted">
              Past months are never changed.
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="mt-4 w-full text-center text-xs text-ink-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
