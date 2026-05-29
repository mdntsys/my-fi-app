"use client";

import { PLAID_PFC_PRIMARY } from "@/lib/plaid-categories";
import { titleCase } from "@/lib/format";
import { setTransactionCategory } from "@/app/transactions/actions";

export default function CategorySelect({
  transactionId,
  current,
  plaidCategory,
}: {
  transactionId: string;
  current: string | null;
  plaidCategory: string | null;
}) {
  const action = setTransactionCategory.bind(null, transactionId);
  const defaultLabel = plaidCategory
    ? `${titleCase(plaidCategory)} (Plaid)`
    : "Uncategorized";
  return (
    <form action={action}>
      <select
        name="category"
        defaultValue={current ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={`rounded-md border bg-surface px-2 py-0.5 text-xs focus:border-primary focus:outline-none ${
          current
            ? "border-primary text-ink"
            : "border-line text-ink-muted"
        }`}
      >
        <option value="">{defaultLabel}</option>
        {PLAID_PFC_PRIMARY.map((c) => (
          <option key={c} value={c}>
            {titleCase(c)}
          </option>
        ))}
      </select>
    </form>
  );
}
