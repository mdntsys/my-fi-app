import { createClient } from "@/lib/supabase/server";
import { formatUsd, titleCase } from "@/lib/format";

export default async function AccountsList() {
  const supabase = await createClient();
  const { data: accounts, error } = await supabase
    .from("accounts")
    .select(
      "id, name, official_name, type, subtype, mask, current_balance, iso_currency_code, plaid_items(institution_name)",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    return <p className="text-sm text-danger">Failed to load accounts.</p>;
  }
  if (!accounts || accounts.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No accounts yet. Connect a bank above to populate this list.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
      {accounts.map((a) => {
        const rawInst = a.plaid_items as unknown;
        const instObj = Array.isArray(rawInst) ? rawInst[0] : rawInst;
        const inst =
          (instObj as { institution_name: string | null } | null)
            ?.institution_name ?? "Unknown institution";
        return (
          <li key={a.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-sm font-medium text-ink">
                {a.name}
                {a.mask ? (
                  <span className="ml-2 text-xs text-ink-faint">
                    ••{a.mask}
                  </span>
                ) : null}
              </div>
              <div className="text-xs text-ink-muted">
                {inst} · {titleCase(a.subtype ?? a.type ?? "")}
              </div>
            </div>
            <div className="text-sm font-medium text-ink">
              {formatUsd(a.current_balance)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
