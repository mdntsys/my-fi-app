"use client";

import { PLAID_PFC_PRIMARY } from "@/lib/plaid-categories";
import { titleCase } from "@/lib/format";
import { setTransactionCategory } from "@/app/transactions/actions";

export default function CategorySelect({
  transactionId,
  current,
}: {
  transactionId: string;
  current: string | null;
}) {
  const action = setTransactionCategory.bind(null, transactionId);
  return (
    <form action={action}>
      <select
        name="category"
        defaultValue={current ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-line bg-surface px-2 py-0.5 text-xs text-ink focus:border-primary focus:outline-none"
      >
        <option value="">Plaid default</option>
        {PLAID_PFC_PRIMARY.map((c) => (
          <option key={c} value={c}>
            {titleCase(c)}
          </option>
        ))}
      </select>
    </form>
  );
}
