import type { SupabaseClient } from "@supabase/supabase-js";
import { plaid } from "@/lib/plaid";

export type PlaidItemRow = {
  id: string;
  user_id: string;
  access_token: string;
};

export type SyncResult = {
  item_id: string;
  added: number;
  modified: number;
  removed: number;
};

export async function syncPlaidItem(
  supabase: SupabaseClient,
  item: PlaidItemRow,
): Promise<SyncResult> {
  // 1) Upsert accounts
  const accountsResp = await plaid.accountsGet({ access_token: item.access_token });
  const accountRows = accountsResp.data.accounts.map((a) => ({
    plaid_item_id: item.id,
    user_id: item.user_id,
    plaid_account_id: a.account_id,
    name: a.name,
    official_name: a.official_name,
    type: a.type,
    subtype: a.subtype,
    mask: a.mask,
    current_balance: a.balances.current,
    available_balance: a.balances.available,
    iso_currency_code: a.balances.iso_currency_code ?? "USD",
    updated_at: new Date().toISOString(),
  }));

  const { data: upserted, error: upsertErr } = await supabase
    .from("accounts")
    .upsert(accountRows, { onConflict: "plaid_account_id" })
    .select("id, plaid_account_id");
  if (upsertErr) throw upsertErr;

  const accountUuidByPlaidId = new Map<string, string>(
    (upserted ?? []).map((a: { id: string; plaid_account_id: string }) => [
      a.plaid_account_id,
      a.id,
    ]),
  );

  // 2) Get sync cursor
  const { data: syncState } = await supabase
    .from("plaid_sync_state")
    .select("cursor")
    .eq("item_id", item.id)
    .maybeSingle();
  let cursor: string | null = syncState?.cursor ?? null;

  let added = 0;
  let modified = 0;
  let removed = 0;

  // 3) Loop /transactions/sync until has_more = false
  for (;;) {
    const txResp = await plaid.transactionsSync({
      access_token: item.access_token,
      cursor: cursor ?? undefined,
    });

    if (txResp.data.added.length) {
      const rows = txResp.data.added
        .map((t) => {
          const accountUuid = accountUuidByPlaidId.get(t.account_id);
          if (!accountUuid) return null;
          return {
            account_id: accountUuid,
            user_id: item.user_id,
            plaid_transaction_id: t.transaction_id,
            amount: t.amount,
            iso_currency_code: t.iso_currency_code ?? "USD",
            date: t.date,
            authorized_date: t.authorized_date,
            name: t.name,
            merchant_name: t.merchant_name,
            pending: t.pending,
            payment_channel: t.payment_channel,
            category_primary: t.personal_finance_category?.primary ?? null,
            category_detailed: t.personal_finance_category?.detailed ?? null,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);
      if (rows.length) {
        const { error } = await supabase
          .from("transactions")
          .upsert(rows, { onConflict: "plaid_transaction_id" });
        if (error) throw error;
        added += rows.length;
      }
    }

    if (txResp.data.modified.length) {
      const rows = txResp.data.modified
        .map((t) => {
          const accountUuid = accountUuidByPlaidId.get(t.account_id);
          if (!accountUuid) return null;
          return {
            account_id: accountUuid,
            user_id: item.user_id,
            plaid_transaction_id: t.transaction_id,
            amount: t.amount,
            iso_currency_code: t.iso_currency_code ?? "USD",
            date: t.date,
            authorized_date: t.authorized_date,
            name: t.name,
            merchant_name: t.merchant_name,
            pending: t.pending,
            payment_channel: t.payment_channel,
            category_primary: t.personal_finance_category?.primary ?? null,
            category_detailed: t.personal_finance_category?.detailed ?? null,
            updated_at: new Date().toISOString(),
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);
      if (rows.length) {
        const { error } = await supabase
          .from("transactions")
          .upsert(rows, { onConflict: "plaid_transaction_id" });
        if (error) throw error;
        modified += rows.length;
      }
    }

    if (txResp.data.removed.length) {
      const ids = txResp.data.removed
        .map((r) => r.transaction_id)
        .filter((id): id is string => Boolean(id));
      if (ids.length) {
        const { error } = await supabase
          .from("transactions")
          .delete()
          .in("plaid_transaction_id", ids);
        if (error) throw error;
        removed += ids.length;
      }
    }

    cursor = txResp.data.next_cursor;
    if (!txResp.data.has_more) break;
  }

  await supabase.from("plaid_sync_state").upsert({
    item_id: item.id,
    cursor,
    last_synced_at: new Date().toISOString(),
    last_error: null,
  });

  return { item_id: item.id, added, modified, removed };
}
